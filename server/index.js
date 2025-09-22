const express = require("express");
const ConnectDB = require("./config/db")
const dotenv = require("dotenv");
const userRoutes = require("./routes/userRoutes")
const authRoutes = require("./routes/authRoutes")
const swaggerUi = require("swagger-ui-express");
const Yaml = require("yamljs");

const swaggerDocument = Yaml.load("./swagger.yaml");

dotenv.config();
ConnectDB();

const app = express();
app.use(express.json());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api", userRoutes)
app.use("/api/auth", authRoutes)

app.listen(process.env.PORT, () => {
    console.log(`Port is live at http://localhost:${process.env.PORT}`)
})