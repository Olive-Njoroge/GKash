const Transaction = require("../models/transactions");
const User = require("../models/User");
const Account = require("../models/accounts");

const { initiateStkPush, withdrawToMpesa } = require("../services/payheroService");

// Carry out a transaction (withdraw / deposit via Payhero STK push)
exports.createTransaction = async (req, res) => {
    try {
        const { transaction_type, amount, phoneNumber, reference, description, account_id } = req.body;

        if (!transaction_type || !amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid transaction data" });
        }

        if (!account_id) {
            return res.status(400).json({ message: "account_id is required" });
        }

        const type = transaction_type.trim().toLowerCase();

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User does not exist" });

        const account = await Account.findOne({ _id: account_id, user_id: req.userId });
        if (!account) return res.status(404).json({ message: "Account not found" });

        if (type === "deposit") {
            if (!phoneNumber) {
                return res.status(400).json({ message: "Phone number required for deposit", status: "failed", balance: account.account_balance });
            }

            try {
                const stkResponse = await initiateStkPush({
                    phoneNumber,
                    amount,
                    reference: reference || `Deposit_${Date.now()}`,
                    description: description || "Account deposit via Payhero STK Push"
                });

                // Save transaction as pending — balance updated only after webhook confirmation
                const transaction = await Transaction.create({
                    user_id: req.userId,
                    account_id: account._id,
                    transaction_type: type,
                    amount,
                    status: "pending",
                    date_and_time: new Date(),
                    payhero_reference: stkResponse.reference || stkResponse.transactionId || null,
                });

                return res.status(201).json({
                    message: "STK Push initiated. Awaiting payment confirmation.",
                    transaction_status: transaction.status,
                    balance: account.account_balance,
                    transaction,
                    stkResponse
                });
            } catch (stkError) {
                return res.status(500).json({ message: "Failed to initiate STK Push", status: "failed", balance: account.account_balance, error: stkError });
            }

        } else if (type === "withdraw") {
            if (!phoneNumber) {
                return res.status(400).json({ message: "Phone number required for withdrawal", status: "failed", balance: account.account_balance });
            }

            // Check available balance net of any pending withdrawals
            const pendingWithdrawals = await Transaction.aggregate([
                { $match: { user_id: req.userId, account_id: account._id, transaction_type: "withdraw", status: "pending" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ]);

            const pendingTotal = pendingWithdrawals[0]?.total || 0;
            const availableBalance = account.account_balance - pendingTotal;

            if (availableBalance < amount) {
                return res.status(400).json({
                    message: "Insufficient funds",
                    status: "failed",
                    balance: account.account_balance,
                    available_balance: availableBalance
                });
            }

            try {
                const payoutResponse = await withdrawToMpesa({
                    phoneNumber,
                    amount,
                    reference: reference || `Withdraw_${Date.now()}`,
                    description: description || "Withdrawal to M-Pesa"
                });

                // Save as pending — balance is NOT deducted until webhook confirms payout
                const transaction = await Transaction.create({
                    user_id: req.userId,
                    account_id: account._id,
                    transaction_type: type,
                    amount,
                    status: "pending",
                    date_and_time: new Date(),
                    payhero_reference: payoutResponse.reference || payoutResponse.transactionId || null,
                });

                return res.status(201).json({
                    message: "Withdrawal initiated. Awaiting M-Pesa confirmation.",
                    transaction_status: transaction.status,
                    balance: account.account_balance,
                    available_balance: availableBalance - amount,
                    transaction,
                });
            } catch (payoutError) {
                return res.status(500).json({ message: "Failed to initiate withdrawal", status: "failed", balance: account.account_balance, error: payoutError });
            }

        } else {
            return res.status(400).json({ message: "Invalid transaction type" });
        }

    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Server error" });
    }
};

// Payhero webhook — called by Payhero after payment is confirmed or fails
// Register this route as POST /api/transactions/webhook (no auth middleware)
exports.payheroWebhook = async (req, res) => {
    try {
        const { reference, status } = req.body;

        // Payhero sends status as "Success" or "Failed" — normalise it
        const payheroStatus = typeof status === "string" ? status.trim().toLowerCase() : "";

        if (!reference) {
            return res.status(400).json({ message: "Missing payment reference" });
        }

        // Find the pending transaction that matches this Payhero reference
        const transaction = await Transaction.findOne({
            payhero_reference: reference,
            status: "pending",
        });

        if (!transaction) {
            // Could be a duplicate callback or unknown reference — acknowledge safely
            return res.status(200).json({ message: "Transaction not found or already processed" });
        }

        const account = await Account.findById(transaction.account_id);
        if (!account) {
            return res.status(404).json({ message: "Account not found", status: "failed" });
        }

        if (payheroStatus === "success") {
            if (transaction.transaction_type === "deposit") {
                // Credit the account on successful deposit
                account.account_balance += transaction.amount;
            } else if (transaction.transaction_type === "withdraw") {
                // Only deduct balance now that payout is confirmed
                account.account_balance -= transaction.amount;
            }

            await account.save();
            transaction.status = "completed";
            await transaction.save();

            return res.status(200).json({
                message: `${transaction.transaction_type} confirmed and balance updated`,
                status: transaction.status,
                balance: account.account_balance,
                transaction
            });

        } else {
            // Payment failed — no balance change for either type
            transaction.status = "failed";
            await transaction.save();

            return res.status(200).json({
                message: "Payment failed. No balance change.",
                status: transaction.status,
                balance: account.account_balance,
                transaction
            });
        }

    } catch (error) {
        console.error("Webhook Error:", error.message);
        res.status(500).json({ message: "Webhook processing error", error: error.message });
    }
};

// View all transactions for the logged-in user
exports.viewTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ user_id: req.userId }).sort({ date_and_time: -1 });
        res.status(200).json(transactions);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Couldn't fetch transactions" });
    }
};