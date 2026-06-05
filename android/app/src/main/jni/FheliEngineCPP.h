#ifndef FHELI_ENGINE_CPP_H
#define FHELI_ENGINE_CPP_H

#include <string>
#include <vector>
#include <memory>

// Define structures matching our JSI/TS representations
struct FaceBoundingBox {
    double x;
    double y;
    double width;
    double height;
};

struct LandmarkPoint {
    double x;
    double y;
    double z;
};

struct DetectionResult {
    bool faceDetected;
    FaceBoundingBox boundingBox;
    std::vector<LandmarkPoint> landmarks;
    double confidence;
};

struct EmbeddingResult {
    bool success;
    std::string encryptedEmbedding; // Base64 representation of OpenFHE CKKS ciphertext
    std::string error;
};

class FheliEngineCPP {
public:
    FheliEngineCPP();
    ~FheliEngineCPP();

    /**
     * Initializes TFLite interpreters and OpenFHE CKKS cryptosystem context.
     * Loads BlazeFace, FaceMesh, and MobileFaceNet models offline.
     */
    bool initialize(
        const std::string& detectionModelPath,
        const std::string& meshModelPath,
        const std::string& recognitionModelPath
    );

    /**
     * Processes an image frame:
     * 1. Decodes the image file from frameUri.
     * 2. Runs BlazeFace detection to obtain bounding box.
     * 3. Runs MediaPipe FaceMesh to extract 468/478 3D landmarks.
     * 4. Evaluates depth-contour Z-variance liveness (> 0.015).
     * 5. Evaluates corneal SPECULAR color-glow chromatic reflection raytracing.
     * 6. Evaluates physiological pupil tremor (nystagmus) over time via FFT.
     * 7. Returns a detailed JSON results string.
     */
    std::string processFrame(const std::string& frameUri);

    /**
     * Generates a 128-dimensional embedding from the cropped face bounding box,
     * encrypts it using OpenFHE CKKS context, and returns the Base64 ciphertext string.
     */
    std::string generateEmbedding(
        const std::string& frameUri,
        double x,
        double y,
        double w,
        double h
    );

    /**
     * Computes the homomorphic dot-product similarity between two CKKS ciphertext strings.
     * Decrypts the final single scalar result to return the matching score.
     */
    double compareCiphertexts(
        const std::string& ciphertextBase64A,
        const std::string& ciphertextBase64B
    );

    /**
     * Releases model interpreters from RAM.
     */
    bool release();

private:
    // TFLite Engine Private Components
    struct TFLiteModelContext;
    std::unique_ptr<TFLiteModelContext> tfliteContext;

    // OpenFHE Crypto Private Context
    struct CryptoContextFHE;
    std::unique_ptr<CryptoContextFHE> cryptoContext;

    // Liveness Detection Math Components
    bool verifyCornealReflection(const std::vector<LandmarkPoint>& landmarks, const std::vector<uint8_t>& imageBytes, int width, int height);
    bool verifyPupilNystagmus(const std::vector<LandmarkPoint>& landmarks);
    bool verifyDepthContour(const std::vector<LandmarkPoint>& landmarks);
    bool verifyMotionParallax(const std::vector<LandmarkPoint>& currentLandmarks, const std::vector<LandmarkPoint>& previousLandmarks);

    // Helpers for frame parsing and image decoding
    bool decodeImageFrame(const std::string& frameUri, std::vector<uint8_t>& outRGBBytes, int& outWidth, int& outHeight);

    // Rolling history for pupil tremoring (nystagmus FFT) and parallax checks
    std::vector<std::vector<LandmarkPoint>> frameLandmarksHistory;
    std::vector<double> pupilHistoryX;
    std::vector<double> pupilHistoryY;
    
    bool isInitialized;
};

#endif // FHELI_ENGINE_CPP_H
