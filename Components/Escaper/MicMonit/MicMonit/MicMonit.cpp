#include "MicMonit.h"

#include <windows.h>
#include <mmdeviceapi.h>
#include <audiopolicy.h>
#include <audioclient.h>
#include <wrl/client.h>

#include <atomic>
#include <mutex>
#include <string>
#include <vector>

#pragma comment(lib, "Ole32.lib")
#pragma comment(lib, "Uuid.lib")

using Microsoft::WRL::ComPtr;

// ── Global state ─────────────────────────────────────────────────────────────

static MicEventCallback g_callback       = nullptr;
static std::mutex       g_callbackMutex;
static HANDLE           g_monitorThread  = nullptr;
static HANDLE           g_stopEvent      = nullptr;

// Per-session sink registry – used to unregister on shutdown
struct SinkEntry {
	IAudioSessionControl* ctrl;
	IAudioSessionEvents*  sink;
};
static std::vector<SinkEntry>  g_sinks;
static std::mutex              g_sinksMutex;
static std::atomic<int>        g_activeCount{0}; // active capture sessions

// ── Helpers ───────────────────────────────────────────────────────────────────

static std::string WideToUtf8(LPCWSTR w)
{
	if (!w || !w[0]) return {};
	int len = WideCharToMultiByte(CP_UTF8, 0, w, -1, nullptr, 0, nullptr, nullptr);
	if (len <= 1) return {};
	std::string s(static_cast<size_t>(len - 1), '\0');
	WideCharToMultiByte(CP_UTF8, 0, w, -1, s.data(), len, nullptr, nullptr);
	return s;
}

static std::string GetProcessName(DWORD pid)
{
	HANDLE h = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, pid);
	if (!h) return {};
	wchar_t path[MAX_PATH]{};
	DWORD   size = MAX_PATH;
	std::string result;
	if (QueryFullProcessImageNameW(h, 0, path, &size))
	{
		const wchar_t* slash = wcsrchr(path, L'\\');
		result = WideToUtf8(slash ? slash + 1 : path);
	}
	CloseHandle(h);
	return result;
}

static void FireEvent(int type, DWORD pid)
{
	std::lock_guard<std::mutex> lk(g_callbackMutex);
	if (!g_callback) return;
	std::string name = GetProcessName(pid);
	g_callback(type, static_cast<unsigned long>(pid), name.c_str());
}

// ── IAudioSessionEvents sink (one per audio session) ─────────────────────────

class SessionEventSink final : public IAudioSessionEvents
{
	LONG              m_ref;
	DWORD             m_pid;
	std::atomic<bool> m_active{false};
public:
	explicit SessionEventSink(DWORD pid) : m_ref(1), m_pid(pid) {}

	// Called during startup enumeration for already-active sessions.
	// Bumps the global counter without firing a callback.
	void MarkActive()
	{
		bool expected = false;
		if (m_active.compare_exchange_strong(expected, true, std::memory_order_acq_rel))
			g_activeCount.fetch_add(1, std::memory_order_relaxed);
	}

	ULONG STDMETHODCALLTYPE AddRef()  override { return InterlockedIncrement(&m_ref); }
	ULONG STDMETHODCALLTYPE Release() override
	{
		LONG r = InterlockedDecrement(&m_ref);
		if (!r) delete this;
		return r;
	}
	HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override
	{
		if (riid == IID_IUnknown || riid == __uuidof(IAudioSessionEvents))
		{
			*ppv = static_cast<IAudioSessionEvents*>(this);
			AddRef();
			return S_OK;
		}
		*ppv = nullptr;
		return E_NOINTERFACE;
	}

	HRESULT STDMETHODCALLTYPE OnStateChanged(AudioSessionState state) override
	{
		if (state == AudioSessionStateActive)
		{
			bool expected = false;
			if (m_active.compare_exchange_strong(expected, true, std::memory_order_acq_rel))
				if (g_activeCount.fetch_add(1, std::memory_order_acq_rel) == 0)
					FireEvent(MIC_EVENT_ACTIVE, m_pid);
		}
		else if (state == AudioSessionStateInactive || state == AudioSessionStateExpired)
		{
			bool expected = true;
			if (m_active.compare_exchange_strong(expected, false, std::memory_order_acq_rel))
				if (g_activeCount.fetch_sub(1, std::memory_order_acq_rel) == 1)
					FireEvent(MIC_EVENT_INACTIVE, m_pid);
		}
		return S_OK;
	}

	// Unused IAudioSessionEvents methods
	HRESULT STDMETHODCALLTYPE OnDisplayNameChanged(LPCWSTR, LPCGUID)                override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnIconPathChanged(LPCWSTR, LPCGUID)                   override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnSimpleVolumeChanged(float, BOOL, LPCGUID)           override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnChannelVolumeChanged(DWORD, float*, DWORD, LPCGUID) override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnGroupingParamChanged(LPCGUID, LPCGUID)              override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnSessionDisconnected(AudioSessionDisconnectReason)   override { return S_OK; }
};

// ── IAudioSessionNotification sink (device level – notifies on new sessions) ─

// Forward declaration
static void RegisterSinkForSession(IAudioSessionControl* ctrl);

class SessionNotificationSink final : public IAudioSessionNotification
{
	LONG m_ref;
public:
	SessionNotificationSink() : m_ref(1) {}

	ULONG STDMETHODCALLTYPE AddRef()  override { return InterlockedIncrement(&m_ref); }
	ULONG STDMETHODCALLTYPE Release() override
	{
		LONG r = InterlockedDecrement(&m_ref);
		if (!r) delete this;
		return r;
	}
	HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override
	{
		if (riid == IID_IUnknown || riid == __uuidof(IAudioSessionNotification))
		{
			*ppv = static_cast<IAudioSessionNotification*>(this);
			AddRef();
			return S_OK;
		}
		*ppv = nullptr;
		return E_NOINTERFACE;
	}

	HRESULT STDMETHODCALLTYPE OnSessionCreated(IAudioSessionControl* pNew) override
	{
		RegisterSinkForSession(pNew);
		return S_OK;
	}
};

// ── IMMNotificationClient sink (follows default capture device changes) ────────

class DeviceNotificationSink final : public IMMNotificationClient
{
	LONG   m_ref;
	HANDLE m_reinitEvent; // auto-reset; signals MonitorThread to re-bind
public:
	explicit DeviceNotificationSink(HANDLE hReinit) : m_ref(1), m_reinitEvent(hReinit) {}

	ULONG STDMETHODCALLTYPE AddRef()  override { return InterlockedIncrement(&m_ref); }
	ULONG STDMETHODCALLTYPE Release() override
	{
		LONG r = InterlockedDecrement(&m_ref);
		if (!r) delete this;
		return r;
	}
	HRESULT STDMETHODCALLTYPE QueryInterface(REFIID riid, void** ppv) override
	{
		if (riid == IID_IUnknown || riid == __uuidof(IMMNotificationClient))
		{
			*ppv = static_cast<IMMNotificationClient*>(this);
			AddRef();
			return S_OK;
		}
		*ppv = nullptr;
		return E_NOINTERFACE;
	}

	// Called when the user changes the default device in Windows Sound Settings
	HRESULT STDMETHODCALLTYPE OnDefaultDeviceChanged(
		EDataFlow flow, ERole role, LPCWSTR) override
	{
		if (flow == eCapture && role == eConsole)
			SetEvent(m_reinitEvent);
		return S_OK;
	}

	HRESULT STDMETHODCALLTYPE OnDeviceAdded(LPCWSTR)                              override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnDeviceRemoved(LPCWSTR)                            override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnDeviceStateChanged(LPCWSTR, DWORD)                override { return S_OK; }
	HRESULT STDMETHODCALLTYPE OnPropertyValueChanged(LPCWSTR, const PROPERTYKEY)  override { return S_OK; }
};

// ── Session registration helpers ──────────────────────────────────────────────

static void RegisterSinkForSession(IAudioSessionControl* ctrl)
{
	if (!ctrl) return;

	ComPtr<IAudioSessionControl2> ctrl2;
	if (FAILED(ctrl->QueryInterface(__uuidof(IAudioSessionControl2),
									reinterpret_cast<void**>(ctrl2.GetAddressOf()))))
		return;

	DWORD pid = 0;
	if (FAILED(ctrl2->GetProcessId(&pid)) || pid == 0)
		return; // skip system-wide session

	// Snapshot state *before* registering so the initial m_active is consistent
	// with what OnStateChanged will see on the very first transition.
	AudioSessionState initialState = AudioSessionStateInactive;
	ctrl->GetState(&initialState);

	auto* sink = new SessionEventSink(pid);
	if (SUCCEEDED(ctrl->RegisterAudioSessionNotification(sink)))
	{
		if (initialState == AudioSessionStateActive)
			sink->MarkActive(); // count it without firing a callback

		ctrl->AddRef();
		std::lock_guard<std::mutex> lk(g_sinksMutex);
		g_sinks.push_back({ ctrl, sink });
	}
	else
	{
		sink->Release();
	}
}

static void UnregisterAllSinks()
{
	std::lock_guard<std::mutex> lk(g_sinksMutex);
	for (auto& e : g_sinks)
	{
		e.ctrl->UnregisterAudioSessionNotification(e.sink);
		e.sink->Release();
		e.ctrl->Release();
	}
	g_sinks.clear();
	g_activeCount.store(0, std::memory_order_relaxed);
}

// ── Monitor thread ────────────────────────────────────────────────────────────

static DWORD WINAPI MonitorThread(LPVOID)
{
	if (FAILED(CoInitializeEx(nullptr, COINIT_MULTITHREADED)))
		return 1;

	// Auto-reset event: DeviceNotificationSink fires it when the default mic changes
	HANDLE hReinit = CreateEventW(nullptr, FALSE, FALSE, nullptr);
	if (!hReinit) { CoUninitialize(); return 1; }

	ComPtr<IMMDeviceEnumerator> pEnum;
	if (FAILED(CoCreateInstance(__uuidof(MMDeviceEnumerator), nullptr, CLSCTX_ALL,
								__uuidof(IMMDeviceEnumerator),
								reinterpret_cast<void**>(pEnum.GetAddressOf()))))
	{
		CloseHandle(hReinit);
		CoUninitialize();
		return 1;
	}

	// Register for system-wide default-device-change notifications
	auto* devSink = new DeviceNotificationSink(hReinit);
	pEnum->RegisterEndpointNotificationCallback(devSink);

	// Per-device state (rebuilt whenever the default device changes)
	ComPtr<IAudioSessionManager2> pMgr;
	SessionNotificationSink* pNotifSink = nullptr;

	// Binds session monitoring to the current default capture device.
	// Safe to call multiple times: tears down previous state first.
	auto setupDevice = [&]()
	{
		if (pNotifSink)
		{
			if (pMgr) pMgr->UnregisterSessionNotification(pNotifSink);
			pNotifSink->Release();
			pNotifSink = nullptr;
		}
		UnregisterAllSinks();
		pMgr.Reset();

		ComPtr<IMMDevice> pDevice;
		if (FAILED(pEnum->GetDefaultAudioEndpoint(eCapture, eConsole,
												  pDevice.GetAddressOf())))
			return; // no capture device available

		if (FAILED(pDevice->Activate(__uuidof(IAudioSessionManager2), CLSCTX_ALL,
									 nullptr,
									 reinterpret_cast<void**>(pMgr.GetAddressOf()))))
			return;

		pNotifSink = new SessionNotificationSink();
		pMgr->RegisterSessionNotification(pNotifSink);

		// Pick up sessions that are already running on this device
		ComPtr<IAudioSessionEnumerator> pSessEnum;
		if (SUCCEEDED(pMgr->GetSessionEnumerator(pSessEnum.GetAddressOf())))
		{
			int count = 0;
			pSessEnum->GetCount(&count);
			for (int i = 0; i < count; ++i)
			{
				ComPtr<IAudioSessionControl> pCtrl;
				if (SUCCEEDED(pSessEnum->GetSession(i, pCtrl.GetAddressOf())))
					RegisterSinkForSession(pCtrl.Get());
			}
		}
	};

	setupDevice();

	const HANDLE events[] = { g_stopEvent, hReinit };
	for (;;)
	{
		DWORD w = WaitForMultipleObjects(2, events, FALSE, INFINITE);
		if (w == WAIT_OBJECT_0)     break;         // MicMonit_Stop() called
		if (w == WAIT_OBJECT_0 + 1) setupDevice(); // default device changed
	}

	// Final teardown
	if (pNotifSink)
	{
		if (pMgr) pMgr->UnregisterSessionNotification(pNotifSink);
		pNotifSink->Release();
	}
	UnregisterAllSinks();
	pEnum->UnregisterEndpointNotificationCallback(devSink);
	devSink->Release();
	CloseHandle(hReinit);

	CoUninitialize();
	return 0;
}

// ── Exported API ──────────────────────────────────────────────────────────────

extern "C" {

MICMONIT_API int __cdecl MicMonit_Start(MicEventCallback callback)
{
	if (g_monitorThread) return -1; // already running

	{
		std::lock_guard<std::mutex> lk(g_callbackMutex);
		g_callback = callback;
	}

	g_stopEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
	if (!g_stopEvent) return -2;

	g_monitorThread = CreateThread(nullptr, 0, MonitorThread, nullptr, 0, nullptr);
	if (!g_monitorThread)
	{
		CloseHandle(g_stopEvent);
		g_stopEvent = nullptr;
		return -3;
	}

	return 0;
}

MICMONIT_API void __cdecl MicMonit_Stop()
{
	if (!g_monitorThread) return;

	SetEvent(g_stopEvent);
	WaitForSingleObject(g_monitorThread, 5000);

	CloseHandle(g_monitorThread);
	CloseHandle(g_stopEvent);
	g_monitorThread = nullptr;
	g_stopEvent     = nullptr;

	std::lock_guard<std::mutex> lk(g_callbackMutex);
	g_callback = nullptr;
}

} // extern "C"

// ── DllMain ───────────────────────────────────────────────────────────────────

BOOL APIENTRY DllMain(HMODULE, DWORD reason, LPVOID)
{
	if (reason == DLL_PROCESS_DETACH && g_stopEvent)
		SetEvent(g_stopEvent); // signal only; waiting here risks loader-lock deadlock
	return TRUE;
}