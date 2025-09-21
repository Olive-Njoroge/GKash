const express = require("express");
const ConnectDB = require("./config/db")
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")
dotenv.config();
ConnectDB();

const app = express();

app.use("/api/users", userRoutes)
app.use("/api/auth", userRoutes)
app.listen(process.env.PORT, () => {
    console.log(`Port is live at http://localhost:${process.env.PORT}`)
})
