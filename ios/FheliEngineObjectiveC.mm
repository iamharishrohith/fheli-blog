#import "FheliEngineObjectiveC.h"
#include "../android/app/src/main/jni/FheliEngineCPP.h"

static FheliEngineCPP* g_iosFheliEngine = nullptr;

@implementation FheliEngineObjectiveC

+ (BOOL)initCore:(NSString *)detModel
       meshModel:(NSString *)meshModel
        recModel:(NSString *)recModel {
    if (!g_iosFheliEngine) {
        g_iosFheliEngine = new FheliEngineCPP();
    }

    std::string detStr = [detModel UTF8String] ? : "";
    std::string meshStr = [meshModel UTF8String] ? : "";
    std::string recStr = [recModel UTF8String] ? : "";

    return g_iosFheliEngine->initialize(detStr, meshStr, recStr) ? YES : NO;
}

+ (NSString *)processFrame:(NSString *)frameUri {
    if (!g_iosFheliEngine) {
        return @"{\"faceDetected\":false,\"error\":\"iOS FheliEngine not initialized\"}";
    }

    std::string uriStr = [frameUri UTF8String] ? : "";
    std::string jsonResult = g_iosFheliEngine->processFrame(uriStr);

    return [NSString stringWithUTF8String:jsonResult.c_str()];
}

+ (NSString *)generateEmbedding:(NSString *)frameUri
                              x:(double)x
                              y:(double)y
                              w:(double)w
                              h:(double)h {
    if (!g_iosFheliEngine) {
        return nil;
    }

    std::string uriStr = [frameUri UTF8String] ? : "";
    std::string ciphertext = g_iosFheliEngine->generateEmbedding(uriStr, x, y, w, h);

    if (ciphertext.empty()) {
        return nil;
    }

    return [NSString stringWithUTF8String:ciphertext.c_str()];
}

+ (double)compareCiphertexts:(NSString *)cipherA
                     cipherB:(NSString *)cipherB {
    if (!g_iosFheliEngine) {
        return 0.0;
    }

    std::string aStr = [cipherA UTF8String] ? : "";
    std::string bStr = [cipherB UTF8String] ? : "";

    return g_iosFheliEngine->compareCiphertexts(aStr, bStr);
}

+ (BOOL)releaseCore {
    if (g_iosFheliEngine) {
        bool success = g_iosFheliEngine->release();
        delete g_iosFheliEngine;
        g_iosFheliEngine = nullptr;
        return success ? YES : NO;
    }
    return YES;
}

@end
