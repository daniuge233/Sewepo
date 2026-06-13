#pragma once

#ifdef MICMONIT_EXPORTS
#   define MICMONIT_API __declspec(dllexport)
#else
#   define MICMONIT_API __declspec(dllimport)
#endif

#ifdef __cplusplus
extern "C" {
#endif

/* eventType values */
#define MIC_EVENT_ACTIVE   0  /* app started using microphone */
#define MIC_EVENT_INACTIVE 1  /* app stopped using microphone */

/*
 * Callback signature.
 * Called on a COM thread-pool thread -- use koffi.register() threadsafe callback.
 * processName is UTF-8 and valid only for the duration of the call.
 */
typedef void (__cdecl *MicEventCallback)(int eventType,
                                         unsigned long pid,
                                         const char* processName);

/* Start monitoring the default capture device.
 * Returns: 0=ok  -1=already running  -2=event error  -3=thread error */
MICMONIT_API int __cdecl MicMonit_Start(MicEventCallback callback);

/* Stop monitoring and release all resources (waits up to 5 s). */
MICMONIT_API void __cdecl MicMonit_Stop();

#ifdef __cplusplus
}
#endif

