#include <jni.h>
#include <string>
#include <memory>
#include "FheliEngineCPP.h"

// Keep a persistent single instance of the C++ biometric engine
static std::unique_ptr<FheliEngineCPP> g_fheliEngine = nullptr;

/**
 * Helper: Converts a JNI jstring to a standard C++ std::string.
 */
static std::string jstringToString(JNIEnv* env, jstring jStr) {
    if (!jStr) return "";
    const char* utfChars = env->GetStringUTFChars(jStr, nullptr);
    std::string result(utfChars);
    env->ReleaseStringUTFChars(jStr, utfChars);
    return result;
}

extern "C" {

JNIEXPORT jboolean JNICALL
Java_com_nhai_datalake_biometrics_FheliEngineModule_nativeInit(
    JNIEnv* env,
    jobject thiz,
    jstring detModelPath,
    jstring meshModelPath,
    jstring recModelPath
) {
    if (!g_fheliEngine) {
        g_fheliEngine = std::make_unique<FheliEngineCPP>();
    }

    std::string det = jstringToString(env, detModelPath);
    std::string mesh = jstringToString(env, meshModelPath);
    std::string rec = jstringToString(env, recModelPath);

    return g_fheliEngine->initialize(det, mesh, rec) ? JNI_TRUE : JNI_FALSE;
}

JNIEXPORT jstring JNICALL
Java_com_nhai_datalake_biometrics_FheliEngineModule_nativeProcess(
    JNIEnv* env,
    jobject thiz,
    jstring frameUri
) {
    if (!g_fheliEngine) {
        return env->NewStringUTF("{\"faceDetected\":false,\"error\":\"Engine not initialized\"}");
    }

    std::string uri = jstringToString(env, frameUri);
    std::string resultJson = g_fheliEngine->processFrame(uri);

    return env->NewStringUTF(resultJson.c_str());
}

JNIEXPORT jstring JNICALL
Java_com_nhai_datalake_biometrics_FheliEngineModule_nativeGenerateEmbedding(
    JNIEnv* env,
    jobject thiz,
    jstring frameUri,
    jdouble x,
    jdouble y,
    jdouble w,
    jdouble h
) {
    if (!g_fheliEngine) {
        return nullptr;
    }

    std::string uri = jstringToString(env, frameUri);
    std::string ciphertext = g_fheliEngine->generateEmbedding(uri, x, y, w, h);

    if (ciphertext.empty()) {
        return nullptr;
    }

    return env->NewStringUTF(ciphertext.c_str());
}

JNIEXPORT jdouble JNICALL
Java_com_nhai_datalake_biometrics_FheliEngineModule_nativeCompareCiphertexts(
    JNIEnv* env,
    jobject thiz,
    jstring cipherA,
    jstring cipherB
) {
    if (!g_fheliEngine) {
        return 0.0;
    }
    std::string a = jstringToString(env, cipherA);
    std::string b = jstringToString(env, cipherB);
    return g_fheliEngine->compareCiphertexts(a, b);
}

JNIEXPORT jboolean JNICALL
Java_com_nhai_datalake_biometrics_FheliEngineModule_nativeRelease(
    JNIEnv* env,
    jobject thiz
) {
    if (g_fheliEngine) {
        bool success = g_fheliEngine->release();
        g_fheliEngine.reset();
        return success ? JNI_TRUE : JNI_FALSE;
    }
    return JNI_TRUE;
}

} // extern "C"
