const express = require("express");
const router = express.Router();
const { createTransaction, viewTransactions, payheroWebhook } = require("../controllers/transactionController");
const { protect } = require("../middleware/auth");

router.post("/transactions/webhook", payheroWebhook); // No auth — Payhero calls this directly
router.post("/transactions", protect, createTransaction);
router.get("/transactions", protect, viewTransactions);

module.exports = router;