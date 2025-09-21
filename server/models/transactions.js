const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
    user_id : {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    account_id: {type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true},
    transaction_type: {type: String, enum: ["withdraw", "deposit"], required: true},
    amount: {type: Number, min: [1, "Amount must be greater than 0"], required: true},
    status: {type: String, enum: ["completed", "pending", "failed"], required: true},
    date_and_time: {type: Date, default: Date.now}
}, {timestamps: true})

module.exports = mongoose.model("Transaction", transactionSchema)