// src/services/faceRecognitionService.js
// Advanced face recognition with embeddings and matching

import { db, storage, auth } from './firebase';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { logger } from '../utils/logger';

/**
 * Face Recognition Service
 * Handles face registration, verification, and matching with embeddings
 */

// Configuration
const FACE_CONFIDENCE_THRESHOLD = 0.6;
const MIN_FACE_QUALITY = 0.7;
const SPOOFING_DETECTION_ENABLED = true;

/**
 * Register face for employee
 * Extracts face embedding and stores securely
 */
export async function registerFace(userId, base64Image, imageMetadata = {}) {
  try {
    logger.info('Registering face for user:', userId);

    if (!base64Image || !userId) {
      throw new Error('User ID and image are required');
    }

    // Validate image quality
    const imageQuality = imageMetadata.quality || 0.8;
    if (imageQuality < MIN_FACE_QUALITY) {
      throw new Error(`Image quality too low: ${imageQuality}. Minimum required: ${MIN_FACE_QUALITY}`);
    }

    // Extract face embedding (simulate with real ML model integration)
    const embedding = await extractFaceEmbedding(base64Image);
    
    if (!embedding) {
      throw new Error('No face detected in image');
    }

    // Validate embedding
    if (embedding.confidence < FACE_CONFIDENCE_THRESHOLD) {
      throw new Error(
        `Face detection confidence too low: ${embedding.confidence}. ` +
        `Required: ${FACE_CONFIDENCE_THRESHOLD}`
      );
    }

    // Detect spoofing attempts
    if (SPOOFING_DETECTION_ENABLED) {
      const spoofScore = await detectSpoofing(base64Image);
      if (spoofScore > 0.5) {
        throw new Error('Possible spoofing detected. Please try again with a real face.');
      }
    }

    // Store face embedding in Firestore
    const faceData = {
      uid: userId,
      embedding: embedding.vector, // Encrypted vector (implement encryption in production)
      embeddingModel: 'facenet_512', // Model used to generate embedding
      confidence: embedding.confidence,
      registeredAt: serverTimestamp(),
      lastVerified: serverTimestamp(),
      verifyCount: 0,
      metadata: {
        imageQuality: imageQuality,
        lighting: imageMetadata.lighting || 'normal',
        angleDeviation: imageMetadata.angleDeviation || 0,
        faceSize: imageMetadata.faceSize || 'normal',
      },
    };

    // Upload original image to Cloud Storage (optional, for re-registration)
    const imageUrl = await uploadFaceImage(userId, base64Image);
    if (imageUrl) {
      faceData.rawImageUrl = imageUrl;
    }

    // Save or update face record
    const existingFace = await getFaceTemplate(userId);
    
    let result;
    if (existingFace) {
      // Update existing
      await updateDoc(doc(db, 'faces', userId), faceData);
      logger.info('Face updated for user:', userId);
      result = { success: true, action: 'updated', faceId: userId };
    } else {
      // Create new
      await updateDoc(doc(db, 'faces', userId), faceData);
      logger.info('Face registered for user:', userId);
      result = { success: true, action: 'created', faceId: userId };
    }

    // Log activity
    logFaceActivity(userId, 'FACE_REGISTERED', faceData);

    return result;
  } catch (err) {
    logger.error('Face registration failed:', err.message);
    throw err;
  }
}

/**
 * Verify user face - used for attendance check-in
 * Matches provided face against stored embedding
 */
export async function verifyFace(userId, base64Image, threshold = FACE_CONFIDENCE_THRESHOLD) {
  try {
    logger.info('Verifying face for user:', userId);

    // Get stored face template
    const storedFace = await getFaceTemplate(userId);
    if (!storedFace) {
      throw new Error('Face not registered for this user');
    }

    // Extract embedding from provided image
    const liveEmbedding = await extractFaceEmbedding(base64Image);
    if (!liveEmbedding) {
      throw new Error('No face detected in image');
    }

    // Calculate similarity
    const similarity = calculateEmbeddingSimilarity(
      storedFace.embedding,
      liveEmbedding.vector
    );

    logger.info('Face similarity score:', similarity);

    // Check if match
    const isMatch = similarity >= threshold;

    if (isMatch) {
      // Update verification count
      await updateDoc(doc(db, 'faces', userId), {
        lastVerified: serverTimestamp(),
        verifyCount: storedFace.verifyCount + 1,
      });

      // Log successful verification
      logFaceActivity(userId, 'FACE_VERIFIED', {
        similarity,
        timestamp: new Date(),
      });
    }

    return {
      success: isMatch,
      match: isMatch,
      similarity: Math.round(similarity * 1000) / 1000,
      confidence: liveEmbedding.confidence,
      verifyCount: storedFace.verifyCount,
      message: isMatch ? 'Face matched successfully' : 'Face did not match',
    };
  } catch (err) {
    logger.error('Face verification failed:', err.message);

    // Log failed verification attempt
    logFaceActivity(userId, 'FACE_VERIFICATION_FAILED', {
      error: err.message,
      timestamp: new Date(),
    });

    throw err;
  }
}

/**
 * Identify user from face image - used for punch-less attendance
 * Matches against all registered faces
 */
export async function identifyFace(base64Image, threshold = FACE_CONFIDENCE_THRESHOLD) {
  try {
    logger.info('Identifying user from face image');

    // Extract embedding
    const liveEmbedding = await extractFaceEmbedding(base64Image);
    if (!liveEmbedding) {
      throw new Error('No face detected in image');
    }

    // Get all registered faces
    const snapshot = await getDocs(collection(db, 'faces'));
    const faces = snapshot.docs.map(doc => ({
      userId: doc.id,
      ...doc.data(),
    }));

    // Calculate similarity with each registered face
    const results = faces
      .map(face => ({
        userId: face.userId,
        similarity: calculateEmbeddingSimilarity(
          face.embedding,
          liveEmbedding.vector
        ),
      }))
      .sort((a, b) => b.similarity - a.similarity);

    if (results.length === 0) {
      throw new Error('No registered faces found');
    }

    const topMatch = results[0];

    if (topMatch.similarity < threshold) {
      throw new Error('No matching face found');
    }

    logger.info('User identified:', topMatch.userId);

    return {
      success: true,
      userId: topMatch.userId,
      similarity: topMatch.similarity,
      topMatches: results.slice(0, 5), // Return top 5 matches
    };
  } catch (err) {
    logger.error('Face identification failed:', err.message);
    throw err;
  }
}

/**
 * Delete face template (GDPR compliance)
 */
export async function deleteFaceTemplate(userId) {
  try {
    logger.info('Deleting face template for user:', userId);

    const faceDoc = doc(db, 'faces', userId);
    
    // Delete from Firestore
    await updateDoc(faceDoc, {
      embedding: null,
      rawImageUrl: null,
      deletedAt: serverTimestamp(),
    });

    // Log deletion for compliance
    logFaceActivity(userId, 'FACE_DELETED', {
      timestamp: new Date(),
      reason: 'User request',
    });

    return { success: true };
  } catch (err) {
    logger.error('Face deletion failed:', err.message);
    throw err;
  }
}

/**
 * Get face template for user
 */
export async function getFaceTemplate(userId) {
  try {
    const q = query(collection(db, 'faces'), where('uid', '==', userId));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const docSnap = snapshot.docs[0];
    return {
      id: docSnap.id,
      ...docSnap.data(),
    };
  } catch (err) {
    logger.error('Error getting face template:', err);
    return null;
  }
}

// ============ ML/AI Functions - Integration Points ============

/**
 * Extract face embedding from image
 * Integration point for real ML models (FaceNet, VGGFace, etc.)
 * 
 * In production, this should call:
 * - Cloud Vision API (Google)
 * - Azure Face API
 * - AWS Rekognition
 * - TensorFlow.js for on-device processing
 * - Custom Python service
 */
async function extractFaceEmbedding(base64Image) {
  try {
    // TODO: Integrate with real face detection service
    // For now, returning mock embedding for testing
    
    const mockEmbedding = {
      vector: generateRandomEmbedding(512), // 512-dim vector like FaceNet
      confidence: 0.95,
      landmarks: {
        leftEye: { x: 100, y: 100 },
        rightEye: { x: 150, y: 100 },
        nose: { x: 125, y: 130 },
        mouth: { x: 125, y: 160 },
      },
    };

    return mockEmbedding;

    /* Real implementation example:
    const response = await callMLService('/extract-embedding', {
      image: base64Image,
      model: 'facenet',
    });
    
    return {
      vector: response.embedding,
      confidence: response.confidence,
      landmarks: response.landmarks,
    };
    */
  } catch (err) {
    logger.error('Error extracting embedding:', err);
    return null;
  }
}

/**
 * Detect spoofing attempts
 * Checks for liveness - real face vs photo/video
 */
async function detectSpoofing(base64Image) {
  try {
    // TODO: Integrate with liveness detection service
    // Options:
    // - Real-time liveness (blink, head movement)
    // - Passive liveness (texture analysis)
    // - Challenge-based (follow light, speak phrases)
    
    // Mock implementation
    const spoofScore = Math.random() * 0.2; // 0-0.2 (low spoof probability)
    
    logger.info('Spoof detection score:', spoofScore);
    return spoofScore;

    /* Real implementation:
    const response = await callMLService('/detect-liveness', {
      image: base64Image,
    });
    return response.spoofProbability;
    */
  } catch (err) {
    logger.error('Error detecting spoofing:', err);
    return 0; // Assume not spoofed on error
  }
}

/**
 * Calculate similarity between two embeddings
 * Uses cosine similarity metric
 */
function calculateEmbeddingSimilarity(embedding1, embedding2) {
  // Cosine similarity: (A · B) / (||A|| * ||B||)
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i];
    normA += embedding1[i] * embedding1[i];
    normB += embedding2[i] * embedding2[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}

/**
 * Generate random 512-dimensional embedding (for testing)
 */
function generateRandomEmbedding(dimensions) {
  const embedding = [];
  for (let i = 0; i < dimensions; i++) {
    embedding.push((Math.random() - 0.5) * 2); // Values between -1 and 1
  }
  
  // Normalize vector
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  return embedding.map(val => val / norm);
}

/**
 * Upload face image to Cloud Storage
 */
async function uploadFaceImage(userId, base64Image) {
  try {
    const imageName = `faces/${userId}/${Date.now()}.jpg`;
    const imageRef = ref(storage, imageName);
    
    // Convert base64 to blob
    const response = await fetch(`data:image/jpeg;base64,${base64Image}`);
    const blob = await response.blob();
    
    await uploadBytes(imageRef, blob);
    const url = await getDownloadURL(imageRef);
    
    logger.info('Face image uploaded:', imageName);
    return url;
  } catch (err) {
    logger.error('Error uploading face image:', err);
    return null;
  }
}

/**
 * Log face-related activities for audit trail
 */
function logFaceActivity(userId, action, data) {
  const logRef = collection(db, 'activity_logs');
  addDoc(logRef, {
    userId,
    action,
    actionType: 'face_recognition',
    targetType: 'face',
    targetId: userId,
    data,
    timestamp: serverTimestamp(),
    status: 'success',
  }).catch(err => logger.error('Error logging activity:', err));
}

export default {
  registerFace,
  verifyFace,
  identifyFace,
  deleteFaceTemplate,
  getFaceTemplate,
  FACE_CONFIDENCE_THRESHOLD,
};
