#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#define _WIN32_WINNT 0x0601
#define WINVER 0x0601

#include <algorithm>
#include <cwctype>
#include <string>
#include <vector>

#include <Windows.h>
#include <Objbase.h>
#include <OleAuto.h>
#include <UIAutomationClient.h>

#pragma comment(lib, "Ole32.lib")
#pragma comment(lib, "OleAut32.lib")
#pragma comment(lib, "Uiautomationcore.lib")

namespace {

thread_local std::string g_processName;
thread_local std::string g_browserUrl;

std::string ToUtf8(const std::wstring& value) {
    if (value.empty()) {
        return {};
    }

    const int size = WideCharToMultiByte(CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), nullptr, 0, nullptr, nullptr);
    if (size <= 0) {
        return {};
    }

    std::string result(static_cast<size_t>(size), '\0');
    WideCharToMultiByte(CP_UTF8, 0, value.c_str(), static_cast<int>(value.size()), &result[0], size, nullptr, nullptr);
    return result;
}

std::wstring ToLowerWide(std::wstring value) {
    std::transform(value.begin(), value.end(), value.begin(), [](wchar_t ch) {
        return static_cast<wchar_t>(towlower(ch));
    });
    return value;
}

bool IsBrowserProcessName(const std::string& processName) {
    return processName == "chrome" || processName == "msedge";
}

std::wstring GetFileStem(const std::wstring& fullPath) {
    const size_t slash = fullPath.find_last_of(L"\\/");
    std::wstring fileName = slash == std::wstring::npos ? fullPath : fullPath.substr(slash + 1);
    const size_t dot = fileName.find_last_of(L'.');
    if (dot != std::wstring::npos) {
        fileName.erase(dot);
    }
    return fileName;
}

std::string GetForegroundProcessNameInternal() {
    const HWND hwnd = GetForegroundWindow();
    if (!hwnd) {
        return {};
    }

    DWORD processId = 0;
    GetWindowThreadProcessId(hwnd, &processId);
    if (processId == 0) {
        return {};
    }

    HANDLE processHandle = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, FALSE, processId);
    if (!processHandle) {
        return {};
    }

    std::vector<wchar_t> fullPath(32768, L'\0');
    DWORD length = static_cast<DWORD>(fullPath.size());
    const BOOL ok = QueryFullProcessImageNameW(processHandle, 0, fullPath.data(), &length);
    CloseHandle(processHandle);

    if (!ok || length == 0) {
        return {};
    }

    return ToUtf8(ToLowerWide(GetFileStem(std::wstring(fullPath.data(), length))));
}

bool HasWhitespace(const std::wstring& value) {
    return value.find_first_of(L" \t\r\n") != std::wstring::npos;
}

std::wstring TrimWide(std::wstring value) {
    const size_t start = value.find_first_not_of(L" \t\r\n");
    if (start == std::wstring::npos) {
        return {};
    }

    const size_t end = value.find_last_not_of(L" \t\r\n");
    return value.substr(start, end - start + 1);
}

bool IsLikelyAddressBarName(const std::wstring& name) {
    const std::wstring lowerName = ToLowerWide(name);
    return lowerName.find(L"address") != std::wstring::npos ||
        lowerName.find(L"search") != std::wstring::npos ||
        lowerName.find(L"omnibox") != std::wstring::npos ||
        lowerName.find(L"地址") != std::wstring::npos ||
        lowerName.find(L"搜索") != std::wstring::npos ||
        lowerName.find(L"网址") != std::wstring::npos;
}

std::wstring GetAutomationElementName(IUIAutomationElement* element) {
    if (!element) {
        return {};
    }

    BSTR text = nullptr;
    if (FAILED(element->get_CurrentName(&text)) || !text) {
        if (text) {
            SysFreeString(text);
        }
        return {};
    }

    std::wstring value(text, SysStringLen(text));
    SysFreeString(text);
    return value;
}

std::wstring GetAutomationElementValue(IUIAutomationElement* element) {
    if (!element) {
        return {};
    }

    IUIAutomationValuePattern* valuePattern = nullptr;
    if (SUCCEEDED(element->GetCurrentPatternAs(UIA_ValuePatternId, __uuidof(IUIAutomationValuePattern), reinterpret_cast<void**>(&valuePattern))) && valuePattern) {
        BSTR value = nullptr;
        const HRESULT hr = valuePattern->get_CurrentValue(&value);
        valuePattern->Release();

        if (SUCCEEDED(hr) && value) {
            std::wstring result(value, SysStringLen(value));
            SysFreeString(value);
            return result;
        }

        if (value) {
            SysFreeString(value);
        }
    }

    IUIAutomationLegacyIAccessiblePattern* legacyPattern = nullptr;
    if (SUCCEEDED(element->GetCurrentPatternAs(UIA_LegacyIAccessiblePatternId, __uuidof(IUIAutomationLegacyIAccessiblePattern), reinterpret_cast<void**>(&legacyPattern))) && legacyPattern) {
        BSTR value = nullptr;
        const HRESULT hr = legacyPattern->get_CurrentValue(&value);
        legacyPattern->Release();

        if (SUCCEEDED(hr) && value) {
            std::wstring result(value, SysStringLen(value));
            SysFreeString(value);
            return result;
        }

        if (value) {
            SysFreeString(value);
        }
    }

    return {};
}

bool IsBrowserUrlCandidate(const std::wstring& name, const std::wstring& value) {
    if (value.empty() || HasWhitespace(value)) {
        return false;
    }

    return IsLikelyAddressBarName(name) || name.empty();
}

std::wstring TryGetBrowserUrlInternal() {
    const std::string processName = GetForegroundProcessNameInternal();
    if (!IsBrowserProcessName(processName)) {
        return {};
    }

    HRESULT hr = CoInitializeEx(nullptr, COINIT_APARTMENTTHREADED);
    const bool shouldUninitialize = SUCCEEDED(hr) || hr == S_FALSE;
    if (FAILED(hr) && hr != RPC_E_CHANGED_MODE) {
        return {};
    }

    const HWND hwnd = GetForegroundWindow();
    if (!hwnd) {
        if (shouldUninitialize) {
            CoUninitialize();
        }
        return {};
    }

    IUIAutomation* automation = nullptr;
    hr = CoCreateInstance(CLSID_CUIAutomation, nullptr, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&automation));
    if (FAILED(hr) || !automation) {
        if (shouldUninitialize) {
            CoUninitialize();
        }
        return {};
    }

    IUIAutomationElement* root = nullptr;
    hr = automation->ElementFromHandle(hwnd, &root);
    if (FAILED(hr) || !root) {
        automation->Release();
        if (shouldUninitialize) {
            CoUninitialize();
        }
        return {};
    }

    VARIANT controlTypeValue;
    VariantInit(&controlTypeValue);
    controlTypeValue.vt = VT_I4;
    controlTypeValue.lVal = UIA_EditControlTypeId;

    IUIAutomationCondition* editCondition = nullptr;
    hr = automation->CreatePropertyCondition(UIA_ControlTypePropertyId, controlTypeValue, &editCondition);
    VariantClear(&controlTypeValue);

    if (FAILED(hr) || !editCondition) {
        root->Release();
        automation->Release();
        if (shouldUninitialize) {
            CoUninitialize();
        }
        return {};
    }

    IUIAutomationElementArray* edits = nullptr;
    hr = root->FindAll(TreeScope_Descendants, editCondition, &edits);
    editCondition->Release();

    if (FAILED(hr) || !edits) {
        root->Release();
        automation->Release();
        if (shouldUninitialize) {
            CoUninitialize();
        }
        return {};
    }

    std::wstring foundUrl;
    int count = 0;
    if (SUCCEEDED(edits->get_Length(&count))) {
        for (int index = 0; index < count; ++index) {
            IUIAutomationElement* edit = nullptr;
            if (FAILED(edits->GetElement(index, &edit)) || !edit) {
                continue;
            }

            const std::wstring name = ToLowerWide(GetAutomationElementName(edit));
            const std::wstring value = TrimWide(GetAutomationElementValue(edit));
            edit->Release();

            if (value.empty() || HasWhitespace(value)) {
                continue;
            }

            if (IsLikelyAddressBarName(name) || name.empty()) {
                foundUrl = value;
                break;
            }
        }
    }

    edits->Release();
    root->Release();
    automation->Release();

    if (shouldUninitialize) {
        CoUninitialize();
    }

    return foundUrl;
}

BOOL CALLBACK MinimizeWindowProc(HWND hwnd, LPARAM) {
    if (!IsWindowVisible(hwnd)) {
        return TRUE;
    }

    if (GetWindow(hwnd, GW_OWNER) != nullptr) {
        return TRUE;
    }

    ShowWindow(hwnd, SW_MINIMIZE);
    return TRUE;
}

} // namespace

extern "C" {

__declspec(dllexport) const char* __cdecl WH_GetForegroundProcessName() {
    g_processName = GetForegroundProcessNameInternal();
    return g_processName.c_str();
}

__declspec(dllexport) const char* __cdecl WH_GetForegroundBrowserUrl() {
    g_browserUrl = ToUtf8(TryGetBrowserUrlInternal());
    return g_browserUrl.c_str();
}

__declspec(dllexport) void __cdecl WH_MinimizeAllWindows() {
    EnumWindows(MinimizeWindowProc, 0);
}

}
