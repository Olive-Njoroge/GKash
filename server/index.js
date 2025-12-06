// const express = require("express");
// const ConnectDB = require("./config/db");
// const dotenv = require("dotenv");

// const userRoutes = require("./routes/userRoutes");
// const authRoutes = require("./routes/authRoutes");
// const transactionRoutes = require("./routes/transactionRoutes");
// const accountRoutes = require("./routes/accountRoutes")
// const chatRoutes = require('./routes/chatRoutes')
// const verificationRoutes = require("./routes/verificationRoutes");
// const testRoutes = require("./routes/testRoutes");

// const swaggerUi = require("swagger-ui-express");
// const Yaml = require("yamljs");
// const cors = require("cors")

// const swaggerDocument = Yaml.load("./Swagger.yaml");

// dotenv.config();
// ConnectDB();

// const app = express();
// app.use(express.json());
// app.use(cors());

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// app.use("/api", userRoutes);
// app.use("/api/auth", authRoutes);
// app.use("/api", transactionRoutes);
// app.use("/api", accountRoutes);
// app.use("/api", chatRoutes);
// app.use("/api/verification", verificationRoutes);
// app.use("/api", testRoutes);
// // Payment routes merged into transaction routes for unified API

// app.listen(process.env.PORT, () => {
//     console.log(`Port is live at http://localhost:${process.env.PORT}`)
// })


const express = require("express");
const ConnectDB = require("./config/db");
const dotenv = require("dotenv");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const accountRoutes = require("./routes/accountRoutes");
const chatRoutes = require('./routes/chatRoutes');
const verificationRoutes = require("./routes/verificationRoutes");
// const testRoutes = require("./routes/testRoutes"); // REMOVED - file doesn't exist

const swaggerUi = require("swagger-ui-express");
const Yaml = require("yamljs");
const cors = require("cors");

const swaggerDocument = Yaml.load("./Swagger.yaml");

dotenv.config();
ConnectDB();

const app = express();
app.use(express.json());
app.use(cors());

// ============================================
// SWAGGER UI WITH AUTO TOKEN INJECTION
// ============================================

const customSwaggerHtml = (swaggerDoc) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GKash API Documentation</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.css">
  <style>
    .topbar { display: none; }
    .swagger-ui .info { margin-top: 20px; }
    @keyframes slideIn {
      from { transform: translateX(400px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(400px); opacity: 0; }
    }
    .swagger-ui .btn.authorize.locked {
      background-color: #4CAF50 !important;
      border-color: #4CAF50 !important;
    }
    .swagger-ui .opblock.authorized {
      border-color: #4CAF50 !important;
      background: rgba(76, 175, 80, 0.05);
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(swaggerDoc)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        plugins: [SwaggerUIBundle.plugins.DownloadUrl],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        requestInterceptor: (req) => { console.log('📤', req.method, req.url); return req; },
        responseInterceptor: (res) => {
          console.log('📥', res.status, res.url);
          try {
            let body;
            if (res.body) {
              body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
            } else {
              body = res.obj || res.data;
            }
            if (body && typeof body === 'object') {
              if (res.url.includes('/auth/register-with-id') && body.temp_token) {
                console.log('🔑 Temp token found');
                setTimeout(() => {
                  ui.authActions.authorize({
                    tempTokenAuth: { name: 'tempTokenAuth', schema: { type: 'http', scheme: 'bearer' }, value: body.temp_token }
                  });
                  showNotification('✅ Temp token set! Proceed to Step 2', 'success');
                }, 500);
              }
              if ((res.url.includes('/auth/create-pin') || res.url.includes('/auth/login')) && body.token) {
                console.log('🔑 Permanent token found');
                setTimeout(() => {
                  ui.authActions.authorize({
                    bearerAuth: { name: 'bearerAuth', schema: { type: 'http', scheme: 'bearer' }, value: body.token }
                  });
                  showNotification('✅ Permanent token set!', 'success');
                  if (body.user && body.user.user_nationalId) {
                    localStorage.setItem('nationalId', body.user.user_nationalId);
                  }
                }, 500);
              }
            }
          } catch (e) { console.error('Response parse error:', e); }
          return res;
        }
      });
      window.ui = ui;
      function showNotification(msg, type) {
        const n = document.createElement('div');
        n.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 25px;background:'+(type==='success'?'#4CAF50':'#2196F3')+';color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;font-family:sans-serif;font-size:14px;animation:slideIn 0.3s ease';
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(() => { n.style.animation = 'slideOut 0.3s ease'; setTimeout(() => n.remove(), 300); }, 5000);
      }
      setTimeout(() => {
        console.log('🚀 Auto Token Injection ENABLED');
        console.log('1️⃣ POST /auth/register-with-id → Temp token auto-set');
        console.log('2️⃣ POST /auth/add-phone → Already authorized');
        console.log('3️⃣ POST /auth/create-pin → Permanent token auto-set');
      }, 1000);
    };
  </script>
</body>
</html>`;
};

app.get('/api-docs', (req, res) => {
  res.send(customSwaggerHtml(swaggerDocument));
});

// Standard Swagger UI fallback
app.use('/api-docs-standard', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", transactionRoutes);
app.use("/api", accountRoutes);
app.use("/api", chatRoutes);
app.use("/api/verification", verificationRoutes);
// app.use("/api", testRoutes); // REMOVED - file doesn't exist

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "GKash API Server",
    status: "running",
    docs: "/api-docs",
    features: ["Auto Token Injection", "Multi-Currency", "AI Chatbot"]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`✨ Auto Token Injection: ENABLED\n`);
});