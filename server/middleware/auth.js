const jwt = require("jsonwebtoken");

// Middleware to protect routes
exports.protect = (req, res, next) => {
    try{
        //Check token
        const auth = req.headers.authorization;
        if(!auth || !auth.startsWith("Bearer ")) return res.status(401).json({message: "No token given"});

        const token = auth.split(" ")[1]

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach decoded payload to request
        req.user = decoded;
        next();
    }catch(error){
        console.error("JWT Error:", error.message);
        if (error.name === "TokenExpiredError") {
            return res.status(403).json({ message: "Token expired" });
        }
        res.status(403).json({ message: "Invalid token" });
    }
}