const express = require("express");
const axios = require("axios");
const router = express.Router();
const Transaction = require("../models/transactions");
const Account = require("../models/accounts");
const { protect } = require("../middleware/auth");

// Helper to normalize phone numbers
function normalizePhone(phone) {
  const cleaned = String(phone).replace(/\s+/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("+")) return cleaned.slice(1);
  return cleaned;
}

// PayHero Axios client
const PAYHERO_BASE_URL = process.env.PAYHERO_BASE_URL || 'https://backend.payhero.co.ke/api/v2';
const PAYHERO_USERNAME = process.env.PAYHERO_USERNAME;
const PAYHERO_PASSWORD = process.env.PAYHERO_PASSWORD;
const PAYHERO_CHANNEL_ID = process.env.PAYHERO_CHANNEL_ID;
const PAYHERO_CALLBACK_URL = process.env.PAYHERO_CALLBACK_URL;
const basicAuthHeader =
  'Basic ' + Buffer.from(`${PAYHERO_USERNAME}:${PAYHERO_PASSWORD}`).toString('base64');

const payheroClient = axios.create({
  baseURL: PAYHERO_BASE_URL,
  headers: {
    Authorization: basicAuthHeader,
    'Content-Type': 'application/json',
  },
});

// 1. INITIATE DEPOSIT (STK PUSH)
router.post("/deposit", protect, async (req, res) => {
  const { phone, amount, account_id } = req.body;
  const userId = req.userId;

  if (!phone || !amount || !account_id) {
    return res.status(400).json({
      success: false,
      message: "phone, amount and account_id are required",
    });
  }
  if (Number(amount) < 1) {
    return res.status(400).json({
      success: false,
      message: "Amount must be at least KES 1",
    });
  }

  const account = await Account.findOne({ _id: account_id, user_id: userId });
  if (!account) {
    return res.status(404).json({
      success: false,
      message: "Account not found or does not belong to you",
    });
  }

  const transaction = await Transaction.create({
    user_id: userId,
    account_id: account._id,
    transaction_type: "deposit",
    amount: Number(amount),
    status: "pending",
  });

  try {
    const response = await payheroClient.post("/payments", {
      amount: Number(amount),
      phone_number: phone, // send as-is for testing
      channel_id: Number(PAYHERO_CHANNEL_ID),
      external_reference: transaction._id.toString(),
      callback_url: PAYHERO_CALLBACK_URL,
      provider: 'm-pesa',
    });

    const data = response.data;
    await Transaction.findByIdAndUpdate(transaction._id, {
      payhero_checkout_id: data.CheckoutRequestID,
      payhero_reference: data.reference,
    });

    return res.status(200).json({
      success: true,
      message: "STK push sent. Please check your phone to complete the payment.",
      transaction_id: transaction._id,
      payhero_reference: data.reference,
    });
  } catch (error) {
    await Transaction.findByIdAndUpdate(transaction._id, { status: "failed" });
    const errMsg = error.response?.data || error.message;
    console.error("PayHero STK Push Error:", errMsg);
    return res.status(500).json({
      success: false,
      message: "Failed to initiate payment",
      error: errMsg,
    });
  }
});

// 2. CALLBACK — PayHero posts the payment result here automatically
router.post("/callback", async (req, res) => {
  const payload = req.body;
  console.log("PayHero Callback Received:", JSON.stringify(payload, null, 2));
  res.status(200).json({ success: true });
  try {
    const payheroStatus = payload?.status;
    const transactionId = payload?.external_reference;
    if (!transactionId) return;
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return;
    if (transaction.status !== "pending") return;
    if (payheroStatus === "Success") {
      await Transaction.findByIdAndUpdate(transactionId, { status: "completed" });
      await Account.findByIdAndUpdate(transaction.account_id, {
        $inc: { account_balance: transaction.amount },
      });
      console.log(`✅ Deposit COMPLETED — TxnID: ${transactionId} | Amount: KES ${transaction.amount}`);
    } else {
      await Transaction.findByIdAndUpdate(transactionId, { status: "failed" });
      console.log(`❌ Deposit FAILED — TxnID: ${transactionId}`);
    }
  } catch (err) {
    console.error("Error processing PayHero callback:", err.message);
  }
});

// 3. CHECK TRANSACTION STATUS
router.get("/status/:transaction_id", protect, async (req, res) => {
  const { transaction_id } = req.params;
  const userId = req.userId;
  const transaction = await Transaction.findOne({
    _id: transaction_id,
    user_id: userId,
  });
  if (!transaction) {
    return res.status(404).json({ success: false, message: "Transaction not found" });
  }
  if (transaction.status !== "pending") {
    return res.status(200).json({
      success: true,
      source: "local",
      status: transaction.status,
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      transaction_id: transaction._id,
      date: transaction.date_and_time,
    });
  }
  if (!transaction.payhero_reference) {
    return res.status(200).json({
      success: true,
      source: "local",
      status: "pending",
      message: "Payment is being processed. Please wait.",
    });
  }
  try {
    const response = await payheroClient.get("/transaction-status", {
      params: { reference: transaction.payhero_reference },
    });
    const data = response.data;
    return res.status(200).json({
      success: true,
      source: "payhero",
      status: data.status,
      amount: data.amount,
      reference: data.reference,
      transaction_id: transaction._id,
    });
  } catch (error) {
    const errMsg = error.response?.data || error.message;
    console.error("PayHero Status Check Error:", errMsg);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch status from PayHero",
      error: errMsg,
    });
  }
});

module.exports = router;
