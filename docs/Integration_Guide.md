# Fheli: Datalake 3.0 Integration & Setup Guide

This guide details the exact steps to merge the **Fheli** biometric and liveness engine into the existing **Datalake 3.0** React Native codebase.

---

## Step 1: Install Required Dependencies
Run the following commands in the root of the Datalake 3.0 project to install the open-source biometric, database, and network dependencies:

```bash
# 1. Install SQLite database encryption
npm install react-native-sqlcipher-storage

# 2. Install network connectivity listener (for automated sync)
npm install @react-native-community/netinfo

# 3. Install lightweight WebAssembly/JS runtime for zk-SNARK proof verification
npm install snarkjs

# 4. Install native frame processor helper (if not using custom JSI bindings)
npm install react-native-vision-camera
```

*For iOS, link dependencies by running pod install:*
```bash
cd ios && pod install && cd ..
```

---

## Step 2: Bundle optimized TFLite Models in Native Assets
To run inference completely offline, the optimized model files must be placed directly inside the native folders of the application so they are compiled into the final app binary.

### A. Android Asset Location
Place the models in the Android assets folder:
```
datalake-3.0-app/android/app/src/main/assets/
├── blazeface.tflite         (150 KB)
├── facemesh.tflite          (2.5 MB)
└── mobilefacenet.tflite     (5.8 MB)
```

### B. iOS Resource Location
Drag and drop the model files into the Xcode project navigator, placing them in the **Resources** group (ensure "Copy items if needed" and Datalake target checks are enabled):
```
datalake-3.0-app/ios/Resources/
├── blazeface.tflite
├── facemesh.tflite
└── mobilefacenet.tflite
```

---

## Step 3: Register Native JSI C++ Bridges

### A. Android JSI Registry (`FheliEngineModule.java`)
Create the native module file inside:
`android/app/src/main/java/com/nhai/datalake/biometrics/FheliEngineModule.java`

```java
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

    @ReactMethod
    public void initialize(String detModel, String meshModel, String recModel, Promise promise) {
        try {
            // Load native C++ TFLite and OpenFHE libraries via JNI
            System.loadLibrary("fheli_engine");
            boolean success = nativeInit(detModel, meshModel, recModel);
            promise.resolve(success);
        } catch (Exception e) {
            promise.reject("INIT_ERROR", e.getMessage());
        }
    }

    @ReactMethod
    public void processFrame(String frameUri, Promise promise) {
        // Runs native C++ liveness tracking & landmark extraction
        promise.resolve(nativeProcess(frameUri));
    }

    // Native C++ JNI function declarations
    private native boolean nativeInit(String det, String mesh, String rec);
    private native String nativeProcess(String uri);
}
```

### B. iOS Swift Bridging (`FheliEngineBridge.swift`)
Create the Swift implementation class inside:
`ios/FheliEngineBridge.swift`

```swift
import Foundation

@objc(FheliEngineNative)
class FheliEngineNative: NSObject {
  
  @objc
  func initialize(_ detModel: String, meshModel: String, recModel: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    // Call native C++ OpenFHE and TFLite libraries
    let success = FheliEngineCPP.initCore(detModel, meshModel, recModel)
    if (success) {
      resolve(true)
    } else {
      reject("INIT_ERROR", "Failed to load models", nil)
    }
  }

  @objc
  func processFrame(_ frameUri: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let result = FheliEngineCPP.processFrame(frameUri)
    resolve(result)
  }
}
```

Expose Swift to React Native by adding the Obj-C mapping in `ios/FheliEngineBridge.m`:
```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(FheliEngineNative, NSObject)
RCT_EXTERN_METHOD(initialize:(NSString *)detModel meshModel:(NSString *)meshModel recModel:(NSString *)recModel resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(processFrame:(NSString *)frameUri resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
```

---

## Step 4: Inject Core Javascript Hooks

### A. Initialize Engine on App Startup
In Datalake 3.0's entry file `src/App.tsx`, load the engine on boot:

```typescript
import React, { useEffect } from 'react';
import { FaceEngine } from './native/FaceEngine'; // Or FheliEngine JSI Wrapper

export default function App() {
  useEffect(() => {
    const setupBiometrics = async () => {
      // Initializes local TFLite runtimes and loads INT8 models
      await FaceEngine.initialize('blazeface.tflite', 'facemesh.tflite', 'mobilefacenet.tflite');
    };
    setupBiometrics();

    return () => {
      FaceEngine.release(); // Releases RAM buffers when app closes
    };
  }, []);

  return (
    // Rest of Datalake 3.0 UI Root Navigator
  );
}
```

### B. Hook Offline Sync Queue to App Network State
Listen for connection state changes to run automated sync and purge loops:

```typescript
import NetInfo from '@react-native-community/netinfo';
import { SyncQueue } from './database/SyncQueue';

useEffect(() => {
  // Subscribe to Datalake 3.0 network connection changes
  const unsubscribe = NetInfo.addEventListener(state => {
    const isOnline = !!state.isConnected && !!state.isInternetReachable;
    SyncQueue.setNetworkState(isOnline); // Triggers upload and purge automatically if online
  });

  return () => unsubscribe();
}, []);
```

---

## Step 5: Mount Authentication UI inside navigation Flow

Mount our `<CameraView>` and `<LivenessOverlay>` inside Datalake 3.0's check-in component (`src/screens/AttendanceCheckIn.tsx`):

```typescript
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import CameraView from '../components/CameraView';
import LivenessOverlay, { LivenessStep } from '../components/LivenessOverlay';

export const AttendanceCheckInScreen = () => {
  const [currentStep, setCurrentStep] = useState<LivenessStep>('INITIAL');
  const [progress, setProgress] = useState(0);
  const [instruction, setInstruction] = useState('Position face inside the frame.');

  return (
    <View style={styles.container}>
      <CameraView isProcessing={false} boundingBox={null}>
        <LivenessOverlay
          currentStep={currentStep}
          progress={progress}
          instructionText={instruction}
        />
      </CameraView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' }
});
```
