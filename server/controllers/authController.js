const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/Users");


//Signup
exports.signup = async(req, res) => {
    try{
        const {user_name, user_nationalId, user_pin, phoneNumber} = req.body;
        const exist = await User.findOne({user_nationalId});
        if(exist){
            return res.status(400).json({message: "User already exists"});
        }else{
            //HASH pin
            const hashed = await bcrypt.hash(user_pin, 10)
            //save hashed pin to db
            const user = await User.create({user_name, user_nationalId, user_pin: hashed, phoneNumber})

            //Token
            const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, { expiresIn: "1d" });
            res.status(201).json({message: "signup successful", token, user: {id: user._id, user_name: user.user_name, phoneNumber: user.phoneNumber}});
        }
    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
}


//Login
exports.login = async(req, res) => {
    try{
        const {user_pin, user_nationalId} = req.body
        const user = await User.findOne({user_nationalId});
        if(!user){
            return res.status(404).json({message: "User does not exist"});
        }else{
            //Compare the password they give and the one in the db
            const match = await bcrypt.compare(user_pin, user.user_pin);
            if(!match) return res.status(401).json({message: "Incorrect Pin"});
            const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, { expiresIn: "1d" });
            res.status(200).json({message: "Login successful", token, user: {id: user._id, user_name: user.user_name, phoneNumber: user.phoneNumber}});
        }
    }catch(error){
        console.error(error);
        res.status(500).json({ message: "Server error" });

    }
}