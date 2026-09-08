/**
 * Face Recognition Service
 * Handles face detection, embedding generation, and matching
 */

import * as faceapi from '@vladmandic/face-api';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

class FaceRecognitionService {
    constructor() {
        this.modelsLoaded = false;
        this.modelPath = null;
    }

    /**
     * Load face-api models
     * Must be called before using any face detection/recognition
     */
    async loadModels() {
        if (this.modelsLoaded) {
            console.log('✅ Models already loaded');
            return true;
        }

        try {
            console.log('📦 Loading face-api models...');

            // Load models from CDN (for now)
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            ]);

            this.modelsLoaded = true;
            console.log('✅ Face-api models loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Error loading face-api models:', error);
            return false;
        }
    }

    /**
     * Detect faces in an image
     * @param {string} imageUri - URI of the image
     * @returns {Promise<Array>} Array of detected faces
     */
    async detectFaces(imageUri) {
        try {
            if (!this.modelsLoaded) {
                await this.loadModels();
            }

            // Load image
            const img = await this.loadImage(imageUri);

            // Detect all faces
            const detections = await faceapi
                .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors()
                .withFaceExpressions();

            return detections;
        } catch (error) {
            console.error('Error detecting faces:', error);
            return [];
        }
    }

    /**
     * Generate face embedding (descriptor) from image
     * @param {string} imageUri - URI of the image
     * @returns {Promise<Float32Array|null>} Face descriptor or null
     */
    async generateEmbedding(imageUri) {
        try {
            if (!this.modelsLoaded) {
                await this.loadModels();
            }

            // Load image
            const img = await this.loadImage(imageUri);

            // Detect single face and get descriptor
            const detection = await faceapi
                .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                console.log('❌ No face detected in image');
                return null;
            }

            // Return the 128-dimensional face descriptor
            return detection.descriptor;
        } catch (error) {
            console.error('Error generating embedding:', error);
            return null;
        }
    }

    /**
     * Compare two face embeddings
     * @param {Float32Array|Array} embedding1 - First face embedding
     * @param {Float32Array|Array} embedding2 - Second face embedding
     * @returns {Object} { distance, confidence, isMatch }
     */
    compareEmbeddings(embedding1, embedding2) {
        try {
            // Convert arrays to Float32Array if needed
            const desc1 = embedding1 instanceof Float32Array
                ? embedding1
                : new Float32Array(embedding1);
            const desc2 = embedding2 instanceof Float32Array
                ? embedding2
                : new Float32Array(embedding2);

            // Calculate Euclidean distance
            const distance = faceapi.euclideanDistance(desc1, desc2);

            // Convert distance to confidence percentage
            // Distance ranges from 0 (identical) to ~1.2 (very different)
            // We use 0.6 as threshold (60% confidence)
            const confidence = Math.max(0, Math.min(100, (1 - distance) * 100));

            // Check if faces match (distance < 0.6 = good match)
            const isMatch = distance < 0.6;

            return {
                distance: distance.toFixed(4),
                confidence: confidence.toFixed(2),
                isMatch,
            };
        } catch (error) {
            console.error('Error comparing embeddings:', error);
            return {
                distance: 1.0,
                confidence: 0,
                isMatch: false,
            };
        }
    }

    /**
     * Verify if a face matches the stored embedding
     * @param {string} imageUri - URI of the image to verify
     * @param {Array} storedEmbedding - Stored face embedding
     * @returns {Promise<Object>} Verification result
     */
    async verifyFace(imageUri, storedEmbedding) {
        try {
            // Generate embedding from current image
            const currentEmbedding = await this.generateEmbedding(imageUri);

            if (!currentEmbedding) {
                return {
                    success: false,
                    error: 'No face detected in image',
                    confidence: 0,
                };
            }

            // Compare embeddings
            const comparison = this.compareEmbeddings(currentEmbedding, storedEmbedding);

            return {
                success: comparison.isMatch,
                confidence: parseFloat(comparison.confidence),
                distance: parseFloat(comparison.distance),
                message: comparison.isMatch
                    ? `Face verified with ${comparison.confidence}% confidence`
                    : `Face does not match (${comparison.confidence}% confidence)`,
            };
        } catch (error) {
            console.error('Error verifying face:', error);
            return {
                success: false,
                error: error.message,
                confidence: 0,
            };
        }
    }

    /**
     * Detect blink in face landmarks
     * @param {Object} landmarks - Face landmarks from detection
     * @returns {boolean} True if eyes are closed (blinking)
     */
    detectBlink(landmarks) {
        try {
            const leftEye = landmarks.getLeftEye();
            const rightEye = landmarks.getRightEye();

            // Calculate Eye Aspect Ratio (EAR)
            const leftEAR = this.calculateEAR(leftEye);
            const rightEAR = this.calculateEAR(rightEye);

            const avgEAR = (leftEAR + rightEAR) / 2;

            // EAR < 0.2 indicates closed eyes (blink)
            return avgEAR < 0.2;
        } catch (error) {
            console.error('Error detecting blink:', error);
            return false;
        }
    }

    /**
     * Calculate Eye Aspect Ratio
     * @param {Array} eyePoints - Array of eye landmark points
     * @returns {number} Eye aspect ratio
     */
    calculateEAR(eyePoints) {
        // Vertical eye landmarks
        const v1 = this.distance(eyePoints[1], eyePoints[5]);
        const v2 = this.distance(eyePoints[2], eyePoints[4]);

        // Horizontal eye landmarks
        const h = this.distance(eyePoints[0], eyePoints[3]);

        // Eye Aspect Ratio
        return (v1 + v2) / (2.0 * h);
    }

    /**
     * Calculate distance between two points
     */
    distance(p1, p2) {
        return Math.sqrt(
            Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
        );
    }

    /**
     * Detect smile in face expressions
     * @param {Object} expressions - Face expressions from detection
     * @returns {boolean} True if smiling
     */
    detectSmile(expressions) {
        try {
            // Check if happy expression > 0.7 (70%)
            return expressions.happy > 0.7;
        } catch (error) {
            console.error('Error detecting smile:', error);
            return false;
        }
    }

    /**
     * Load image from URI
     * @param {string} uri - Image URI
     * @returns {Promise<HTMLImageElement>} Image element
     */
    async loadImage(uri) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = uri;
        });
    }

    /**
     * Convert embedding to array for Firestore storage
     * @param {Float32Array} embedding - Face embedding
     * @returns {Array} Array representation
     */
    embeddingToArray(embedding) {
        return Array.from(embedding);
    }

    /**
     * Convert array back to Float32Array
     * @param {Array} array - Array from Firestore
     * @returns {Float32Array} Face embedding
     */
    arrayToEmbedding(array) {
        return new Float32Array(array);
    }
}

// Export singleton instance
export default new FaceRecognitionService();
