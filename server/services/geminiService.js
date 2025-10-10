const dotenv = require("dotenv");
dotenv.config();

const { GoogleGenerativeAI } = require('@google/generative-ai');

console.log("API Key loaded:", process.env.GEMINI_API_KEY ? "✅ Yes" : "❌ No");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System instruction to limit responses to money market funds only
const SYSTEM_INSTRUCTION = `You are a specialized financial assistant that ONLY answers questions about money market funds. 

RESPONSE FORMAT RULES:
- Keep responses SHORT and CONCISE (maximum 2-3 sentences)
- Use simple, clear language that's easy to read
- Avoid long bullet points and detailed step-by-step lists
- Get straight to the point without unnecessary details
- If asked for steps, provide only 2-3 key points maximum

Your knowledge includes:
- What money market funds are and how they work
- Types of money market funds (government, prime, tax-exempt)
- Benefits and risks of money market funds
- Money market fund regulations and rules
- Yields, returns, and performance
- Comparison with other investment vehicles
- How to invest in money market funds
- Money market fund fees and expenses
- Liquidity and redemption processes
- NAV (Net Asset Value) and stability

If a user asks about ANY topic that is NOT directly related to money market funds, politely decline and redirect them back to money market fund topics. 

Example responses for off-topic questions:
- "I can only help with money market funds. What would you like to know about them?"
- "That's outside my expertise. I specialize in money market funds only."

Always be professional, helpful, and conversational when discussing money market fund topics, but keep it brief.`;

// Initialize the model with system instruction
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-exp",
    systemInstruction: SYSTEM_INSTRUCTION
});

// Store chat sessions per user/session
const chatSessions = new Map();

/**
 * Initialize a new chat session
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Object} Chat session object
 */
const initializeChat = (sessionId = 'default') => {
    const chatSession = model.startChat({
        history: [],
    });
    chatSessions.set(sessionId, chatSession);
    console.log(`✅ Chat session initialized for: ${sessionId}`);
    return chatSession;
};

/**
 * Get or create a chat session
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Object} Chat session object
 */
const getOrCreateSession = (sessionId = 'default') => {
    if (!chatSessions.has(sessionId)) {
        return initializeChat(sessionId);
    }
    return chatSessions.get(sessionId);
};

/**
 * Send a message and get response
 * @param {string} userMessage - The user's message
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Promise<string>} AI response text
 */
const sendMessage = async (userMessage, sessionId = 'default') => {
    try {
        const chatSession = getOrCreateSession(sessionId);

        console.log(`[${sessionId}] User message:`, userMessage);
        
        const result = await chatSession.sendMessage(userMessage);
        const response = await result.response;
        const text = response.text();
        
        console.log(`[${sessionId}] AI response:`, text);
        
        return text;
    } catch (error) {
        console.error(`❌ Error sending message for session ${sessionId}:`, error.message);
        throw error;
    }
};

/**
 * Reset a specific chat session
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Object} New chat session object
 */
const resetChat = (sessionId = 'default') => {
    chatSessions.delete(sessionId);
    console.log(`Chat session reset for: ${sessionId}`);
    return initializeChat(sessionId);
};

/**
 * Delete a chat session
 * @param {string} sessionId - Unique identifier for the session
 */
const deleteSession = (sessionId) => {
    const deleted = chatSessions.delete(sessionId);
    if (deleted) {
        console.log(`Chat session deleted: ${sessionId}`);
    }
    return deleted;
};

/**
 * Test the Gemini API connection
 * @returns {Promise<string>} Test response
 */
const testConnection = async () => {
    console.log("Starting connection test...");
    
    try {
        console.log("Sending test request to Gemini...");
        
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

// Test the connection on startup (optional - comment out in production)
testConnection().catch(err => console.error("Connection test failed:", err));

module.exports = {
    genAI,
    sendMessage,
    resetChat,
    initializeChat,
    deleteSession,
    testConnection,
    getOrCreateSession
};