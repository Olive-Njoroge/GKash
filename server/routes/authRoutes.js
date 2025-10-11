const express = require("express");
const multer = require("multer");
const {registerWithId, addPhone, sendOtp, verifyOtp, createPin, login} = require("../controllers/authController")
const {verifyTempToken} = require("../middleware/tempAuth");
const router = express.Router();

// Configure multer for file uploads
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// 5-step registration flow
router.post("/register-with-id", upload.fields([{ name: 'idImage', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]), registerWithId);
router.post("/add-phone", verifyTempToken, addPhone);
router.post("/send-otp", verifyTempToken, sendOtp);
router.post("/verify-otp", verifyTempToken, verifyOtp);
router.post("/create-pin", verifyTempToken, createPin);

// Login endpoint  
router.post("/login", login);           // National ID + PIN login

module.exports = router;