// middleware/tempAuth.js
const jwt = require("jsonwebtoken");

exports.verifyTempToken = (req, res, next) => {
    try {
        const auth = req.headers.authorization;
        
        if (!auth || !auth.startsWith("Bearer ")) {
            console.error('❌ No authorization header or invalid format');
            return res.status(401).json({
                success: false,
                message: "No temp token provided"
            });
        }

        const token = auth.split(" ")[1];
        
        if (!token) {
            console.error('❌ Token extraction failed');
            return res.status(401).json({
                success: false,
                message: "Token missing from header"
            });
        }

        console.log('🔍 Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token decoded:', { id: decoded.id, step: decoded.step });
        
        if (!['pin_setup', 'complete_registration'].includes(decoded.step)) {
            console.error('❌ Invalid step:', decoded.step);
            return res.status(403).json({
                success: false,
                message: "Invalid token type",
                expectedSteps: ['pin_setup', 'complete_registration'],
                receivedStep: decoded.step
            });
        }
        
        req.userId = decoded.id;
        req.step = decoded.step;
        console.log('✅ Temp token verified for user:', decoded.id);
        next();
        
    } catch (error) {
        console.error('❌ Temp token verification error:', error.message);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({
                success: false,
                message: "Temp token has expired. Please start registration again."
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: "Invalid temp token format"
            });
        }
        
        res.status(403).json({
            success: false,
            message: "Invalid temp token",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}