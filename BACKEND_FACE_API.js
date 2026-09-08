/**
 * FACE RECOGNITION BACKEND API STRUCTURE
 * 
 * Technology Recommendation:
 * - Runtime: Node.js (Express.js)
 * - Library: @vladmandic/face-api
 * - Deployment: AWS Lambda / Google Cloud Functions (Firebase Functions)
 */

const express = require('express');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas'); // Polyfill for Node.js
const { Canvas, Image, ImageData, loadImage } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const router = express.Router();

// 1. Model Initialization
async function loadModels() {
    const modelPath = './models';
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
}

// 2. FACE REGISTRATION (Generate Embedding)
/**
 * @route POST /api/face/register
 * @desc Extract embedding from image, store in DB, discard image
 */
router.post('/register', async (req, res) => {
    try {
        const { userId, companyId, imageBase64 } = req.body;

        // Convert base64 to image
        const img = await loadImage(imageBase64);

        // Detect face and extract descriptor
        const detections = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detections) {
            return res.status(400).json({ success: false, error: 'No face detected' });
        }

        // The descriptor is an array of 128 (or 512) numbers
        const embedding = Array.from(detections.descriptor);

        // Save to Database (Firestore/Postgres)
        await db.collection('users').doc(userId).update({
            faceEmbedding: embedding,
            faceRegistered: true,
            faceRegisteredAt: new Date().toISOString()
        });

        // AUDIT LOG
        await logActivity(userId, 'FACE_REGISTERED', { companyId });

        res.json({ success: true, message: 'Face template stored successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. FACE VERIFICATION (Match Embedding)
/**
 * @route POST /api/face/verify
 * @desc Extract embedding from live capture and compare with stored one
 */
router.post('/verify', async (req, res) => {
    try {
        const { userId, imageBase64, threshold = 0.6 } = req.body;

        // 1. Get stored embedding from DB
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists || !userDoc.data().faceEmbedding) {
            return res.status(404).json({ success: false, error: 'User face not registered' });
        }
        const storedEmbedding = new Float32Array(userDoc.data().faceEmbedding);

        // 2. Process live image
        const img = await loadImage(imageBase64);
        const liveDetection = await faceapi.detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!liveDetection) {
            return res.status(400).json({ success: false, error: 'No face detected in live capture' });
        }

        // 3. Match
        const faceMatcher = new faceapi.FaceMatcher(
            [new faceapi.LabeledFaceDescriptors(userId, [storedEmbedding])],
            threshold
        );

        const bestMatch = faceMatcher.findBestMatch(liveDetection.descriptor);
        const matchScore = 1 - bestMatch.distance; // Distance to similarity score

        const isMatch = bestMatch.label !== 'unknown' && matchScore >= threshold;

        res.json({
            success: true,
            isMatch,
            matchScore,
            userId
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

/**
 * SECURITY BEST PRACTICES
 * 1. Always use HTTPS.
 * 2. Never store the raw image on server disk; process in memory.
 * 3. Encrypt embedding vectors at rest if possible.
 * 4. Implement rate limiting on /verify endpoint to prevent brute force.
 * 5. Use JWT for authentication; verify userId against token.
 */
