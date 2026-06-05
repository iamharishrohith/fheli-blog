import { NativeModules, Platform } from 'react-native';
import { Point3D } from '../utils/liveness';

export interface FaceDetectionResult {
  faceDetected: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  landmarks?: Point3D[];
  confidence?: number;
}

export interface FheliEmbeddingResult {
  success: boolean;
  encryptedEmbedding?: string; // Base64 ciphertext of CKKS homomorphic vector
  error?: string;
}

export interface FieldIDEngineInterface {
  /**
   * Initializes the FieldID biometrics engine by loading the TFLite models.
   * Runs in native C++ layer.
   */
  initialize(
    detectionModelPath: string,
    meshModelPath: string,
    recognitionModelPath: string
  ): Promise<boolean>;

  /**
   * Performs face detection and extracts landmark coordinates from a camera frame.
   * Runs in <20ms on mobile CPU.
   */
  processFrame(frameUri: string): Promise<FaceDetectionResult>;

  /**
   * Generates a homomorphically encrypted embedding (CKKS ciphertext) from the cropped face image.
   */
  generateEmbedding(
    frameUri: string,
    boundingBox: { x: number; y: number; width: number; height: number }
  ): Promise<FheliEmbeddingResult>;

  /**
   * Direct homomorphic CKKS matching inside native ciphertext space.
   */
  compareCiphertexts(cipherA: string, cipherB: string): Promise<number>;

  /**
   * Deallocates models from RAM when face scanning session is closed.
   */
  release(): Promise<boolean>;
}

const { FheliEngineNative } = NativeModules;

if (!FheliEngineNative) {
  throw new Error(
    'FheliEngineNative: Native binary module is not linked or failed to load. ' +
    `Ensure you have compiled the native C++ shared library and linked the React Native module for ${Platform.OS}.`
  );
}

const parseNativeFaceResult = (result: unknown): FaceDetectionResult => {
  if (typeof result === 'string') {
    return JSON.parse(result) as FaceDetectionResult;
  }
  return result as FaceDetectionResult;
};

export const FieldIDEngine: FieldIDEngineInterface = {
  initialize: (det, mesh, rec) => FheliEngineNative.initialize(det, mesh, rec),
  processFrame: async (uri) => {
    const result = await FheliEngineNative.processFrame(uri);
    return parseNativeFaceResult(result);
  },
  generateEmbedding: async (uri, box) => {
    const encryptedEmbedding = await FheliEngineNative.generateEmbedding(
      uri,
      box.x,
      box.y,
      box.width,
      box.height
    );

    return {
      success: typeof encryptedEmbedding === 'string' && encryptedEmbedding.length > 0,
      encryptedEmbedding: encryptedEmbedding || undefined,
      error: encryptedEmbedding ? undefined : 'Native engine returned an empty encrypted template.',
    };
  },
  compareCiphertexts: (a, b) => FheliEngineNative.compareCiphertexts(a, b),
  release: () => FheliEngineNative.release(),
};

export default FieldIDEngine;
