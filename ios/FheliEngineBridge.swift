import Foundation

@objc(FheliEngineNative)
class FheliEngineNative: NSObject {
  
  private var isInitialized = false

  @objc
  func initialize(_ detModel: String, meshModel: String, recModel: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Invoke underlying C++ FheliEngine core
    let success = FheliEngineObjectiveC.initCore(detModel, meshModel: meshModel, recModel: recModel)
    if success {
      self.isInitialized = true
      resolve(true)
    } else {
      reject("INIT_ERROR", "Failed to load TFLite models in iOS resource path", nil)
    }
  }

  @objc
  func processFrame(_ frameUri: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard isInitialized else {
      reject("NOT_INIT", "FheliEngine is not initialized", nil)
      return
    }
    
    // Process frame liveness check
    let jsonResult = FheliEngineObjectiveC.processFrame(frameUri)
    resolve(jsonResult)
  }

  @objc
  func generateEmbedding(_ frameUri: String, x: Double, y: Double, w: Double, h: Double, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard isInitialized else {
      reject("NOT_INIT", "FheliEngine is not initialized", nil)
      return
    }
    
    // Generate homomorphic ciphertext vector
    let ciphertext = FheliEngineObjectiveC.generateEmbedding(frameUri, x: x, y: y, w: w, h: h)
    if let result = ciphertext {
      resolve(result)
    } else {
      reject("EMBEDDING_ERROR", "Failed to extract encrypted face vector", nil)
    }
  }

  @objc
  func compareCiphertexts(_ cipherA: String, cipherB: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard isInitialized else {
      reject("NOT_INIT", "FheliEngine is not initialized", nil)
      return
    }

    // Compare encrypted embeddings homomorphically
    let score = FheliEngineObjectiveC.compareCiphertexts(cipherA, cipherB: cipherB)
    resolve(score)
  }

  @objc
  func release(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let success = FheliEngineObjectiveC.releaseCore()
    self.isInitialized = false
    resolve(success)
  }
}
