const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    user_name: {type: String, required: true},
    user_nationalId: {type: String, required: true, unique: true},
    user_pin: {type: String, required: true},
    phoneNumber: {type: String, required: true}
}, {timestamps: true});

module.exports = mongoose.model("User", userSchema)