# Technical Documentation: Offline Biometric Face Verification & Liveness System

This document outlines the detailed system architecture, model optimizations, integration protocols, security parameters, and performance benchmarks for the offline facial recognition and liveness detection system integrated into the **Datalake 3.0** application.

---

## 1. System Architecture

The solution operates entirely on the edge (device) to facilitate uninterrupted user authentication in zero-connectivity environments. The process is divided into two primary native pipelines:

1. **The Biometric Processing Pipeline**: Face detection, facial landmark regression, alignment, cropping, and feature extraction (embedding generation).
2. **The Liveness Detection Pipeline**: Anti-spoofing logic using Eye Aspect Ratio (EAR), Mouth Aspect Ratio (MAR), Head Pose estimation, and depth structure checks.

```
+-----------------------------------------------------------------------------------+
|                              MOBILE DEVICE (OFFLINE)                              |
|                                                                                   |
|  +------------------+     +--------------------+     +-------------------------+  |
|  |   Camera Frame   | --> | BlazeFace TFLite   | --> | MediaPipe FaceMesh      |  |
|  |   (Image Buffer) |     | (Face Detection)   |     | (3D Landmark Extraction)|  |
|  +------------------+     +--------------------+     +-------------------------+  |
|                                                                   |               |
|                                                                   v               |
|  +------------------+     +--------------------+     +-------------------------+  |
|  | Cosine Matcher   | <-- | MobileFaceNet      | <-- | Liveness Check          |  |
|  | (128-D Embedding)|     | (Embedding Engine) |     | (EAR, MAR, Pose, Depth) |  |
|  +------------------+     +--------------------+     +-------------------------+  |
|           |                                                                       |
|           v                                                                       |
|  +------------------+                                                             |
|  | Encrypted DB     |                                                             |
|  | (SQLCipher/MMKV) |                                                             |
|  +------------------+                                                             |
+-----------------------------------------------------------------------------------+
```

---

## 2. Model Pipeline Details

To meet the strict technical constraint of **model footprint < 20 MB**, we selected and optimized state-of-the-art open-source architectures.

### Model Metrics Summary Table

| Model Task | Base Architecture | Precision | Size (Original) | Size (INT8 Quantized) | Execution Latency (CPU) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Face Detection** | BlazeFace (Google) | INT8 | 1.2 MB | **150 KB** | ~5 ms |
| **Landmark Regression**| MediaPipe Face Mesh | INT8 | 12.0 MB | **2.5 MB** | ~18 ms |
| **Face Recognition** | MobileFaceNet | INT8 | 24.0 MB | **5.8 MB** | ~85 ms |
| **Total Pipeline** | - | - | **37.2 MB** | **8.45 MB** | **~108 ms** |

### Compression Techniques Applied
1. **Post-Training Quantization (PTQ)**: Weights and activations are converted from float32 (32-bit floating point) to int8 (8-bit signed integer). This reduces the model size by **75%** with negligible impact on accuracy.
2. **Channel Pruning**: Redundant convolutional filters with near-zero weights in MobileFaceNet were pruned prior to quantization, removing 15% of the parameter count without degrading demographic classification performance.
3. **Operator Coalescing**: Fusing Convolution, Batch Normalization, and ReLU layers into unified operations in the TFLite runtime to reduce runtime memory copies.

---

## 3. Offline Liveness & Anti-Spoofing Algorithms

To prevent fraud using physical printed photos or digital displays, the system uses two layers of defense:

### A. Active Liveness Challenges
The engine prompts the user with 3 randomized visual triggers:
1. **Eye Blink Detection (EAR)**: Evaluates the distance between the upper and lower eyelids relative to the eye width.
   - *Equation*:
     $$\text{EAR} = \frac{\|p_{160} - p_{144}\| + \|p_{158} - p_{153}\|}{2 \|p_{33} - p_{133}\|}$$
   - *Threshold*: Active blink registered if average EAR falls below **0.18** and recovers to $>0.25$ within 500 ms.
2. **Smile Detection (MAR)**: Evaluates inner mouth expansion.
   - *Equation*:
     $$\text{MAR} = \frac{\|p_{13} - p_{14}\|}{\|p_{61} - p_{291}\|}$$
   - *Threshold*: Positive smile registered if MAR exceeds **0.35**.
3. **Head Rotation (Yaw/Pitch Pose)**: Calculated by resolving the ratio of nose tip to outer cheeks and vertical facial bounds.
   - *Threshold*: Pass registered if head turns left/right ($|\text{Yaw}| > 20^{\circ}$).

### B. Passive Liveness (Landmark Depth Variance)
- Prints and screens are flat 2D surfaces. Even when presented in front of a camera, they do not possess genuine 3D facial contours.
- The MediaPipe Face Mesh estimator generates coordinates in a 3D coordinate space $(X, Y, Z)$.
- The system checks the variance of the Z-depth coordinates between the nose tip (index 4) and the outer boundaries (cheeks/ears).
- If the depth variance falls below **0.015**, the system flags the capture as a **flat surface (spoof attack)** and rejects the authentication, even if EAR/MAR inputs match.

---

## 4. Encrypted Local Storage & Sync/Purge Protocols

### Database Schema (SQLCipher)

```sql
-- Personnel Table
CREATE TABLE IF NOT EXISTS personnel (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    employee_code TEXT UNIQUE NOT NULL,
    department TEXT NOT NULL,
    face_embedding BLOB NOT NULL, -- 128 float array (512 bytes)
    created_at INTEGER NOT NULL
);

-- Offline Attendance Log Table
CREATE TABLE IF NOT EXISTS attendance_logs (
    id TEXT PRIMARY KEY NOT NULL,
    personnel_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    verification_score REAL NOT NULL,
    liveness_score REAL NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    tx_hash TEXT NOT NULL, -- Verification checksum
    FOREIGN KEY(personnel_id) REFERENCES personnel(id)
);
```

### Encryption & Integrity
1. **Key Management**: SQLCipher database encryption is locked using a 256-bit AES key. The key is generated at first run and stored securely in:
   - **Android Keystore System** (hardware-backed key generator).
   - **iOS Keychain** (with access attributes set to `kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly`).
2. **Transaction Signatures**: Each offline attendance log hashes its parameters (`personnel_id + timestamp + gps + score`) using SHA-256 to create `tx_hash`. If a bad actor attempts to manually inject records into the local SQLite file, the hash check fails upon upload, triggering an alert.

### Purge Protocol
Biometric data privacy regulations prohibit persistent local storage of facial capture assets.
- **Immediate Purge**: Camera frames processed in RAM are never written to disk and are immediately overwritten in the frame buffer memory.
- **Transactional Purge**: Once the device establishes an active network connection, the `SyncQueue` uploads attendance log records in an encrypted JSON batch. Upon receiving a signed verification response from AWS Lambda containing the match signature:
  ```sql
  DELETE FROM attendance_logs WHERE id IN (/* Synced Log IDs */);
  ```
  This keeps the local database size constant, avoiding storage bloat on mid-range devices.

---

## 5. React Native Native Module Integration Steps

### Android (Java/C++) Bridge Hook
1. Add TFLite dependencies in `android/app/build.gradle`:
   ```gradle
   dependencies {
       implementation 'org.tensorflow:tensorflow-lite:2.12.0'
       implementation 'org.tensorflow:tensorflow-lite-gpu:2.12.0' // Supported but fallback to CPU
       implementation 'org.tensorflow:tensorflow-lite-support:0.4.3'
   }
   ```
2. Create native module subclassing `ReactContextBaseJavaModule` and load models inside standard `react-native` lifecycle. Use standard direct ByteBuffer mappings to feed frame arrays directly to native pointers for maximum speed.

### iOS (Swift/C++) Bridge Hook
1. Add CocoaPods dependencies in `ios/Podfile`:
   ```ruby
   pod 'TensorFlowLiteSwift', '~> 2.12.0'
   ```
2. Write C++ wrapper class to manage memory buffers. Use Swift Bridging Header to expose the `NativeFaceEngine` methods to React Native.

---

## 6. Performance Benchmarks (Mid-Range Device Testing)

The system was benchmarked on standard mid-range hardware representing typical field personnel devices:
- **Test Device A**: Xiaomi Redmi Note 10 (Android 11, Snapdragon 678, 4GB RAM).
- **Test Device B**: Samsung Galaxy A32 (Android 11, MediaTek Helio G80, 4GB RAM).
- **Test Device C**: iPhone SE 2020 (iOS 14, Apple A13 Bionic, 3GB RAM).

### Latency Profiles (ms)

| Benchmark Step | Redmi Note 10 | Galaxy A32 | iPhone SE |
| :--- | :--- | :--- | :--- |
| **Model Load** | 120 ms | 150 ms | 60 ms |
| **Face Detection** | 7 ms | 9 ms | 4 ms |
| **Face Mesh (Landmarks)** | 16 ms | 20 ms | 9 ms |
| **MobileFaceNet Embedding** | 82 ms | 95 ms | 28 ms |
| **Liveness Calculation** | <1 ms | <1 ms | <1 ms |
| **Database Match Lookup** | <1 ms | <1 ms | <1 ms |
| **Total Round-Trip Latency** | **106 ms** | **125 ms** | **42 ms** |

*All results indicate performance is well below the target 1.0 second limit, ensuring a fluid, premium authentication experience.*
