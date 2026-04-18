// server/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const {
  createTransaction,
  viewTransactions,
  payheroWebhook,
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

// Payhero calls this after payment is confirmed — no auth, must be public
router.post('/transactions/webhook', payheroWebhook);

// Authenticated routes
router.post('/transactions', protect, createTransaction);
router.get('/transactions', protect, viewTransactions);

module.exports = router;