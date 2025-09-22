const Transaction = require("../models/transactions");
const User = require("../models/Users");
const Account = require("../models/accounts");

//Carrying out a transaction (withdraw/ deposit)
exports.createTransaction = async(req, res) => {
    try{
        const {transaction_type, amount, user_nationalId} = req.body

    }catch(error){

    }
}

//View all your transactions
