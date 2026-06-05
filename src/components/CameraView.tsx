import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';

interface CameraViewProps {
  isProcessing: boolean;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  frameProcessor?: any; // Native frame processor reference
  children?: React.ReactNode;
}

/**
 * Production CameraView Component.
 * Integrates directly with react-native-vision-camera.
 * Connects the live lens stream directly to native TFLite frame buffers.
 */
export const CameraView: React.FC<CameraViewProps> = ({
  isProcessing,
  boundingBox,
  frameProcessor,
  children,
}) => {
  const [hasPermission, setHasPermission] = useState(false);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'front'); // Always use front camera for authentication

  useEffect(() => {
    const requestPermission = async () => {
      const status = await Camera.requestCameraPermission();
      setHasPermission(status === 'granted');
    };
    requestPermission();
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.fallbackContainer}>
        <Text style={styles.fallbackText}>Camera permission is required for biometric authentication.</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.fallbackContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.fallbackText}>Searching for front camera sensor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
      />

      {/* Real-time Bounding Box Overlay for Face Detection */}
      {boundingBox && (
        <View
          style={[
            styles.boundingBox,
            {
              left: boundingBox.x,
              top: boundingBox.y,
              width: boundingBox.width,
              height: boundingBox.height,
            },
          ]}
        >
          {/* Corner Guides */}
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
      )}

      {/* Model Processing Loader */}
      {isProcessing && (
        <View style={styles.processingIndicator}>
          <ActivityIndicator size="small" color="#3B82F6" />
          <Text style={styles.processingText}>ANALYZING BIOMETRICS ON EDGE...</Text>
        </View>
      )}

      {/* Render LivenessOverlay child component */}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  fallbackContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  fallbackText: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
    marginTop: 16,
    lineHeight: 20,
  },
  boundingBox: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(59, 130, 246, 0.4)',
    backgroundColor: 'rgba(59, 130, 246, 0.03)',
    borderRadius: 8,
  },
  corner: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: '#3B82F6',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 4,
  },
  processingIndicator: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  processingText: {
    color: '#FFFFFF',
    marginLeft: 10,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
});

export default CameraView;
