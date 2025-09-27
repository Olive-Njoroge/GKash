const express = require("express");
const router = express.Router();
const {createTransaction, viewTransactions} = require("../controllers/transactionController");
const {protect} = require("../middleware/auth");

router.post("/transactions", protect, createTransaction);
router.get("/transactions", protect, viewTransactions);

module.exports = router;