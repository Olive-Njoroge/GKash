const express = require('express');
const router = express.Router();
const { 
    handleChat, 
    handleFinancialAdvice,
    handleReset, 
    handleDeleteSession,
    healthCheck 
} = require('../controllers/chatController');

/**
 * @route   POST /api/chatbot/chat
 * @desc    Send a message to the chatbot
 * @access  Public
 * @body    { message: string, sessionId?: string }
 */
router.post('/chatbot/chat', handleChat);

/**
 * @route   POST /api/chatbot/financial-advice
 * @desc    Get specialized financial advice for Kenyan market
 * @access  Public
 * @body    { query: string, userProfile?: { riskTolerance: string, investmentAmount: number, timeHorizon: string } }
 */
router.post('/chatbot/financial-advice', handleFinancialAdvice);

/**
 * @route   POST /api/chatbot/reset
 * @desc    Reset the conversation for a session
 * @access  Public
 * @body    { sessionId?: string }
 */
router.post('/chatbot/reset', handleReset);

/**
 * @route   DELETE /api/chatbot/session
 * @desc    Delete a specific chat session
 * @access  Public
 * @body    { sessionId: string }
 */
router.delete('/chatbot/session', handleDeleteSession);

/**
 * @route   GET /api/chatbot/health
 * @desc    Health check endpoint
 * @access  Public
 */
router.get('/chatbot/health', healthCheck);

module.exports = router;