const mongoose = require("mongoose");

const ConnectDB = async() => {
    try{
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected🥳");
    }catch(error){
        console.error("MongoDB connection Failed", error.message);
        process.exit(1);
    }
}

module.exports = ConnectDB;