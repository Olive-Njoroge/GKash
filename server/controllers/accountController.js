const Account = require("../models/accounts");
const User = require("../models/User");

exports.createAccount = async(req, res) => {
    try{
        const {account_type} = req.body

        if(!account_type) return res.status(400).json({message: "Account type is required"});

        const user = await User.findById(req.userId);
        if(!user) return res.status(404).json({message: "User not found"});

        //create a new account
        const account = await Account.create({account_type, user_id: req.userId, account_balance: 0});

        res.status(201).json({message: "Account created succeddfully", account});
        
    }catch(error){
        console.error(error.message)
        res.status(500).json({message: "server error"});

    }
};

exports.getAllUserAccounts = async(req, res) => {
    try{
        const accounts = await Account.find({user_id: req.userId}).sort({createdAt: -1});
        if(accounts.length === 0) return res.status(404).json({message: "No accounts found"});
        res.status(201).json(accounts)
    }catch(error){
        console.error(error.message);
        res.status(500).json({message: "Server error"});
    }
};

exports.getAccountById = async(req, res) => {
    try{
        const account = await Account.findOne({_id: req.params.id, user_id: req.userId});
        if(!account) return res.status(404).json({message: "Account not found"});
        res.status(201).json(account);
    }catch(error){
        console.error(error.message);
        res.status(500).json({message: "Server error"});
    }
};

exports.deleteAccount = async(req, res) => {
    try{
        const account = await Account.findOneAndDelete({_id: req.params.id, user_id: req.userId});
        if(!account) return res.status(404).json({message: "Account not found or not yours"});
        res.status(200).json({message: "Account deleted successfully"});
    }catch(error){
        console.error(error.message)
        res.status(500).json({message: "Server error"});
    }
}