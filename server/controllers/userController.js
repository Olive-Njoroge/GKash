const User = require("../models/Users");
const bcrypt = require("bcryptjs");

//Create User
exports.createUser = async(req, res) => {
    try{
        const {user_name, user_nationalId, user_pin, phoneNumber} = req.body;
        
        const exist = await User.findOne({user_nationalId});
        if(exist) return res.status(400).json({message: "User already exists"});

        const hashed = await bcrypt.hash(user_pin, 10);
        const user = await User.create({user_name, user_nationalId, user_pin: hashed, phoneNumber})
        res.status(201).json({message: "User created successfully", 
            user: { 
                id: user._id, 
                user_name: user.user_name, 
                phoneNumber: user.phoneNumber 
            } 
        });
    }catch(error){
        res.status(400).json({message: error.message});
    }
};

//Get all users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find().select("-user_pin"); // don’t return hashed pin
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//Get single user by ID
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select("-user_pin");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

//Update user
exports.updateUser = async (req, res) => {
    try {
        const { user_name, phoneNumber, user_pin } = req.body;
        let updateData = { user_name, phoneNumber };

        // If pin is provided, hash it again
        if (user_pin) {
            updateData.user_pin = await bcrypt.hash(user_pin, 10);
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).select("-user_pin");

        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User updated", user });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

//Delete user
exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
