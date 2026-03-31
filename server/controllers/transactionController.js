const Transaction = require("../models/transactions");
const User = require("../models/User");
const Account = require("../models/accounts");

// Carrying out a transaction (withdraw/ deposit) with Payhero STK push for deposits
const { initiateStkPush } = require("../services/payheroService");

exports.createTransaction = async (req, res) => {
    try {
        const { transaction_type, amount, phoneNumber, reference, description } = req.body;

        if (!transaction_type || !amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid transaction data" });
        }

        const type = transaction_type.trim().toLowerCase();

        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ message: "User does not exist" });

        // Find account linked to user
        const account = await Account.findOne({ user_id: req.userId });
        if (!account) return res.status(404).json({ message: "Account not found" });

        // Process the transaction
        if (type === "deposit") {
            // Initiate Payhero STK push
            if (!phoneNumber) {
                return res.status(400).json({ message: "Phone number required for deposit" });
            }
            try {
                const stkResponse = await initiateStkPush({
                    phoneNumber,
                    amount,
                    reference: reference || `Deposit_${Date.now()}`,
                    description: description || "Account deposit via Payhero STK Push"
                });

                // Save transaction as pending until confirmation
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
                    transaction,
                    stkResponse
                });
            } catch (stkError) {
                return res.status(500).json({ message: "Failed to initiate STK Push", error: stkError });
            }
        } else if (type === "withdraw") {
            if (account.account_balance < amount) {
                return res.status(400).json({ message: "You have insufficient funds" });
            }
            account.account_balance -= amount;
            await account.save();
            // Save transaction record
            const transaction = await Transaction.create({
                user_id: req.userId,
                account_id: account._id,
                transaction_type: type,
                amount,
                status: "completed",
                date_and_time: new Date(),
            });
            return res.status(201).json({ message: "Withdrawal successful", transaction, balance: account.account_balance });
        } else {
            return res.status(400).json({ message: "Invalid transaction type" });
        }
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ message: "Server error" });
    }
};

//View all your transactions
exports.viewTransactions = async(req, res) => {
    try{
        const transactions = await Transaction.find({user_id: req.userId}).sort({date_and_time: -1})
        res.status(200).json(transactions);

    }catch(error){
        console.error(error.message);
        res.status(500).json({message: "Couldn't fetch transactions"});
    }
}