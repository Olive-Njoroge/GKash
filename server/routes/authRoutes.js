const express = require("express");
const multer = require("multer");
const {
    registerWithId, 
    addPhone, 
    createPin, 
    login,
    cleanupTempUsers
} = require("../controllers/authController");
const {verifyTempToken} = require("../middleware/tempAuth");
const router = express.Router();

// Configure multer
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// 3-step registration flow (OTP handled on frontend)
router.post("/register-with-id", 
    upload.fields([
        { name: 'idImage', maxCount: 1 }, 
        { name: 'selfie', maxCount: 1 }
    ]), 
    registerWithId
);

router.post("/add-phone", verifyTempToken, addPhone);
router.post("/create-pin", verifyTempToken, createPin);

// Login
router.post("/login", login);

router.delete("/cleanup-temp-users", cleanupTempUsers);

module.exports = router;