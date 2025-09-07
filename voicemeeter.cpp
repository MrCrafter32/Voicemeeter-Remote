#include <windows.h>
#include <string>
#include <vector>
#include <chrono>
#include <thread>
#include "napi.h"

typedef long(__stdcall* VbLogin)();
typedef long(__stdcall* VbLogout)();
typedef long(__stdcall* VbSetParameterFloat)(char* szParam, float value);
typedef long(__stdcall* VbGetParameterFloat)(char* szParam, float* pValue);
typedef long(__stdcall* VbGetParameterStringA)(char* szParam, char* szValue);
typedef long(__stdcall* VbIsParametersDirty)();
typedef long(__stdcall* VbGetDeviceNumber)(long deviceType);

VbLogin VB_Login;
VbLogout VB_Logout;
VbSetParameterFloat VB_SetParameterFloat;
VbGetParameterFloat VB_GetParameterFloat;
VbGetParameterStringA VB_GetParameterStringA;
VbIsParametersDirty VB_IsParametersDirty;
VbGetDeviceNumber VB_Input_GetDeviceNumber;
VbGetDeviceNumber VB_Output_GetDeviceNumber;

Napi::ThreadSafeFunction tsfn;
std::thread g_monitorThread;
bool g_isMonitoring = false;
HINSTANCE hVMDll = NULL;

void MonitorLoop() {
    auto callback = [](Napi::Env env, Napi::Function jsCallback, std::string* eventType) {
        jsCallback.Call({Napi::String::New(env, *eventType)});
        delete eventType; 
    };

    long lastInputCount = 0;
    long lastOutputCount = 0;

    if(VB_Input_GetDeviceNumber) lastInputCount = VB_Input_GetDeviceNumber(0);
    if(VB_Output_GetDeviceNumber) lastOutputCount = VB_Output_GetDeviceNumber(0);

    while (g_isMonitoring) {
        if (VB_IsParametersDirty && VB_IsParametersDirty() == 1) {
            tsfn.BlockingCall(new std::string("paramChange"), callback);
        }

        if (VB_Input_GetDeviceNumber && VB_Output_GetDeviceNumber) {
            long currentInputCount = VB_Input_GetDeviceNumber(0);
            long currentOutputCount = VB_Output_GetDeviceNumber(0);

            if (currentInputCount != lastInputCount || currentOutputCount != lastOutputCount) {
                lastInputCount = currentInputCount;
                lastOutputCount = currentOutputCount;
                tsfn.BlockingCall(new std::string("deviceChange"), callback);
            }
        }
        std::this_thread::sleep_for(std::chrono::milliseconds(50));
    }
    tsfn.Release();
}

Napi::Value Login(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (hVMDll != NULL) return Napi::Number::New(env, 1);

    const char* dllPath = "C:\\Program Files (x86)\\VB\\Voicemeeter\\VoicemeeterRemote64.dll";
    hVMDll = LoadLibraryA(dllPath);

    if (hVMDll == NULL) {
        Napi::Error::New(env, "Failed to load VoicemeeterRemote64.dll. Check the hardcoded path.").ThrowAsJavaScriptException();
        return env.Null();
    }

    VB_Login = (VbLogin)GetProcAddress(hVMDll, "VBVMR_Login");
    VB_Logout = (VbLogout)GetProcAddress(hVMDll, "VBVMR_Logout");
    VB_SetParameterFloat = (VbSetParameterFloat)GetProcAddress(hVMDll, "VBVMR_SetParameterFloat");
    VB_GetParameterFloat = (VbGetParameterFloat)GetProcAddress(hVMDll, "VBVMR_GetParameterFloat");
    VB_GetParameterStringA = (VbGetParameterStringA)GetProcAddress(hVMDll, "VBVMR_GetParameterStringA");
    VB_IsParametersDirty = (VbIsParametersDirty)GetProcAddress(hVMDll, "VBVMR_IsParametersDirty");
    VB_Input_GetDeviceNumber = (VbGetDeviceNumber)GetProcAddress(hVMDll, "VBVMR_Input_GetDeviceNumber");
    VB_Output_GetDeviceNumber = (VbGetDeviceNumber)GetProcAddress(hVMDll, "VBVMR_Output_GetDeviceNumber");
    
    if (!VB_Login || !VB_Logout || !VB_SetParameterFloat || !VB_GetParameterFloat || !VB_GetParameterStringA || !VB_IsParametersDirty || !VB_Input_GetDeviceNumber || !VB_Output_GetDeviceNumber) {
        FreeLibrary(hVMDll);
        hVMDll = NULL;
        Napi::Error::New(env, "Failed to find required functions in the DLL.").ThrowAsJavaScriptException();
        return env.Null();
    }

    long result = VB_Login();
    return Napi::Number::New(env, result);
}

Napi::Value Logout(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (g_isMonitoring) {
        g_isMonitoring = false;
        if (g_monitorThread.joinable()) {
            g_monitorThread.join(); 
        }
    }
    if (hVMDll) {
        VB_Logout();
        FreeLibrary(hVMDll);
        hVMDll = NULL;
    }
    return env.Undefined();
}

Napi::Value StartMonitoring(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (g_isMonitoring) return env.Undefined();
    if (!info[0].IsFunction()) {
        Napi::TypeError::New(env, "Expected a function as the first argument.").ThrowAsJavaScriptException();
        return env.Null();
    }

    g_isMonitoring = true;
    Napi::Function callback = info[0].As<Napi::Function>();

    tsfn = Napi::ThreadSafeFunction::New(
        env, callback, "VoiceMeeter Monitor", 0, 1,
        [](Napi::Env) { if (g_monitorThread.joinable()) g_monitorThread.join(); }
    );
    g_monitorThread = std::thread(MonitorLoop);
    return env.Undefined();
}

Napi::Value SetParameterFloatWrapper(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!hVMDll) return env.Undefined();
    std::string paramNameStr = info[0].As<Napi::String>().Utf8Value();
    float value = info[1].As<Napi::Number>().FloatValue();
    VB_SetParameterFloat(const_cast<char*>(paramNameStr.c_str()), value);
    return env.Undefined();
}

Napi::Value GetParameterFloatWrapper(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!hVMDll) return Napi::Number::New(env, 0);
    std::string paramNameStr = info[0].As<Napi::String>().Utf8Value();
    float value = 0;
    VB_GetParameterFloat(const_cast<char*>(paramNameStr.c_str()), &value);
    return Napi::Number::New(env, value);
}

Napi::Value GetParameterStringAWrapper(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    if (!hVMDll) return Napi::String::New(env, "");
    std::string paramNameStr = info[0].As<Napi::String>().Utf8Value();
    char value[512];
    VB_GetParameterStringA(const_cast<char*>(paramNameStr.c_str()), value);
    return Napi::String::New(env, value);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("login", Napi::Function::New(env, Login));
    exports.Set("logout", Napi::Function::New(env, Logout));
    exports.Set("startMonitoring", Napi::Function::New(env, StartMonitoring));
    exports.Set("setParam", Napi::Function::New(env, SetParameterFloatWrapper));
    exports.Set("getParamFloat", Napi::Function::New(env, GetParameterFloatWrapper));
    exports.Set("getParamString", Napi::Function::New(env, GetParameterStringAWrapper));
    return exports;
}

NODE_API_MODULE(voicemeeter_addon, Init)

