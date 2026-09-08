// Face detector is a native module. We check if it exists to avoid crashing in Expo Go.
let FaceDetector = null;
try {
    FaceDetector = require('expo-face-detector');
} catch (e) {
    console.warn('FaceDetector native module not found. Falling back to manual capture mode.');
}

/**
 * Face detector configuration
 */
export const faceDetectorSettings = FaceDetector ? {
    mode: FaceDetector.FaceDetectorMode.accurate,
    detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
    runClassifications: FaceDetector.FaceDetectorClassifications.all,
    minDetectionInterval: 100,
    tracking: true,
} : {};

export const isNativeDetectorAvailable = () => !!FaceDetector;

/**
 * Detect faces in an image
 * @param {string} imageUri - URI of the image
 * @returns {Promise<Object>} - Detection result
 */
export const detectFaces = async (imageUri) => {
    try {
        const options = {
            mode: FaceDetector.FaceDetectorMode.accurate,
            detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
            runClassifications: FaceDetector.FaceDetectorClassifications.all,
        };

        const result = await FaceDetector.detectFacesAsync(imageUri, options);

        if (result.faces.length === 0) {
            return {
                success: false,
                error: 'No face detected. Please position your face in the frame.'
            };
        }

        if (result.faces.length > 1) {
            return {
                success: false,
                error: 'Multiple faces detected. Please ensure only one person is in the frame.'
            };
        }

        const face = result.faces[0];

        // Check if face is properly visible
        if (face.rollAngle > 30 || face.yawAngle > 30) {
            return {
                success: false,
                error: 'Please keep your face straight and look at the camera.'
            };
        }

        return {
            success: true,
            face,
            bounds: face.bounds,
            landmarks: face.landmarks,
            rollAngle: face.rollAngle,
            yawAngle: face.yawAngle,
            smilingProbability: face.smilingProbability,
            leftEyeOpenProbability: face.leftEyeOpenProbability,
            rightEyeOpenProbability: face.rightEyeOpenProbability,
        };
    } catch (error) {
        console.error('Error detecting faces:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check for liveness using different gestures
 * Types: 'blink', 'smile', 'head_turn_left', 'head_turn_right', 'look_straight'
 */
export const verifyLivenessGesture = (faceData, gestureType) => {
    try {
        const {
            smilingProbability,
            leftEyeOpenProbability,
            rightEyeOpenProbability,
            yawAngle,
            rollAngle
        } = faceData;

        switch (gestureType) {
            case 'look_straight':
                const isStraight = Math.abs(yawAngle) < 10 && Math.abs(rollAngle) < 10;
                const eyesOpen = (leftEyeOpenProbability + rightEyeOpenProbability) / 2 > 0.6;
                if (!isStraight) return { success: false, error: 'Look straight at the camera' };
                if (!eyesOpen) return { success: false, error: 'Keep your eyes open' };
                return { success: true };

            case 'blink':
                // Detection of blink is usually done over a sequence, 
                // but here we check if eyes are currently closed/mostly closed
                const eyesClosed = (leftEyeOpenProbability + rightEyeOpenProbability) / 2 < 0.4;
                if (!eyesClosed) return { success: false, error: 'Please blink your eyes' };
                return { success: true };

            case 'smile':
                const isSmiling = smilingProbability > 0.7;
                if (!isSmiling) return { success: false, error: 'Please smile for the camera' };
                return { success: true };

            case 'head_turn_left':
                const turnedLeft = yawAngle > 20;
                if (!turnedLeft) return { success: false, error: 'Turn your head slightly to the left' };
                return { success: true };

            case 'head_turn_right':
                const turnedRight = yawAngle < -20;
                if (!turnedRight) return { success: false, error: 'Turn your head slightly to the right' };
                return { success: true };

            default:
                return { success: false, error: 'Unknown gesture' };
        }
    } catch (error) {
        console.error('Error checking liveness gesture:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Basic anti-spoofing check
 */
export const checkLiveness = (faceData) => {
    try {
        const { leftEyeOpenProbability, rightEyeOpenProbability, smilingProbability } = faceData;

        // Basic check: Are eyes open?
        const eyesOpen = leftEyeOpenProbability > 0.4 && rightEyeOpenProbability > 0.4;

        if (!eyesOpen) {
            return {
                success: false,
                error: 'Please keep your eyes open and look at the camera.'
            };
        }

        return { success: true, isLive: true };
    } catch (error) {
        console.error('Error checking liveness:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Crop face from image using detected bounds
 */
export const cropFace = async (imageUri, bounds) => {
    try {
        const { origin, size } = bounds;

        // Add some padding around the face
        const padding = 20;
        const cropConfig = {
            crop: {
                originX: Math.max(0, origin.x - padding),
                originY: Math.max(0, origin.y - padding),
                width: size.width + (padding * 2),
                height: size.height + (padding * 2),
            },
        };

        const croppedImage = await manipulateAsync(
            imageUri,
            [cropConfig],
            { compress: 0.8, format: SaveFormat.JPEG }
        );

        return { success: true, uri: croppedImage.uri };
    } catch (error) {
        console.error('Error cropping face:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Generate face embedding (mock implementation)
 * In production, use face-api.js or TensorFlow.js
 * 
 * This creates a 128-dimensional vector representation of the face
 */
export const generateFaceEmbedding = async (imageUri) => {
    try {
        // Read image as base64
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Mock embedding generation
        // In production, use face-api.js:
        // const detections = await faceapi
        //   .detectSingleFace(image)
        //   .withFaceLandmarks()
        //   .withFaceDescriptor();
        // const embedding = detections.descriptor;

        // For now, generate a mock 128-dimensional embedding
        const embedding = Array.from({ length: 128 }, () => Math.random());

        return {
            success: true,
            embedding,
            imageBase64: `data:image/jpeg;base64,${base64}`
        };
    } catch (error) {
        console.error('Error generating face embedding:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Calculate cosine similarity between two embeddings
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export const cosineSimilarity = (embedding1, embedding2) => {
    try {
        if (embedding1.length !== embedding2.length) {
            throw new Error('Embeddings must have the same length');
        }

        let dotProduct = 0;
        let norm1 = 0;
        let norm2 = 0;

        for (let i = 0; i < embedding1.length; i++) {
            dotProduct += embedding1[i] * embedding2[i];
            norm1 += embedding1[i] * embedding1[i];
            norm2 += embedding2[i] * embedding2[i];
        }

        const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));

        return { success: true, similarity };
    } catch (error) {
        console.error('Error calculating similarity:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Compare two face embeddings
 * @param {Array} embedding1 - First face embedding
 * @param {Array} embedding2 - Second face embedding
 * @param {number} threshold - Similarity threshold (default: 0.75)
 * @returns {Object} - Match result
 */
export const compareFaceEmbeddings = (embedding1, embedding2, threshold = 0.75) => {
    try {
        const result = cosineSimilarity(embedding1, embedding2);

        if (!result.success) {
            return result;
        }

        const isMatch = result.similarity >= threshold;
        const confidence = result.similarity;

        return {
            success: true,
            isMatch,
            confidence,
            similarity: result.similarity,
            threshold,
        };
    } catch (error) {
        console.error('Error comparing faces:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Validate face image quality
 */
export const validateFaceQuality = (faceData) => {
    try {
        const { bounds, rollAngle, yawAngle } = faceData;

        // Check face size (should be reasonably large)
        const minFaceSize = 100;
        if (bounds.size.width < minFaceSize || bounds.size.height < minFaceSize) {
            return {
                success: false,
                error: 'Face too small. Please move closer to the camera.'
            };
        }

        // Check face angle
        if (Math.abs(rollAngle) > 30 || Math.abs(yawAngle) > 30) {
            return {
                success: false,
                error: 'Please keep your face straight and look directly at the camera.'
            };
        }

        return { success: true, quality: 'good' };
    } catch (error) {
        console.error('Error validating face quality:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Process face for registration
 * Complete workflow: detect -> validate -> crop -> generate embedding
 */
export const processFaceForRegistration = async (imageUri) => {
    try {
        // Step 1: Detect face
        const detection = await detectFaces(imageUri);
        if (!detection.success) {
            return detection;
        }

        // Step 2: Validate quality
        const quality = validateFaceQuality(detection);
        if (!quality.success) {
            return quality;
        }

        // Step 3: Check liveness
        const liveness = checkLiveness(detection);
        if (!liveness.success) {
            return liveness;
        }

        // Step 4: Crop face
        const cropped = await cropFace(imageUri, detection.bounds);
        if (!cropped.success) {
            return cropped;
        }

        // Step 5: Generate embedding
        const embedding = await generateFaceEmbedding(cropped.uri);
        if (!embedding.success) {
            return embedding;
        }

        return {
            success: true,
            embedding: embedding.embedding,
            imageBase64: embedding.imageBase64,
            faceData: detection,
        };
    } catch (error) {
        console.error('Error processing face:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Process face for attendance verification
 */
export const processFaceForVerification = async (imageUri, storedEmbedding, threshold = 0.75) => {
    try {
        // Process the captured face
        const processed = await processFaceForRegistration(imageUri);
        if (!processed.success) {
            return processed;
        }

        // Compare with stored embedding
        const comparison = compareFaceEmbeddings(
            processed.embedding,
            storedEmbedding,
            threshold
        );

        if (!comparison.success) {
            return comparison;
        }

        if (!comparison.isMatch) {
            return {
                success: false,
                error: 'Face does not match. Please try again or contact HR.',
                confidence: comparison.confidence,
            };
        }

        return {
            success: true,
            isMatch: true,
            confidence: comparison.confidence,
            faceData: processed.faceData,
        };
    } catch (error) {
        console.error('Error verifying face:', error);
        return { success: false, error: error.message };
    }
};
