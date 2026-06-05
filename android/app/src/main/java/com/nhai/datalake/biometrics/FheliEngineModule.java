package com.nhai.datalake.biometrics;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;

public class FheliEngineModule extends ReactContextBaseJavaModule {
    private final ReactApplicationContext reactContext;

    public FheliEngineModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return "FheliEngineNative";
    }

    /**
     * Initializes the TFLite models and FHE ring parameters offline.
     */
    @ReactMethod
    public void initialize(String detModel, String meshModel, String recModel, Promise promise) {
        try {
            // Load native compiled C++ shared library
            System.loadLibrary("fheli_engine");
            boolean success = nativeInit(detModel, meshModel, recModel);
            promise.resolve(success);
        } catch (Throwable e) {
            promise.reject("INIT_ERROR", e.getMessage() != null ? e.getMessage() : e.toString());
        }
    }

    /**
     * Performs face detection, landmark extraction, and corneal reflection analysis.
     */
    @ReactMethod
    public void processFrame(String frameUri, Promise promise) {
        try {
            String resultJson = nativeProcess(frameUri);
            promise.resolve(resultJson);
        } catch (Throwable e) {
            promise.reject("PROCESS_ERROR", e.getMessage() != null ? e.getMessage() : e.toString());
        }
    }

    /**
     * Generates a 128-D vector, encrypts it homomorphically, and returns the CKKS ciphertext.
     */
    @ReactMethod
    public void generateEmbedding(String frameUri, double x, double y, double w, double h, Promise promise) {
        try {
            String ciphertext = nativeGenerateEmbedding(frameUri, x, y, w, h);
            promise.resolve(ciphertext);
        } catch (Throwable e) {
            promise.reject("EMBEDDING_ERROR", e.getMessage() != null ? e.getMessage() : e.toString());
        }
    }

    @ReactMethod
    public void compareCiphertexts(String cipherA, String cipherB, Promise promise) {
        try {
            double score = nativeCompareCiphertexts(cipherA, cipherB);
            promise.resolve(score);
        } catch (Throwable e) {
            promise.reject("COMPARE_ERROR", e.getMessage() != null ? e.getMessage() : e.toString());
        }
    }

    @ReactMethod
    public void release(Promise promise) {
        try {
            boolean success = nativeRelease();
            promise.resolve(success);
        } catch (Throwable e) {
            promise.reject("RELEASE_ERROR", e.getMessage() != null ? e.getMessage() : e.toString());
        }
    }

    // Native JNI C++ Method declarations
    private native boolean nativeInit(String det, String mesh, String rec);
    private native String nativeProcess(String uri);
    private native String nativeGenerateEmbedding(String uri, double x, double y, double w, double h);
    private native double nativeCompareCiphertexts(String a, String b);
    private native boolean nativeRelease();
}
