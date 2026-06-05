/**
 * NHAI FieldID - Liveness Detection Mathematics
 * Implements real coordinate calculations for EAR (blink), MAR (smile),
 * Head Pose (Yaw, Pitch, Roll), and Z-Depth variance (anti-spoof).
 */

export interface Point3D {
  x: number;
  y: number;
  z?: number;
}

export type LandmarkMode = 'FACE_468' | 'FACE_478';

// Landmark Indexes based on standard MediaPipe Face Mesh
const LEFT_EYE = {
  leftCorner: 33,
  rightCorner: 133,
  upper1: 160,
  upper2: 158,
  lower1: 144,
  lower2: 153,
};

const RIGHT_EYE = {
  leftCorner: 362,
  rightCorner: 263,
  upper1: 385,
  upper2: 387,
  lower1: 373,
  lower2: 380,
};

const MOUTH = {
  leftCorner: 61,
  rightCorner: 291,
  innerUpper: 13,
  innerLower: 14,
};

const POSE = {
  noseTip: 4,
  chin: 152,
  forehead: 10,
  leftCheek: 234,
  rightCheek: 454,
};

/**
 * Calculates the Euclidean distance between two 3D points.
 */
function getDistance(p1: Point3D, p2: Point3D): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = (p1.z ?? 0) - (p2.z ?? 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculates the Eye Aspect Ratio (EAR) for a single eye.
 * Formula: (dist(upper1, lower1) + dist(upper2, lower2)) / (2 * dist(left, right))
 */
export function calculateEyeEAR(landmarks: Point3D[], eyeIndices: typeof LEFT_EYE): number {
  const p_left = landmarks[eyeIndices.leftCorner];
  const p_right = landmarks[eyeIndices.rightCorner];
  const p_upper1 = landmarks[eyeIndices.upper1];
  const p_upper2 = landmarks[eyeIndices.upper2];
  const p_lower1 = landmarks[eyeIndices.lower1];
  const p_lower2 = landmarks[eyeIndices.lower2];

  if (!p_left || !p_right || !p_upper1 || !p_upper2 || !p_lower1 || !p_lower2) {
    return 0.0;
  }

  const vertical1 = getDistance(p_upper1, p_lower1);
  const vertical2 = getDistance(p_upper2, p_lower2);
  const horizontal = getDistance(p_left, p_right);

  if (horizontal === 0) {return 0.0;}
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Calculates the combined average Eye Aspect Ratio for both eyes.
 */
export function getAverageEAR(landmarks: Point3D[]): number {
  const leftEAR = calculateEyeEAR(landmarks, LEFT_EYE);
  const rightEAR = calculateEyeEAR(landmarks, RIGHT_EYE);
  return (leftEAR + rightEAR) / 2.0;
}

/**
 * Calculates the Mouth Aspect Ratio (MAR) to detect smile or mouth stretch.
 * Formula: dist(inner_upper, inner_lower) / dist(left_corner, right_corner)
 */
export function calculateMAR(landmarks: Point3D[]): number {
  const p_left = landmarks[MOUTH.leftCorner];
  const p_right = landmarks[MOUTH.rightCorner];
  const p_upper = landmarks[MOUTH.innerUpper];
  const p_lower = landmarks[MOUTH.innerLower];

  if (!p_left || !p_right || !p_upper || !p_lower) {
    return 0.0;
  }

  const vertical = getDistance(p_upper, p_lower);
  const horizontal = getDistance(p_left, p_right);

  if (horizontal === 0) {return 0.0;}
  return vertical / horizontal;
}

/**
 * Estimates the orientation of the head (Yaw, Pitch, Roll) using 2D coordinate ratios.
 */
export function estimateHeadPose(landmarks: Point3D[]): { yaw: number; pitch: number; roll: number } {
  const nose = landmarks[POSE.noseTip];
  const chin = landmarks[POSE.chin];
  const forehead = landmarks[POSE.forehead];
  const leftCheek = landmarks[POSE.leftCheek];
  const rightCheek = landmarks[POSE.rightCheek];
  const leftEye = landmarks[LEFT_EYE.leftCorner];
  const rightEye = landmarks[RIGHT_EYE.rightCorner];

  if (!nose || !chin || !forehead || !leftCheek || !rightCheek || !leftEye || !rightEye) {
    return { yaw: 0, pitch: 0, roll: 0 };
  }

  // 1. Yaw estimation: horizontal distance ratio from nose tip to cheeks
  const distLeft = getDistance(nose, leftCheek);
  const distRight = getDistance(nose, rightCheek);
  const totalCheekWidth = distLeft + distRight;

  let yaw = 0;
  if (totalCheekWidth > 0) {
    yaw = (distLeft / totalCheekWidth - 0.5) * 180;
  }

  // 2. Pitch estimation: vertical distance ratio from nose to forehead vs chin
  const distForehead = getDistance(nose, forehead);
  const distChin = getDistance(nose, chin);
  const totalVerticalSpan = distForehead + distChin;

  let pitch = 0;
  if (totalVerticalSpan > 0) {
    const ratio = distForehead / totalVerticalSpan;
    pitch = (ratio - 0.45) * 180;
  }

  // 3. Roll estimation: eye line angle
  const dy = rightEye.y - leftEye.y;
  const dx = rightEye.x - leftEye.x;
  const roll = Math.atan2(dy, dx) * (180 / Math.PI);

  return {
    yaw: Math.round(yaw * 1.5),
    pitch: Math.round(pitch * 1.5),
    roll: Math.round(roll),
  };
}

/**
 * Checks for depth contour variance across Z-coordinates.
 * If Z-variance is below 0.015, the target is flagged as a flat 2D plane (photo/screen spoof).
 */
export function checkDepthLiveness(landmarks: Point3D[]): boolean {
  const nose = landmarks[POSE.noseTip];
  const leftCheek = landmarks[POSE.leftCheek];
  const rightCheek = landmarks[POSE.rightCheek];
  const chin = landmarks[POSE.chin];

  if (!nose || !leftCheek || !rightCheek || !chin) {
    return false;
  }

  const zNose = nose.z ?? 0.0;
  const zLeft = leftCheek.z ?? 0.0;
  const zRight = rightCheek.z ?? 0.0;
  const zChin = chin.z ?? 0.0;

  const diffLeft = Math.abs(zNose - zLeft);
  const diffRight = Math.abs(zNose - zRight);
  const diffChin = Math.abs(zNose - zChin);

  const avgDepthDifference = (diffLeft + diffRight + diffChin) / 3.0;
  const FLAT_FACE_THRESHOLD = 0.015;

  return avgDepthDifference >= FLAT_FACE_THRESHOLD;
}

/**
 * Tracks optical flow consistency between nose tip and facial boundaries
 * across consecutive frames to confirm genuine 3D parallax.
 */
export function checkMotionParallax(
  currentMesh: Point3D[],
  previousMesh: Point3D[]
): boolean {
  const cNose = currentMesh[POSE.noseTip];
  const cLeft = currentMesh[POSE.leftCheek];
  const cRight = currentMesh[POSE.rightCheek];

  const pNose = previousMesh[POSE.noseTip];
  const pLeft = previousMesh[POSE.leftCheek];
  const pRight = previousMesh[POSE.rightCheek];

  if (!cNose || !cLeft || !cRight || !pNose || !pLeft || !pRight) {
    return false;
  }

  // Calculate motion vectors
  const noseMotion = { x: cNose.x - pNose.x, y: cNose.y - pNose.y };
  const cheekMotionLeft = { x: cLeft.x - pLeft.x, y: cLeft.y - pLeft.y };
  const cheekMotionRight = { x: cRight.x - pRight.x, y: cRight.y - pRight.y };

  // Calculate magnitude differences
  const magNose = Math.sqrt(noseMotion.x * noseMotion.x + noseMotion.y * noseMotion.y);
  const magCheekL = Math.sqrt(cheekMotionLeft.x * cheekMotionLeft.x + cheekMotionLeft.y * cheekMotionLeft.y);
  const magCheekR = Math.sqrt(cheekMotionRight.x * cheekMotionRight.x + cheekMotionRight.y * cheekMotionRight.y);

  // If there is motion, verify that outer cheeks and nose tip do not move at the exact same rate.
  // In a flat photo, all points move in rigid unison (motion variance near zero).
  const avgCheekMotion = (magCheekL + magCheekR) / 2.0;
  const motionVariance = Math.abs(magNose - avgCheekMotion);

  // Threshold calibrated for hand tremor shifts
  const FLAT_PLANE_MOTION_THRESHOLD = 0.0005;

  if (magNose > 0.002) { // Only evaluate if significant motion exists
    return motionVariance > FLAT_PLANE_MOTION_THRESHOLD;
  }
  return true;
}
