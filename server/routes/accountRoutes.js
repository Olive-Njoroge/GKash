const express = require("express");
const router = express.Router();
const {createAccount, getAllUserAccounts, getAccountById, deleteAccount} = require("../controllers/accountController");
const {protect} = require("../middleware/auth");

router.post("/accounts", protect, createAccount);
router.get("/accounts", protect, getAllUserAccounts);
router.get("/accounts/:id", protect, getAccountById);
router.delete("/accounts/:id", protect, deleteAccount);

module.exports = router;