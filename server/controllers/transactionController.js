const Transaction = require("../models/transactions");
const User = require("../models/users");
const Account = require("../models/accounts");

//Carrying out a transaction (withdraw/ deposit)
exports.createTransaction = async(req, res) => {
    try{
        const {transaction_type, amount} = req.body

        if (!transaction_type || !amount || amount <= 0) {
            return res.status(400).json({ message: "Invalid transaction data" });
        }

        const type = transaction_type.trim().toLowerCase();

        const user = await User.findById(req.userId)
        if(!user) return res.status(404).json({message: "User does not exist"});

        //Find account linked to user
        const account = await Account.findOne({user_id: req.userId});
        if(!account) return res.status(404).json({message: "Account not found"});
        
        //Process the transaction
        
        if (type === "deposit"){
            account.account_balance += amount;
        }else if(type === "withdraw"){
            if(account.account_balance < amount){
                return res.status(400).json({message: "You have insufficient funds"})
            }
            account.account_balance -=amount;
        }else{
            return res.status(400).json({ message: "Invalid transaction type" });
        }

        await account.save();

        //save transaction record
        const transaction = await Transaction.create({user_id: req.userId, account_id: account._id, transaction_type: type, amount, status: "completed", date_and_time: new Date()});
        res.status(201).json({message: "Transaction successful", transaction, balance: account.account_balance});
    }catch(error){
        console.error(error.message);
        res.status(500).json({ message: "Server error" });
    }
}

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