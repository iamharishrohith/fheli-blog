#import <Foundation/Foundation.h>

@interface FheliEngineObjectiveC : NSObject

/**
 * Initializes the underlying C++ FheliEngine.
 */
+ (BOOL)initCore:(NSString *)detModel
       meshModel:(NSString *)meshModel
        recModel:(NSString *)recModel;

/**
 * Performs face landmark and depth contour analysis on a frame.
 */
+ (NSString *)processFrame:(NSString *)frameUri;

/**
 * Generates a homomorphically encrypted face vector embedding.
 */
+ (NSString *)generateEmbedding:(NSString *)frameUri
                              x:(double)x
                              y:(double)y
                              w:(double)w
                              h:(double)h;

/**
 * Performs direct homomorphic CKKS matching inside ciphertext space.
 */
+ (double)compareCiphertexts:(NSString *)cipherA
                     cipherB:(NSString *)cipherB;

/**
 * Deallocates neural network models.
 */
+ (BOOL)releaseCore;

@end
