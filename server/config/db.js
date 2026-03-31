const mongoose = require("mongoose");

const ConnectDB = async() => {
    try{
        console.log("Connecting to:", process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 10000,
        });
        console.log("MongoDB connected🥳");
    }catch(error){
        console.error("MongoDB connection Failed", error.message);
        process.exit(1);
    }
}

module.exports = ConnectDB;