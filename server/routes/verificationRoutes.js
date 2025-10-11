const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const { protect } = require('../middleware/auth');
const { verifyId, getVerificationStatus } = require('../controllers/verificationController');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer with Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'id-verifications',
        allowed_formats: ['jpg', 'png', 'jpeg'],
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Routes
router.post('/verify-id', 
    protect,
    upload.fields([
        { name: 'idFront', maxCount: 1 },
        { name: 'selfie', maxCount: 1 }
    ]),
    verifyId
);

router.get('/status', protect, getVerificationStatus);

module.exports = router;