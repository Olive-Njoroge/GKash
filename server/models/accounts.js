const mongoose = require("mongoose")

const accountsSchema = new mongoose.Schema({
    account_type: {type: String, enum: ["balanced fund", "fixed income fund", "money market fund", "stock market"], required: true},
    user_id: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    account_balance: {type: Number, default: 0}
}, {timestamps: true});

module.exports = mongoose.model("Account", accountsSchema);