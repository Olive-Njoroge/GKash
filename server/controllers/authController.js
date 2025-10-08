const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/users");

// Step 1: Initial user registration (without PIN)
exports.registerUser = async(req, res) => {
    try{
        const {user_name, user_nationalId, phoneNumber} = req.body;
        const exist = await User.findOne({user_nationalId});
        if(exist){
            return res.status(400).json({message: "User already exists"});
        }
        
        // Create user without PIN
        const user = await User.create({
            user_name, 
            user_nationalId, 
            phoneNumber,
            pin_set: false
        });

        // Create temporary token for PIN setup
        const temp_token = jwt.sign(
            {id: user._id, step: 'pin_setup'}, 
            process.env.JWT_SECRET, 
            { expiresIn: "15m" }
        );
        
        await User.findByIdAndUpdate(user._id, {temp_token});

        res.status(201).json({
            message: "User registered. Please set your PIN", 
            temp_token,
            user_id: user._id
        });
    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}

// Step 2: Create PIN
exports.createPin = async(req, res) => {
    try{
        const {user_pin} = req.body;
        const userId = req.userId; // From temp token middleware
        
        if(!user_pin || user_pin.length !== 4) {
            return res.status(400).json({message: "PIN must be 4 digits"});
        }

        const hashed = await bcrypt.hash(user_pin, 10);
        
        await User.findByIdAndUpdate(userId, {
            user_pin: hashed,
            pin_set: true,
            temp_token: null
        });

        // Create final token
        const token = jwt.sign({id: userId}, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        const user = await User.findById(userId).select("-user_pin -temp_token");
        
        res.status(200).json({
            message: "PIN created successfully", 
            token, 
            user
        });
    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}

// Modified login to check PIN status
exports.login = async(req, res) => {
    try{
        const {user_pin, user_nationalId} = req.body;
        const user = await User.findOne({user_nationalId});
        
        if(!user){
            return res.status(404).json({message: "Invalid credentials"});
        }
        
        // Check if PIN is set
        if(!user.pin_set || !user.user_pin){
            return res.status(400).json({message: "Please complete your registration by setting a PIN"});
        }
        
        const match = await bcrypt.compare(user_pin, user.user_pin);
        if(!match) return res.status(401).json({message: "Invalid credentials"});
        
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, { expiresIn: "1d" });
        res.status(200).json({
            message: "Login successful", 
            token, 
            user: {
                user_nationalId: user.user_nationalId, 
                user_name: user.user_name, 
                phoneNumber: user.phoneNumber
            }
        });
    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}