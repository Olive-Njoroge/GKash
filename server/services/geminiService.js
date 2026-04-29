const dotenv = require("dotenv");
dotenv.config();

const Groq = require('groq-sdk');
const kenyaFinanceKnowledgeBase = require('./kenyaFinanceKnowledgeBase');
const kenyaFinanceCybersecurity = require('./KenyaFinanceCybersecurity');

console.log("API Key loaded:", process.env.GROQ_API_KEY ? "✅ Yes" : "❌ No");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY
});

const SYSTEM_INSTRUCTION = `You are GKash Financial Advisor, Kenya's most knowledgeable AI financial expert specializing in the Kenyan financial market and digital financial safety.

🇰🇪 YOUR EXPERTISE COVERS:
- Money Market Funds (MMFs): CIC, Zimele, ICEA, Britam and others
- Stock Market: NSE listed companies, sectors, trading, blue-chips like Safaricom, Equity, KCB
- Banking: KCB, Equity, Co-op Bank, lending rates, deposit rates, mobile banking
- Government Securities: Treasury Bills, Treasury Bonds, Infrastructure Bonds
- Insurance: Life, General, Health insurance from Jubilee, Old Mutual, CIC
- Economic Indicators: GDP, inflation, interest rates, CBK policies
- Investment Strategies: Portfolio diversification, risk management for Kenyan market
- 🔐 Financial Cybersecurity: M-Pesa fraud, PIN safety, SIM swap, phishing, investment scams, CRB protection, digital banking safety specific to Kenya

RESPONSE STYLE:
- Keep responses CONCISE and PRACTICAL (2-4 sentences maximum for general queries)
- For scam/safety alerts, be direct, clear, and include a specific action step
- Use specific Kenyan examples, institutions, and hotlines where relevant
- Be conversational but professional
- Focus on actionable advice for Kenyan users

ALWAYS PRIORITIZE:
1. Safety warnings clearly labelled with ⚠️ when a user may be describing a scam in progress
2. Specific Kenyan reporting channels (Safaricom 100, DCI cybercrime line, CMA)
3. Current Kenyan market conditions and rates for investment queries
4. Practical steps for Kenyan investors and consumers
5. Risk warnings appropriate to Kenya's market

If a user describes a situation that sounds like an active scam, lead with a clear warning before anything else.

If asked about non-financial topics, politely redirect: "I specialize in Kenyan finance and financial safety. What can I help you with?"`;

const chatSessions = new Map();

// ─── FINANCIAL KNOWLEDGE BASE SEARCH ─────────────────────────────────────────

const searchFinanceKnowledgeBase = (query) => {
    const q = query.toLowerCase();
    const context = [];

    if (q.includes('mmf') || q.includes('money market') ||
        q.includes('cic') || q.includes('zimele') ||
        q.includes('icea') || q.includes('britam')) {
        context.push(`MONEY MARKET FUNDS IN KENYA:
${kenyaFinanceKnowledgeBase.mmfs.overview}

TOP MMFs: ${Object.entries(kenyaFinanceKnowledgeBase.mmfs.topFunds)
    .map(([, f]) => `${f.name}: ${f.currentYield} yield, Min: KES ${f.minimumInvestment}`)
    .join(', ')}

Regulation: ${kenyaFinanceKnowledgeBase.mmfs.regulations}`);
    }

    if (q.includes('stock') || q.includes('nse') || q.includes('shares') ||
        q.includes('safaricom') || q.includes('equity') || q.includes('kcb')) {
        context.push(`KENYAN STOCK MARKET (NSE):
${kenyaFinanceKnowledgeBase.stockMarket.overview}

TOP STOCKS: ${Object.entries(kenyaFinanceKnowledgeBase.stockMarket.topStocks)
    .map(([, s]) => `${s.symbol} (${s.sector}): ${s.description}`)
    .join(', ')}

Trading Hours: ${kenyaFinanceKnowledgeBase.stockMarket.tradingHours}`);
    }

    if (q.includes('bank') || q.includes('loan') || q.includes('deposit') ||
        q.includes('cbk') || q.includes('interest rate') || q.includes('mpesa')) {
        context.push(`KENYAN BANKING:
${kenyaFinanceKnowledgeBase.banking.overview}

CBK Rate: ${kenyaFinanceKnowledgeBase.banking.centralBankRate}
Lending Rates: ${kenyaFinanceKnowledgeBase.banking.lendingRates}
Deposit Rates: ${kenyaFinanceKnowledgeBase.banking.depositRates}

Mobile Money: ${kenyaFinanceKnowledgeBase.banking.mobileMoneyServices.mpesa}`);
    }

    if (q.includes('treasury') || q.includes('bond') || q.includes('bill') ||
        q.includes('government securities') || q.includes('t-bill')) {
        context.push(`GOVERNMENT SECURITIES:
Treasury Bills: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBills.description}
Current T-Bill Rates: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBills.currentRates}

Treasury Bonds: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBonds.description}
Current Bond Rates: ${kenyaFinanceKnowledgeBase.governmentSecurities.treasuryBonds.currentRates}`);
    }

    if (q.includes('insurance') || q.includes('cover') || q.includes('jubilee') ||
        q.includes('nhif') || q.includes('medical cover')) {
        context.push(`KENYAN INSURANCE:
${kenyaFinanceKnowledgeBase.insurance.overview}

Life Insurance Leaders: ${kenyaFinanceKnowledgeBase.insurance.lifeInsurance.leaders}
Health Insurance: NHIF (mandatory), Private: ${kenyaFinanceKnowledgeBase.insurance.healthInsurance.private}
Motor Insurance: ${kenyaFinanceKnowledgeBase.insurance.generalInsurance.motorInsurance}`);
    }

    if (q.includes('invest') || q.includes('portfolio') || q.includes('beginner') ||
        q.includes('how to') || q.includes('start')) {
        context.push(`INVESTMENT GUIDANCE:
Beginner: ${kenyaFinanceKnowledgeBase.investmentTips.beginner}
Intermediate: ${kenyaFinanceKnowledgeBase.investmentTips.intermediate}
Risk Management: ${kenyaFinanceKnowledgeBase.investmentTips.riskManagement}`);
    }

    return context;
};

// ─── CYBERSECURITY KNOWLEDGE BASE SEARCH ─────────────────────────────────────

const searchCyberSecurityKnowledgeBase = (query) => {
    const q = query.toLowerCase();
    const context = [];
    const cs = kenyaFinanceCybersecurity;

    // PIN / password / OTP safety
    if (q.includes('pin') || q.includes('password') || q.includes('otp') ||
        q.includes('secret') || q.includes('code') || q.includes('share')) {
        context.push(`PIN & PASSWORD SAFETY:
${cs.pinAndPasswordSafety.overview}

Key Rules: ${cs.pinAndPasswordSafety.rules.slice(0, 4).join(' | ')}

OTP Guidance: ${cs.pinAndPasswordSafety.otpGuidance}`);
    }

    // M-Pesa and mobile money fraud
    if (q.includes('mpesa') || q.includes('m-pesa') || q.includes('mobile money') ||
        q.includes('sent by mistake') || q.includes('wrong number') ||
        q.includes('refund') || q.includes('reversal')) {
        const scam = cs.mpesaFraudAndScams.commonScams.fakeMpesaMessages;
        context.push(`M-PESA FRAUD ALERT:
${cs.mpesaFraudAndScams.overview}

FAKE M-PESA SMS SCAM: ${scam.description}
Red Flags: ${scam.redFlags.join(' | ')}
Action: ${scam.action}

Reporting: Safaricom: ${cs.mpesaFraudAndScams.reportingChannels.safaricom}`);
    }

    // SIM swap
    if (q.includes('sim') || q.includes('sim swap') || q.includes('network') ||
        q.includes('no signal') || q.includes('lost network') || q.includes('line')) {
        const scam = cs.mpesaFraudAndScams.commonScams.simSwapFraud;
        context.push(`SIM SWAP FRAUD:
${scam.description}
Red Flags: ${scam.redFlags.join(' | ')}
Action: ${scam.action}
Prevention: ${scam.prevention}`);
    }

    // Fake loans / advance fee
    if (q.includes('loan') || q.includes('processing fee') || q.includes('advance fee') ||
        q.includes('no crb') || q.includes('quick loan') || q.includes('instant loan')) {
        const scam = cs.mpesaFraudAndScams.commonScams.loanScams;
        context.push(`FAKE LOAN SCAM WARNING:
${scam.description}
Red Flags: ${scam.redFlags.join(' | ')}
Action: ${scam.action}`);
    }

    // Investment scams / Ponzi
    if (q.includes('double') || q.includes('ponzi') || q.includes('pyramid') ||
        q.includes('guaranteed') || q.includes('high return') || q.includes('scheme') ||
        q.includes('whatsapp investment') || q.includes('forex') || q.includes('binary')) {
        const scam = cs.mpesaFraudAndScams.commonScams.investmentScams;
        context.push(`INVESTMENT SCAM ALERT:
${scam.description}
Red Flags: ${scam.redFlags.join(' | ')}
Action: ${scam.action}

CMA Reporting: ${cs.mpesaFraudAndScams.reportingChannels.cma}`);
    }

    // Impersonation calls
    if (q.includes('call') || q.includes('phone call') || q.includes('someone called') ||
        q.includes('they said') || q.includes('account suspended') || q.includes('safe account')) {
        const scam = cs.mpesaFraudAndScams.commonScams.phoneCall_impersonation;
        context.push(`IMPERSONATION CALL SCAM:
${scam.description}
Red Flags: ${scam.redFlags.join(' | ')}
Action: ${scam.action}`);
    }

    // Phishing links
    if (q.includes('link') || q.includes('click') || q.includes('sms link') ||
        q.includes('website') || q.includes('login') || q.includes('phishing')) {
        const scam = cs.mpesaFraudAndScams.commonScams.phishingLinks;
        context.push(`PHISHING LINK WARNING:
${scam.description}
Red Flags: ${scam.redFlags.join(' | ')}
Action: ${scam.action}

Fake Website Tip: ${cs.onlineShoppingSafety.fakeWebsites}`);
    }

    // Digital banking / app safety
    if (q.includes('banking app') || q.includes('internet banking') || q.includes('wifi') ||
        q.includes('public wifi') || q.includes('safe to use') || q.includes('app safe')) {
        context.push(`DIGITAL BANKING SAFETY:
${cs.digitalBankingSafety.overview}

Mobile App Safety: ${cs.digitalBankingSafety.mobileAppSafety.slice(0, 4).join(' | ')}

Public Wi-Fi Risk: ${cs.digitalBankingSafety.publicWifiRisks}

Device Security: ${cs.digitalBankingSafety.deviceSecurity.slice(0, 3).join(' | ')}`);
    }

    // CRB / credit protection
    if (q.includes('crb') || q.includes('credit') || q.includes('loan in my name') ||
        q.includes('identity') || q.includes('kra pin') || q.includes('id stolen')) {
        context.push(`CRB & CREDIT PROTECTION:
${cs.creditAndCRBSafety.overview}

Credit Protection: ${cs.creditAndCRBSafety.creditProtection.slice(0, 3).join(' | ')}

Mobile Loan Safety: ${cs.creditAndCRBSafety.mobileLoanSafety.slice(0, 2).join(' | ')}`);
    }

    // Online shopping / social media sellers
    if (q.includes('online shop') || q.includes('jumia') || q.includes('facebook') ||
        q.includes('buy online') || q.includes('seller') || q.includes('deposit')) {
        context.push(`ONLINE SHOPPING SAFETY:
${cs.onlineShoppingSafety.overview}

Best Practices: ${cs.onlineShoppingSafety.bestPractices.slice(0, 3).join(' | ')}`);
    }

    // Social engineering / general scam awareness
    if (q.includes('scam') || q.includes('fraud') || q.includes('fake') ||
        q.includes('suspicious') || q.includes('too good') || q.includes('trust') ||
        q.includes('won') || q.includes('prize') || q.includes('lottery')) {
        context.push(`SOCIAL ENGINEERING & SCAM AWARENESS:
${cs.socialEngineeringDefence.overview}

Common Tactics:
- Urgency: ${cs.socialEngineeringDefence.tactics.urgency}
- Authority: ${cs.socialEngineeringDefence.tactics.authority}
- Lottery: ${cs.socialEngineeringDefence.tactics.lottery}

Golden Rules: ${cs.socialEngineeringDefence.goldenRules.join(' | ')}

Reporting Channels: Safaricom 100 | DCI Cybercrime: ${cs.mpesaFraudAndScams.reportingChannels.police} | CMA: ${cs.mpesaFraudAndScams.reportingChannels.cma}`);
    }

    // Regulatory / legal context
    if (q.includes('report') || q.includes('legal') || q.includes('law') ||
        q.includes('authority') || q.includes('cbk') || q.includes('cma') ||
        q.includes('where do i report')) {
        context.push(`REPORTING & REGULATORY BODIES:
${cs.regulatoryAndLegalContext.overview}

Reporting Channels:
- Safaricom fraud: ${cs.mpesaFraudAndScams.reportingChannels.safaricom}
- KCB fraud: ${cs.mpesaFraudAndScams.reportingChannels.kcb}
- Equity fraud: ${cs.mpesaFraudAndScams.reportingChannels.equityBank}
- DCI Cybercrime: ${cs.mpesaFraudAndScams.reportingChannels.police}
- CMA (investment fraud): ${cs.mpesaFraudAndScams.reportingChannels.cma}
- CBK (unlicensed services): ${cs.mpesaFraudAndScams.reportingChannels.cbk}

Key Laws: ${cs.regulatoryAndLegalContext.laws.slice(0, 2).join(' | ')}`);
    }

    return context;
};

// ─── COMBINED SEARCH ──────────────────────────────────────────────────────────

/**
 * Search both knowledge bases and combine relevant context.
 * @param {string} query
 * @returns {string}
 */
const searchKnowledgeBase = (query) => {
    const financeContext = searchFinanceKnowledgeBase(query);
    const cyberContext = searchCyberSecurityKnowledgeBase(query);
    const combined = [...financeContext, ...cyberContext];
    return combined.length > 0 ? combined.join('\n\n') : '';
};

// ─── SESSION MANAGEMENT ───────────────────────────────────────────────────────

const initializeChat = (sessionId = 'default') => {
    const chatHistory = [{ role: "system", content: SYSTEM_INSTRUCTION }];
    chatSessions.set(sessionId, chatHistory);
    console.log(`✅ Chat session initialized for: ${sessionId}`);
    return chatHistory;
};

const getOrCreateSession = (sessionId = 'default') => {
    if (!chatSessions.has(sessionId)) return initializeChat(sessionId);
    return chatSessions.get(sessionId);
};

// ─── CORE MESSAGING ───────────────────────────────────────────────────────────

const sendMessage = async (userMessage, sessionId = 'default') => {
    try {
        const chatHistory = getOrCreateSession(sessionId);
        console.log(`[${sessionId}] User message:`, userMessage);

        const relevantContext = searchKnowledgeBase(userMessage);

        let enhancedMessage = userMessage;
        if (relevantContext) {
            enhancedMessage = `Context from Kenya Financial & Safety Database:
${relevantContext}

User Question: ${userMessage}

Please answer the user's question using the provided context. If the context contains a scam warning relevant to their question, lead with a clear ⚠️ warning. Keep responses concise and practical.`;
            console.log(`[${sessionId}] RAG Context added:`, relevantContext.substring(0, 200) + '...');
        }

        chatHistory.push({ role: "user", content: enhancedMessage });

        const completion = await groq.chat.completions.create({
            messages: chatHistory,
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const responseText = completion.choices[0].message.content;
        chatHistory.push({ role: "assistant", content: responseText });
        console.log(`[${sessionId}] AI response:`, responseText);

        return responseText;
    } catch (error) {
        console.error(`❌ Error sending message for session ${sessionId}:`, error.message);
        throw error;
    }
};

const getFinancialAdvice = async (query, userProfile = {}) => {
    try {
        const context = searchKnowledgeBase(query);

        let enhancedQuery = `Financial Query: ${query}`;
        if (userProfile.riskTolerance) enhancedQuery += `\nRisk Tolerance: ${userProfile.riskTolerance}`;
        if (userProfile.investmentAmount) enhancedQuery += `\nInvestment Amount: KES ${userProfile.investmentAmount}`;
        if (userProfile.timeHorizon) enhancedQuery += `\nTime Horizon: ${userProfile.timeHorizon}`;

        if (context) {
            enhancedQuery = `Kenyan Financial & Safety Market Context:\n${context}\n\n${enhancedQuery}\n\nProvide specific, actionable advice for the Kenyan market. Include a safety warning if the query relates to a potential scam.`;
        }

        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_INSTRUCTION },
                { role: "user", content: enhancedQuery }
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

// ─── SESSION UTILITIES ────────────────────────────────────────────────────────

const resetChat = (sessionId = 'default') => {
    chatSessions.delete(sessionId);
    console.log(`Chat session reset for: ${sessionId}`);
    return initializeChat(sessionId);
};

const deleteSession = (sessionId) => {
    const deleted = chatSessions.delete(sessionId);
    if (deleted) console.log(`Chat session deleted: ${sessionId}`);
    return deleted;
};

const testConnection = async () => {
    console.log("Starting Groq connection test...");
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: SYSTEM_INSTRUCTION },
                { role: "user", content: "What should I do if someone asks for my M-Pesa PIN?" }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 512,
        });
        const text = completion.choices[0].message.content;
        console.log("✅ Groq API Connection Successful!\nResponse:", text);
        return text;
    } catch (error) {
        console.error("❌ Groq API Connection Failed:", error.message);
        throw error;
    }
};

module.exports = {
    groq,
    sendMessage,
    getFinancialAdvice,
    resetChat,
    initializeChat,
    deleteSession,
    testConnection,
    getOrCreateSession,
    searchKnowledgeBase,
    searchCyberSecurityKnowledgeBase,
};