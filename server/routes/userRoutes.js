const express = require("express");
const router = express.Router();
const {getUsers, getUserById, updateUser, deleteUser} = require("../controllers/userController")
const {protect} = require("../middleware/auth")

router.get("/user", protect, getUsers);
router.get("/user/:id", protect, getUserById);
router.put("/user/:id", protect, updateUser);
router.delete("/user/:id", protect, deleteUser);

module.exports = router