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

export interface FaceEmbeddingResult {
  success: boolean;
  embedding?: number[]; // 128-dimensional embedding vector
  error?: string;
}

export interface FaceEngineInterface {
  /**
   * Initializes the face engine by loading the TFLite models.
   * Model files are bundled in the application's native assets.
   * @param detectionModelPath Name of the BlazeFace TFLite model file
   * @param meshModelPath Name of the FaceMesh TFLite model file
   * @param recognitionModelPath Name of the MobileFaceNet TFLite model file
   */
  initialize(
    detectionModelPath: string,
    meshModelPath: string,
    recognitionModelPath: string
  ): Promise<boolean>;

  /**
   * Performs face detection and extracts landmark coordinates from a camera frame.
   * Runs in <20ms on mobile CPU.
   * @param frameUri Path or internal URI of the captured frame image
   */
  processFrame(frameUri: string): Promise<FaceDetectionResult>;

  /**
   * Generates a 128-dimensional embedding vector from the cropped face image.
   * @param frameUri Path or internal URI of the original frame
   * @param boundingBox Bounding box coordinates of the detected face
   */
  generateEmbedding(
    frameUri: string,
    boundingBox: { x: number; y: number; width: number; height: number }
  ): Promise<FaceEmbeddingResult>;

  /**
   * Deallocates models from RAM when face scanning session is closed.
   */
  release(): Promise<boolean>;
}

// Extract the registered native module
const { NativeFaceEngine } = NativeModules;

if (!NativeFaceEngine) {
  throw new Error(
    'NativeFaceEngine: Native binary module is not linked or failed to load. ' +
    `Ensure you have compiled the native shared library and linked the React Native module for ${Platform.OS}.`
  );
}

export const FaceEngine: FaceEngineInterface = NativeFaceEngine;
export default FaceEngine;
