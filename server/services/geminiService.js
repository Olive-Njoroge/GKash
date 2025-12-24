const dotenv = require("dotenv");
dotenv.config();

const Groq = require('groq-sdk');
const kenyaFinanceKnowledgeBase = require('./kenyaFinanceKnowledgeBase');

console.log("API Key loaded:", process.env.GROQ_API_KEY ? "✅ Yes" : "❌ No");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

// Enhanced system instruction for comprehensive Kenyan finance expertise
const SYSTEM_INSTRUCTION = `You are GKash Financial Advisor, Kenya's most knowledgeable AI financial expert specializing in the Kenyan financial market.

🇰🇪 YOUR EXPERTISE COVERS:
- Money Market Funds (MMFs): CIC, Zimele, ICEA, Britam and others
- Stock Market: NSE listed companies, sectors, trading, blue-chips like Safaricom, Equity, KCB
- Banking: KCB, Equity, Co-op Bank, lending rates, deposit rates, mobile banking
- Government Securities: Treasury Bills, Treasury Bonds, Infrastructure Bonds
- Insurance: Life, General, Health insurance from Jubilee, Old Mutual, CIC
- Economic Indicators: GDP, inflation, interest rates, CBK policies
- Investment Strategies: Portfolio diversification, risk management for Kenyan market

RESPONSE STYLE:
- Keep responses CONCISE and PRACTICAL (2-4 sentences maximum)
- Use specific Kenyan examples and current market data when available
- Mention actual company names, rates, and figures from Kenya
- Be conversational but professional
- Focus on actionable advice for Kenyan investors

ALWAYS PRIORITIZE:
1. Current Kenyan market conditions and rates
2. Specific product recommendations with real names
3. Practical steps for Kenyan investors
4. Risk warnings appropriate to Kenya's market

If asked about non-financial topics, politely redirect: "I specialize in Kenyan finance and investments. What financial topic can I help you with?"

Remember: You're helping Kenyan investors make informed decisions about their money in the local market.`;

// Store chat sessions per user/session
const chatSessions = new Map();

/**
 * RAG: Search knowledge base for relevant context
 * @param {string} query - User's question
 * @returns {string} Relevant context from knowledge base
 */
const searchKnowledgeBase = (query) => {
    const lowerQuery = query.toLowerCase();
    let relevantContext = [];

    // Search for Money Market Funds context
    if (lowerQuery.includes('mmf') || lowerQuery.includes('money market') || 
        lowerQuery.includes('cic') || lowerQuery.includes('zimele') || 
        lowerQuery.includes('icea') || lowerQuery.includes('britam')) {
        
        relevantContext.push(`MONEY MARKET FUNDS IN KENYA:
        ${kenyaFinanceKnowledgeBase.mmfs.overview}
        
        TOP MMFs: ${Object.entries(kenyaFinanceKnowledgeBase.mmfs.topFunds)
            .map(([key, fund]) => `${fund.name}: ${fund.currentYield} yield, Min: KES ${fund.minimumInvestment}`)
            .join(', ')}
        
        Regulation: ${kenyaFinanceKnowledgeBase.mmfs.regulations}`);
    }

    // Search for Stock Market context
    if (lowerQuery.includes('stock') || lowerQuery.includes('nse') || lowerQuery.includes('shares') ||
        lowerQuery.includes('safaricom') || lowerQuery.includes('equity') || lowerQuery.includes('kcb')) {
        
        relevantContext.push(`KENYAN STOCK MARKET (NSE):
        ${kenyaFinanceKnowledgeBase.stockMarket.overview}
        
        TOP STOCKS: ${Object.entries(kenyaFinanceKnowledgeBase.stockMarket.topStocks)
            .map(([key, stock]) => `${stock.symbol} (${stock.sector}): ${stock.description}`)
            .join(', ')}
        
        Trading Hours: ${kenyaFinanceKnowledgeBase.stockMarket.tradingHours}`);
    }

    // Search for Banking context
    if (lowerQuery.includes('bank') || lowerQuery.includes('loan') || lowerQuery.includes('deposit') ||
        lowerQuery.includes('cbk') || lowerQuery.includes('interest rate') || lowerQuery.includes('mpesa')) {
        
        relevantContext.push(`KENYAN BANKING:
        ${kenyaFinanceKnowledgeBase.banking.overview}
        
        CBK Rate: ${kenyaFinanceKnowledgeBase.banking.centralBankRate}
        Lending Rates: ${kenyaFinanceKnowledgeBase.banking.lendingRates}
        Deposit Rates: ${kenyaFinanceKnowledgeBase.banking.depositRates}
        
        Mobile Money: ${kenyaFinanceKnowledgeBase.banking.mobileMoneyServices.mpesa}`);
    }

    // Search for Government Securities context
    if (lowerQuery.includes('treasury') || lowerQuery.includes('bond') || lowerQuery.includes('bill') ||
        lowerQuery.includes('government securities') || lowerQuery.includes('t-bill')) {
        
        relevantContext.push(`GOVERNMENT SECURITIES:
        Treasury Bills: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBills.description}
        Current T-Bill Rates: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBills.currentRates}
        
        Treasury Bonds: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBonds.description}
        Current Bond Rates: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBonds.currentRates}`);
    }

    // Search for Insurance context
    if (lowerQuery.includes('insurance') || lowerQuery.includes('cover') || lowerQuery.includes('jubilee') ||
        lowerQuery.includes('nhif') || lowerQuery.includes('medical cover')) {
        
        relevantContext.push(`KENYAN INSURANCE:
        ${kenyaFinanceKnowledgeBase.insurance.overview}
        
        Life Insurance Leaders: ${kenyaFinanceKnowledgeBase.insurance.lifeInsurance.leaders}
        Health Insurance: NHIF (mandatory), Private options: ${kenyaFinanceKnowledgeBase.insurance.healthInsurance.private}
        Motor Insurance: ${kenyaFinanceKnowledgeBase.insurance.generalInsurance.motorInsurance}`);
    }

    // Search for Investment Tips
    if (lowerQuery.includes('invest') || lowerQuery.includes('portfolio') || lowerQuery.includes('beginner') ||
        lowerQuery.includes('how to') || lowerQuery.includes('start')) {
        
        relevantContext.push(`INVESTMENT GUIDANCE:
        Beginner: ${kenyaFinanceKnowledgeBase.investmentTips.beginner}
        Intermediate: ${kenyaFinanceKnowledgeBase.investmentTips.intermediate}
        Risk Management: ${kenyaFinanceKnowledgeBase.investmentTips.riskManagement}`);
    }

    return relevantContext.length > 0 ? relevantContext.join('\n\n') : '';
};

/**
 * Initialize a new chat session
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Array} Chat history array
 */
const initializeChat = (sessionId = 'default') => {
    const chatHistory = [
        {
            role: "system",
            content: SYSTEM_INSTRUCTION
        }
    ];
    chatSessions.set(sessionId, chatHistory);
    console.log(`✅ Chat session initialized for: ${sessionId}`);
    return chatHistory;
};

/**
 * Get or create a chat session
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Array} Chat history array
 */
const getOrCreateSession = (sessionId = 'default') => {
    if (!chatSessions.has(sessionId)) {
        return initializeChat(sessionId);
    }
    return chatSessions.get(sessionId);
};

/**
 * Send a message and get response with RAG enhancement
 * @param {string} userMessage - The user's message
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Promise<string>} AI response text
 */
const sendMessage = async (userMessage, sessionId = 'default') => {
    try {
        const chatHistory = getOrCreateSession(sessionId);

        console.log(`[${sessionId}] User message:`, userMessage);
        
        // RAG: Search knowledge base for relevant context
        const relevantContext = searchKnowledgeBase(userMessage);
        
        // Enhance user message with context if found
        let enhancedMessage = userMessage;
        if (relevantContext) {
            enhancedMessage = `Context from Kenya Financial Database:
${relevantContext}

User Question: ${userMessage}

Please answer the user's question using the provided context about the Kenyan financial market. Keep your response concise and practical.`;
            
            console.log(`[${sessionId}] RAG Context added:`, relevantContext.substring(0, 200) + '...');
        }
        
        // Add user message to history
        chatHistory.push({
            role: "user",
            content: enhancedMessage
        });
        
        // Get response from Groq
        const completion = await groq.chat.completions.create({
            messages: chatHistory,
            model: "llama-3.3-70b-versatile", // Best general-purpose model
            temperature: 0.7,
            max_tokens: 1024,
        });
        
        const responseText = completion.choices[0].message.content;
        
        // Add assistant response to history
        chatHistory.push({
            role: "assistant",
            content: responseText
        });
        
        console.log(`[${sessionId}] AI response:`, responseText);
        
        return responseText;
    } catch (error) {
        console.error(`❌ Error sending message for session ${sessionId}:`, error.message);
        throw error;
    }
};

/**
 * Get specialized financial advice for Kenyan market
 * @param {string} query - Financial query
 * @param {Object} userProfile - User's financial profile (optional)
 * @returns {Promise<string>} Tailored financial advice
 */
const getFinancialAdvice = async (query, userProfile = {}) => {
    try {
        // Get relevant context
        const context = searchKnowledgeBase(query);
        
        // Build enhanced query with user profile
        let enhancedQuery = `Financial Query: ${query}`;
        
        if (userProfile.riskTolerance) {
            enhancedQuery += `\nRisk Tolerance: ${userProfile.riskTolerance}`;
        }
        if (userProfile.investmentAmount) {
            enhancedQuery += `\nInvestment Amount: KES ${userProfile.investmentAmount}`;
        }
        if (userProfile.timeHorizon) {
            enhancedQuery += `\nTime Horizon: ${userProfile.timeHorizon}`;
        }
        
        if (context) {
            enhancedQuery = `Kenyan Financial Market Context:
${context}

${enhancedQuery}

Please provide specific, actionable advice for the Kenyan market using current rates and products mentioned in the context.`;
        }
        
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: SYSTEM_INSTRUCTION
                },
                {
                    role: "user",
                    content: enhancedQuery
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });
        
        const advice = completion.choices[0].message.content;
        
        console.log('💡 Financial advice generated for:', query);
        return advice;
        
    } catch (error) {
        console.error('❌ Error generating financial advice:', error.message);
        throw error;
    }
};

/**
 * Reset a specific chat session
 * @param {string} sessionId - Unique identifier for the session
 * @returns {Array} New chat history array
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
 * Test the Groq API connection
 * @returns {Promise<string>} Test response
 */
const testConnection = async () => {
    console.log("Starting Groq connection test...");
    
    try {
        console.log("Sending test request to Groq...");
        
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: SYSTEM_INSTRUCTION
                },
                {
                    role: "user",
                    content: "What are money market funds? Give a brief answer."
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 512,
        });
        
        const text = completion.choices[0].message.content;
        
        console.log("✅ Groq API Connection Successful!");
        console.log("\nResponse:", text);
        console.log("\nModel used:", completion.model);
        console.log("Tokens used:", completion.usage);
        
        return text;
    } catch (error) {
        console.error("❌ Groq API Connection Failed:", error.message);
        console.error("Full error:", error);
        throw error;
    }
};

// Uncomment to test connection on startup
// testConnection().catch(err => console.error("Connection test failed:", err));

module.exports = {
    groq,
    sendMessage,
    getFinancialAdvice,
    resetChat,
    initializeChat,
    deleteSession,
    testConnection,
    getOrCreateSession,
    searchKnowledgeBase
};