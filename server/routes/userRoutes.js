const express = require("express");
const router = express.Router();
const {createUser, getUsers, getUserById, updateUser, deleteUser} = require("../controllers/userController")
const {protect} = require("../middleware/auth")

router.post("/user", protect,  createUser);
router.get("/user", protect, getUsers);
router.get("/user/:id", protect, getUserById);
router.put("/user/:id", protect, updateUser);
router.delete("/user/:id", protect, deleteUser);

module.exports = router