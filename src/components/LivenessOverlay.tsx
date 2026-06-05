import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

export type LivenessStep = 'INITIAL' | 'BLINK' | 'SMILE' | 'TURN_LEFT' | 'TURN_RIGHT' | 'COMPLETED' | 'FAILED';

interface LivenessOverlayProps {
  currentStep: LivenessStep;
  progress: number; // Value from 0.0 to 1.0 representing completeness of current step
  instructionText: string;
}

export const LivenessOverlay: React.FC<LivenessOverlayProps> = ({
  currentStep,
  progress,
  instructionText,
}) => {
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Pulse guide ring during scan
  useEffect(() => {
    if (currentStep !== 'INITIAL' && currentStep !== 'COMPLETED' && currentStep !== 'FAILED') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 1200,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [currentStep]);

  // Smoothly animate the progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [progress]);

  // Colors mapping based on state
  const getRingColor = () => {
    switch (currentStep) {
      case 'COMPLETED': return '#10B981'; // Sleek Emerald Green
      case 'FAILED': return '#EF4444';    // Vibrant Red
      case 'BLINK': return '#3B82F6';     // Vivid Blue
      case 'SMILE': return '#EC4899';     // Hot Pink
      case 'TURN_LEFT':
      case 'TURN_RIGHT': return '#F59E0B'; // Amber Orange
      default: return 'rgba(255, 255, 255, 0.4)';
    }
  };

  const getStepIndicatorLabel = () => {
    switch (currentStep) {
      case 'INITIAL': return 'Position Face';
      case 'BLINK': return 'Step 1/3: Blink';
      case 'SMILE': return 'Step 2/3: Smile';
      case 'TURN_LEFT': return 'Step 3/3: Turn Left';
      case 'TURN_RIGHT': return 'Step 3/3: Turn Right';
      case 'COMPLETED': return 'Verification Succeeded';
      case 'FAILED': return 'Verification Failed';
    }
  };

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Darkened mask with transparent scanning circular aperture */}
      <View style={styles.apertureMask}>
        <Animated.View
          style={[
            styles.scannerRing,
            {
              borderColor: getRingColor(),
              transform: [{ scale: pulseAnim }],
            },
          ]}
        />
      </View>

      {/* Interactive Bottom Control Panel */}
      <View style={styles.instructionsContainer}>
        <View style={styles.glassmorphicCard}>
          <Text style={styles.stepTitle}>{getStepIndicatorLabel()}</Text>
          <Text style={styles.instructionMessage}>{instructionText}</Text>

          {/* Progress Bar (Only show during active scanning steps) */}
          {currentStep !== 'INITIAL' && currentStep !== 'COMPLETED' && currentStep !== 'FAILED' && (
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    backgroundColor: getRingColor(),
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  apertureMask: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10, 15, 28, 0.6)', // Matte Dark Blue Tint
  },
  scannerRing: {
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 4,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  glassmorphicCard: {
    width: '100%',
    backgroundColor: 'rgba(21, 28, 48, 0.85)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 12,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    color: '#94A3B8', // Muted blue-grey
    marginBottom: 6,
    letterSpacing: 1.5,
  },
  instructionMessage: {
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
    height: 48, // Fixed height to prevent layout shifts during instructions update
    lineHeight: 24,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});

export default LivenessOverlay;
