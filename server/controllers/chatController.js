const { sendMessage, resetChat, deleteSession } = require('../services/geminiService');

/**
 * Handle chat message from user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        
        // Validate input
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ 
                error: 'Message is required and must be a non-empty string' 
            });
        }

        // Get session ID from request (could be from headers, cookies, or body)
        const sessionId = req.body.sessionId || req.headers['x-session-id'] || 'default';
        
        // Send message to Gemini and get response
        const aiResponse = await sendMessage(message, sessionId);
        
        res.json({ 
            response: aiResponse,
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in handleChat:', error);
        res.status(500).json({ 
            error: 'Failed to process message',
            details: error.message 
        });
    }
};

/**
 * Reset conversation for a session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleReset = (req, res) => {
    try {
        const sessionId = req.body.sessionId || req.headers['x-session-id'] || 'default';
        
        resetChat(sessionId);
        
        res.json({ 
            message: 'Conversation reset successfully',
            sessionId: sessionId,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in handleReset:', error);
        res.status(500).json({ 
            error: 'Failed to reset conversation',
            details: error.message 
        });
    }
};

/**
 * Delete a chat session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const handleDeleteSession = (req, res) => {
    try {
        const sessionId = req.body.sessionId || req.headers['x-session-id'];
        
        if (!sessionId || sessionId === 'default') {
            return res.status(400).json({ 
                error: 'Session ID is required and cannot be "default"' 
            });
        }
        
        const deleted = deleteSession(sessionId);
        
        if (deleted) {
            res.json({ 
                message: 'Session deleted successfully',
                sessionId: sessionId 
            });
        } else {
            res.status(404).json({ 
                error: 'Session not found',
                sessionId: sessionId 
            });
        }
    } catch (error) {
        console.error('Error in handleDeleteSession:', error);
        res.status(500).json({ 
            error: 'Failed to delete session',
            details: error.message 
        });
    }
};

/**
 * Health check endpoint
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const healthCheck = (req, res) => {
    res.json({ 
        status: 'ok',
        service: 'Money Market Funds Chatbot',
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    handleChat,
    handleReset,
    handleDeleteSession,
    healthCheck
};