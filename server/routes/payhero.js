// server/routes/payhero.js
// Dedicated /api/payments/* routes (STK push, callback, status check)
const express = require('express');
const axios = require('axios');
const router = express.Router();
const Transaction = require('../models/transactions');
const Account = require('../models/accounts');
const { protect } = require('../middleware/auth');

const PAYHERO_BASE_URL =
  process.env.PAYHERO_BASE_URL || 'https://backend.payhero.co.ke/api/v2';
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

function normalizePhone(phone) {
  const cleaned = String(phone).replace(/\s+/g, '');
  if (cleaned.startsWith('0')) return '254' + cleaned.slice(1);
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  return cleaned;
}

function classifyStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'success') return 'success';
  if (['failed', 'cancelled', 'canceled', 'rejected'].includes(s)) return 'failed';
  return 'pending';
}

// ─────────────────────────────────────────────
// 1. INITIATE DEPOSIT (STK PUSH)
// POST /api/payments/deposit
// ─────────────────────────────────────────────
router.post('/deposit', protect, async (req, res) => {
  const { phone, amount, account_id } = req.body;
  const userId = req.userId;

  if (!phone || !amount || !account_id) {
    return res.status(400).json({
      success: false,
      message: 'phone, amount and account_id are required',
    });
  }
  if (Number(amount) < 1) {
    return res.status(400).json({ success: false, message: 'Amount must be at least KES 1' });
  }

  const account = await Account.findOne({ _id: account_id, user_id: userId });
  if (!account) {
    return res
      .status(404)
      .json({ success: false, message: 'Account not found or does not belong to you' });
  }

  const transaction = await Transaction.create({
    user_id: userId,
    account_id: account._id,
    transaction_type: 'deposit',
    amount: Number(amount),
    status: 'pending',
  });

  try {
    const response = await payheroClient.post('/payments', {
      amount: Number(amount),
      phone_number: normalizePhone(phone),
      channel_id: Number(PAYHERO_CHANNEL_ID),
      external_reference: transaction._id.toString(),
      callback_url: PAYHERO_CALLBACK_URL,
      provider: 'm-pesa',
    });

    const data = response.data;

    console.log('[Deposit] Full PayHero response:', JSON.stringify(data, null, 2));

    // Save both references — short 'reference' for status checks, CheckoutRequestID as fallback
    await Transaction.findByIdAndUpdate(transaction._id, {
      payhero_reference: data.reference || data.CheckoutRequestID || data.checkout_request_id || data.merchant_reference || null,
      payhero_checkout_id: data.CheckoutRequestID || data.checkout_request_id || null,
    });

    return res.status(200).json({
      success: true,
      message: 'STK push sent. Please check your phone to complete the payment.',
      transaction_id: transaction._id,
      payhero_reference: data.reference || data.CheckoutRequestID,
    });
  } catch (error) {
    await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
    const errMsg = error.response?.data || error.message;
    console.error('[Payhero] STK Push Error:', errMsg);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to initiate payment', error: errMsg });
  }
});

// ─────────────────────────────────────────────
// 2. CALLBACK — Payhero posts payment result here
// POST /api/payments/callback
// No auth — must be public
// ─────────────────────────────────────────────
router.post('/callback', async (req, res) => {
  res.status(200).json({ success: true });

  try {
    console.log('[Payhero Callback] Payload:', JSON.stringify(req.body, null, 2));

    const body = req.body;
    const rawStatus =
      body.status || body.Status || body.payment_status || body.PaymentStatus || '';

    const possibleRefs = [
      body.external_reference,
      body.ExternalReference,
      body.merchant_reference,
      body.merchantReference,
      body.checkout_request_id,
      body.CheckoutRequestID,
      body.reference,
    ].filter(Boolean);

    if (possibleRefs.length === 0) {
      console.warn('[Callback] No reference fields found. Body keys:', Object.keys(body));
      return;
    }

    let transaction = null;
    for (const ref of possibleRefs) {
      transaction = await Transaction.findOne({ payhero_reference: ref, status: 'pending' });
      if (transaction) break;
      if (ref.match(/^[a-f\d]{24}$/i)) {
        transaction = await Transaction.findOne({ _id: ref, status: 'pending' });
        if (transaction) break;
      }
    }

    if (!transaction) {
      console.warn('[Callback] No pending transaction matched refs:', possibleRefs);
      return;
    }

    const outcome = classifyStatus(rawStatus);

    if (outcome === 'success') {
      await Transaction.findByIdAndUpdate(transaction._id, { status: 'completed' });

      if (transaction.transaction_type === 'deposit') {
        const updated = await Account.findByIdAndUpdate(
          transaction.account_id,
          { $inc: { account_balance: transaction.amount } },
          { new: true }
        );
        console.log(`[Callback] ✅ Deposit completed — +KES ${transaction.amount} | New balance: KES ${updated?.account_balance}`);
      } else if (transaction.transaction_type === 'withdraw') {
        const updated = await Account.findByIdAndUpdate(
          transaction.account_id,
          { $inc: { account_balance: -transaction.amount } },
          { new: true }
        );
        console.log(`[Callback] ✅ Withdrawal completed — -KES ${transaction.amount} | New balance: KES ${updated?.account_balance}`);
      }
    } else if (outcome === 'failed') {
      await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
      console.log(`[Callback] ❌ Failed — txn: ${transaction._id} | raw: "${rawStatus}"`);
    } else {
      console.log(`[Callback] ⏳ Still pending — txn: ${transaction._id} | raw: "${rawStatus}"`);
    }
  } catch (err) {
    console.error('[Payhero Callback] Error:', err.message);
  }
});

// ─────────────────────────────────────────────
// 3. CHECK TRANSACTION STATUS + UPDATE BALANCE
// GET /api/payments/status/:transaction_id
// ─────────────────────────────────────────────
router.get('/status/:transaction_id', protect, async (req, res) => {
  const { transaction_id } = req.params;
  const userId = req.userId;

  const transaction = await Transaction.findOne({ _id: transaction_id, user_id: userId });
  if (!transaction) {
    return res.status(404).json({ success: false, message: 'Transaction not found' });
  }

  // Already resolved — return immediately
  if (transaction.status !== 'pending') {
    const account = await Account.findById(transaction.account_id);
    return res.status(200).json({
      success: true,
      source: 'local',
      status: transaction.status,
      amount: transaction.amount,
      transaction_type: transaction.transaction_type,
      transaction_id: transaction._id,
      balance: account?.account_balance,
      date: transaction.date_and_time,
    });
  }

  // No payhero reference yet — too early to check
  if (!transaction.payhero_reference) {
    return res.status(200).json({
      success: true,
      source: 'local',
      status: 'pending',
      message: 'Payment is being processed. Please wait.',
    });
  }

  // Ask PayHero directly — try short 'reference' first, fallback to checkout_request_id
  try {
    let response;
    try {
      response = await payheroClient.get('/transaction-status', {
        params: { reference: transaction.payhero_reference },
      });
    } catch (firstErr) {
      const fallbackId = transaction.payhero_checkout_id || transaction.payhero_reference;
      console.warn('[Status] reference lookup failed, retrying with checkout_request_id:', fallbackId);
      response = await payheroClient.get('/transaction-status', {
        params: { checkout_request_id: fallbackId },
      });
    }
    const data = response.data;

    console.log('[Status] PayHero response:', JSON.stringify(data, null, 2));

    const outcome = classifyStatus(data.status);

    // ── KEY FIX: update DB and balance based on PayHero's response ──
    if (outcome === 'success' && transaction.status === 'pending') {
      await Transaction.findByIdAndUpdate(transaction._id, { status: 'completed' });

      if (transaction.transaction_type === 'deposit') {
        const updated = await Account.findByIdAndUpdate(
          transaction.account_id,
          { $inc: { account_balance: transaction.amount } },
          { new: true }
        );
        console.log(`[Status] ✅ Deposit confirmed & credited — +KES ${transaction.amount} | New balance: KES ${updated?.account_balance}`);
        return res.status(200).json({
          success: true,
          source: 'payhero',
          status: 'completed',
          amount: transaction.amount,
          transaction_id: transaction._id,
          balance: updated?.account_balance,
        });

      } else if (transaction.transaction_type === 'withdraw') {
        const updated = await Account.findByIdAndUpdate(
          transaction.account_id,
          { $inc: { account_balance: -transaction.amount } },
          { new: true }
        );
        console.log(`[Status] ✅ Withdrawal confirmed & debited — -KES ${transaction.amount} | New balance: KES ${updated?.account_balance}`);
        return res.status(200).json({
          success: true,
          source: 'payhero',
          status: 'completed',
          amount: transaction.amount,
          transaction_id: transaction._id,
          balance: updated?.account_balance,
        });
      }

    } else if (outcome === 'failed' && transaction.status === 'pending') {
      await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
      console.log(`[Status] ❌ Transaction failed — txn: ${transaction._id}`);
      const account = await Account.findById(transaction.account_id);
      return res.status(200).json({
        success: true,
        source: 'payhero',
        status: 'failed',
        amount: transaction.amount,
        transaction_id: transaction._id,
        balance: account?.account_balance,
      });
    }

    // Still pending on PayHero's side
    return res.status(200).json({
      success: true,
      source: 'payhero',
      status: 'pending',
      amount: transaction.amount,
      transaction_id: transaction._id,
    });

  } catch (error) {
    const errMsg = error.response?.data || error.message;
    console.error('[Payhero] Status Check Error:', errMsg);
    return res
      .status(500)
      .json({ success: false, message: 'Failed to fetch status from PayHero', error: errMsg });
  }
});

module.exports = router;