#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FheliEngineNative, NSObject)

RCT_EXTERN_MODULE_METHOD(initialize:(NSString *)detModel
                         meshModel:(NSString *)meshModel
                         recModel:(NSString *)recModel
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_MODULE_METHOD(processFrame:(NSString *)frameUri
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_MODULE_METHOD(generateEmbedding:(NSString *)frameUri
                         x:(double)x
                         y:(double)y
                         w:(double)w
                         h:(double)h
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_MODULE_METHOD(compareCiphertexts:(NSString *)cipherA
                         cipherB:(NSString *)cipherB
                         resolver:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_MODULE_METHOD(release:(RCTPromiseResolveBlock)resolve
                         rejecter:(RCTPromiseRejectBlock)reject)

@end
