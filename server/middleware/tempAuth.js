// middleware/tempAuth.js
const jwt = require("jsonwebtoken");
exports.verifyTempToken = (req, res, next) => {
    try{
        const auth = req.headers.authorization;
        if(!auth || !auth.startsWith("Bearer ")) {
            return res.status(401).json({message: "No temp token provided"});
        }

        const token = auth.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        if(!['pin_setup', 'complete_registration'].includes(decoded.step)) {
            return res.status(403).json({message: "Invalid token type"});
        }
        
        req.userId = decoded.id;
        req.step = decoded.step;  // Pass the step to the controller
        next();
    }catch(error){
        res.status(403).json({ message: "Invalid temp token" });
    }
}