// src/utils/livenessChecks.js

/**
 * Check for basic liveness by detecting blink or head movement
 * Uses face landmarks detected by expo-face-detector
 */

export function detectBlink(face1, face2, blinkThreshold = 0.5) {
  if (!face1 || !face2 || !face1.leftEyeOpenProbability || !face2.leftEyeOpenProbability) {
    return false;
  }

  const eyeOpenChange = Math.abs(face1.leftEyeOpenProbability - face2.leftEyeOpenProbability);
  return eyeOpenChange > blinkThreshold;
}

export function detectHeadMovement(face1, face2, movementThreshold = 10) {
  if (!face1 || !face2 || !face1.bounds || !face2.bounds) {
    return false;
  }

  const xMove = Math.abs(face1.bounds.origin.x - face2.bounds.origin.x);
  const yMove = Math.abs(face1.bounds.origin.y - face2.bounds.origin.y);
  const sizeChange = Math.abs(face1.bounds.size.width - face2.bounds.size.width);

  return xMove > movementThreshold || yMove > movementThreshold || sizeChange > movementThreshold;
}

export function isStableFace(currentFace, previousFace, stabilityThreshold = 5) {
  if (!currentFace || !previousFace) {
    return true; // First detection, assume stable
  }

  const xMove = Math.abs(currentFace.bounds.origin.x - previousFace.bounds.origin.x);
  const yMove = Math.abs(currentFace.bounds.origin.y - previousFace.bounds.origin.y);

  return xMove < stabilityThreshold && yMove < stabilityThreshold;
}
