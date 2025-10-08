const express = require("express");
const {registerUser, createPin, login} = require("../controllers/authController")
const {verifyTempToken} = require("../middleware/tempAuth");
const router = express.Router();

router.post("/register-user", registerUser);
router.post("/create-pin", verifyTempToken, createPin);
router.post("/login", login);

module.exports = router;