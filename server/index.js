const express = require("express");
const ConnectDB = require("./config/db");
const dotenv = require("dotenv");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const accountRoutes = require("./routes/accountRoutes")

const swaggerUi = require("swagger-ui-express");
const Yaml = require("yamljs");
const cors = require("cors")

const swaggerDocument = Yaml.load("./Swagger.yaml");

dotenv.config();
ConnectDB();

const app = express();
app.use(express.json());
app.use(cors());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", transactionRoutes);
app.use("/api", accountRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Port is live at http://localhost:${process.env.PORT}`)
})