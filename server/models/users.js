const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    user_name: {type: String, required: true},
    user_nationalId: {type: String, required: true, unique: true},
    phoneNumber: {type: String, required: true},
    user_pin: {type: String}, // Remove required, add later
    pin_set: {type: Boolean, default: false}, // Track PIN status
    temp_token: {type: String}, // For PIN setup session
}, {timestamps: true});

module.exports = mongoose.model("User", userSchema)