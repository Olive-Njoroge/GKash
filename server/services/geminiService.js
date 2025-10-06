const dotenv = require("dotenv");
dotenv.config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log("API Key loaded:", process.env.GEMINI_API_KEY ? "✅ Yes" : "❌ No");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const testConnection = async () => {
    console.log("Starting connection test...");
    
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        
        console.log("Sending request to Gemini...");
        
        const result = await model.generateContent(
            "What are money market funds? Give a brief answer."
        );
        
        const response = await result.response;
        const text = response.text();
        
        console.log("✅ Gemini API Connection Successful!");
        console.log("\nResponse:", text);
        
        return text;
    } catch (error) {
        console.error("❌ Gemini API Connection Failed:", error.message);
        console.error("Full error:", error);
        throw error;
    }
};

// Test the connection
testConnection();

module.exports = genAI;