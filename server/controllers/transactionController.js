// server/controllers/transactionController.js
const Transaction = require('../models/transactions');
const User = require('../models/User');
const Account = require('../models/accounts');
const { initiateStkPush, withdrawToMpesa } = require('../services/payheroService');

// ─────────────────────────────────────────────
// POST /api/transactions
// ─────────────────────────────────────────────
exports.createTransaction = async (req, res) => {
  try {
    const { transaction_type, amount, phoneNumber, description, account_id } = req.body;

    if (!transaction_type || !amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'transaction_type and a positive amount are required' });
    }
    if (!account_id) {
      return res.status(400).json({ message: 'account_id is required' });
    }
    if (!phoneNumber) {
      return res.status(400).json({ message: 'phoneNumber is required' });
    }

    const type = transaction_type.trim().toLowerCase();
    if (!['deposit', 'withdraw'].includes(type)) {
      return res.status(400).json({ message: 'transaction_type must be deposit or withdraw' });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User does not exist' });

    const account = await Account.findOne({ _id: account_id, user_id: req.userId });
    if (!account) return res.status(404).json({ message: 'Account not found' });

    // ── DEPOSIT ──────────────────────────────
    if (type === 'deposit') {
      const transaction = await Transaction.create({
        user_id: req.userId,
        account_id: account._id,
        transaction_type: 'deposit',
        amount: Number(amount),
        status: 'pending',
        date_and_time: new Date(),
      });

      try {
        const stkResponse = await initiateStkPush({
          phoneNumber,
          amount: Number(amount),
          reference: transaction._id.toString(),
          description: description || 'Account deposit via M-Pesa',
        });

        console.log('[Deposit] Full STK response:', JSON.stringify(stkResponse, null, 2));

        // Save every reference Payhero gives us — we'll use all of them in the webhook lookup
        await Transaction.findByIdAndUpdate(transaction._id, {
          payhero_reference: stkResponse.CheckoutRequestID
            || stkResponse.checkout_request_id
            || stkResponse.reference
            || stkResponse.merchant_reference
            || stkResponse.merchantReference
            || transaction._id.toString(),
        });

        return res.status(201).json({
          message: 'STK Push initiated. Check your phone to complete payment.',
          transaction_status: 'pending',
          transaction_id: transaction._id,
          balance: account.account_balance,
          stkResponse,
        });
      } catch (stkError) {
        await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
        return res.status(500).json({
          message: 'Failed to initiate STK Push',
          status: 'failed',
          balance: account.account_balance,
          error: stkError,
        });
      }
    }

    // ── WITHDRAW ─────────────────────────────
    if (type === 'withdraw') {
      const pendingWithdrawals = await Transaction.aggregate([
        {
          $match: {
            account_id: account._id,
            transaction_type: 'withdraw',
            status: 'pending',
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);

      const pendingTotal = pendingWithdrawals[0]?.total || 0;
      const availableBalance = account.account_balance - pendingTotal;

      if (availableBalance < Number(amount)) {
        return res.status(400).json({
          message: 'Insufficient funds',
          status: 'failed',
          balance: account.account_balance,
          available_balance: availableBalance,
        });
      }

      const transaction = await Transaction.create({
        user_id: req.userId,
        account_id: account._id,
        transaction_type: 'withdraw',
        amount: Number(amount),
        status: 'pending',
        date_and_time: new Date(),
      });

      try {
        const payoutResponse = await withdrawToMpesa({
          phoneNumber,
          amount: Number(amount),
          reference: transaction._id.toString(),
          description: description || 'Withdrawal to M-Pesa',
        });

        console.log('[Withdraw] Full payout response:', JSON.stringify(payoutResponse, null, 2));

        await Transaction.findByIdAndUpdate(transaction._id, {
          payhero_reference: payoutResponse.CheckoutRequestID
            || payoutResponse.checkout_request_id
            || payoutResponse.reference
            || payoutResponse.merchant_reference
            || payoutResponse.merchantReference
            || transaction._id.toString(),
        });

        return res.status(201).json({
          message: 'Withdrawal initiated. Funds will arrive after M-Pesa confirmation.',
          transaction_status: 'pending',
          transaction_id: transaction._id,
          balance: account.account_balance,
          available_balance: availableBalance - Number(amount),
          payoutResponse,
        });
      } catch (payoutError) {
        await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
        return res.status(500).json({
          message: 'Failed to initiate withdrawal',
          status: 'failed',
          balance: account.account_balance,
          error: payoutError,
        });
      }
    }
  } catch (error) {
    console.error('createTransaction error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────
// Classify Payhero status string
// ─────────────────────────────────────────────
function classifyStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'success') return 'success';
  if (['failed', 'cancelled', 'canceled', 'rejected'].includes(s)) return 'failed';
  return 'pending';
}

// ─────────────────────────────────────────────
// POST /api/transactions/webhook
// Payhero posts payment result here.
// No auth — must be publicly accessible.
// ─────────────────────────────────────────────
exports.payheroWebhook = async (req, res) => {
  res.status(200).json({ success: true });

  try {
    console.log('[Webhook] Full payload:', JSON.stringify(req.body, null, 2));

    const body = req.body;

    // Collect every reference-like field Payhero might send
    // From the dashboard screenshot, Payhero uses its own merchant_reference
    // like "3ac6-4536-95db-4482d9bbe1bc3407575" which is NOT our transaction _id.
    // So we search by payhero_reference (which we saved at initiation) instead.
    const possibleRefs = [
      body.external_reference,
      body.ExternalReference,
      body.merchant_reference,
      body.merchantReference,
      body.checkout_request_id,
      body.CheckoutRequestID,
      body.reference,
    ].filter(Boolean);

    const rawStatus =
      body.status || body.Status || body.payment_status || body.PaymentStatus || '';

    console.log('[Webhook] Possible references:', possibleRefs);
    console.log('[Webhook] Raw status:', rawStatus);

    if (possibleRefs.length === 0) {
      console.warn('[Webhook] ⚠️  No reference fields found. Body keys:', Object.keys(body));
      return;
    }

    // Try to find the transaction by any of the references Payhero sent.
    // We check both payhero_reference (saved at initiation) and _id (fallback).
    let transaction = null;

    for (const ref of possibleRefs) {
      // Search by payhero_reference first (most reliable)
      transaction = await Transaction.findOne({
        payhero_reference: ref,
        status: 'pending',
      });
      if (transaction) {
        console.log(`[Webhook] Matched transaction by payhero_reference: "${ref}"`);
        break;
      }

      // Fallback: try matching by _id in case external_reference is the transaction _id
      if (ref.match(/^[a-f\d]{24}$/i)) {
        transaction = await Transaction.findOne({ _id: ref, status: 'pending' });
        if (transaction) {
          console.log(`[Webhook] Matched transaction by _id: "${ref}"`);
          break;
        }
      }
    }

    if (!transaction) {
      console.warn('[Webhook] ⚠️  No pending transaction matched any of these refs:', possibleRefs);
      return;
    }

    console.log(`[Webhook] Transaction: ${transaction._id} | type: ${transaction.transaction_type} | amount: ${transaction.amount}`);

    const outcome = classifyStatus(rawStatus);
    console.log(`[Webhook] Outcome: "${outcome}" (raw: "${rawStatus}")`);

    if (outcome === 'success') {
      transaction.status = 'completed';
      await transaction.save();

      if (transaction.transaction_type === 'deposit') {
        const updated = await Account.findByIdAndUpdate(
          transaction.account_id,
          { $inc: { account_balance: transaction.amount } },
          { new: true }
        );
        console.log(`[Webhook] ✅ Deposit complete — +KES ${transaction.amount} | New balance: KES ${updated?.account_balance}`);

      } else if (transaction.transaction_type === 'withdraw') {
        const updated = await Account.findByIdAndUpdate(
          transaction.account_id,
          { $inc: { account_balance: -transaction.amount } },
          { new: true }
        );
        console.log(`[Webhook] ✅ Withdrawal complete — -KES ${transaction.amount} | New balance: KES ${updated?.account_balance}`);
      }

    } else if (outcome === 'failed') {
      transaction.status = 'failed';
      await transaction.save();
      console.log(`[Webhook] ❌ Failed/cancelled — txn: ${transaction._id} | raw: "${rawStatus}"`);

    } else {
      console.log(`[Webhook] ⏳ Still pending (QUEUED etc.) — txn: ${transaction._id} | raw: "${rawStatus}"`);
    }

  } catch (err) {
    console.error('[Webhook] 💥 Error:', err.message, err.stack);
  }
};

// ─────────────────────────────────────────────
// GET /api/transactions
// ─────────────────────────────────────────────
exports.viewTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user_id: req.userId }).sort({
      date_and_time: -1,
    });
    res.status(200).json(transactions);
  } catch (error) {
    console.error('viewTransactions error:', error.message);
    res.status(500).json({ message: "Couldn't fetch transactions" });
  }
};