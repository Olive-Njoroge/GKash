const express = require("express");
const ConnectDB = require("./config/db");
const dotenv = require("dotenv");
const path = require("path");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const accountRoutes = require("./routes/accountRoutes");
const chatRoutes = require('./routes/chatRoutes');
const verificationRoutes = require("./routes/verificationRoutes");

const swaggerUi = require("swagger-ui-express");
const Yaml = require("yamljs");
const cors = require("cors");

dotenv.config();
ConnectDB();

const app = express();
app.use(express.json());
app.use(cors());

// ============================================
// SWAGGER DOCUMENT LOADING WITH ERROR HANDLING
// ============================================

let swaggerDocument;
try {
  const swaggerPath = path.join(__dirname, "Swagger.yaml");
  console.log("📄 Loading Swagger from:", swaggerPath);
  swaggerDocument = Yaml.load(swaggerPath);
  console.log("✅ Swagger document loaded successfully");
} catch (error) {
  console.error("❌ Error loading Swagger.yaml:", error.message);
  // Fallback minimal swagger document
  swaggerDocument = {
    openapi: "3.0.0",
    info: {
      title: "GKash API",
      version: "3.0.0",
      description: "API Documentation"
    },
    servers: [
      {
        url: "http://localhost:3000/api",
        description: "Development server"
      }
    ],
    paths: {}
  };
}

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
        requestInterceptor: (req) => { 
          console.log('📤', req.method, req.url); 
          return req; 
        },
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
              // Auto-inject token from register/login responses
              if ((res.url.includes('/auth/register') || res.url.includes('/auth/login')) && body.token) {
                console.log('🔑 Token found, auto-setting authorization');
                setTimeout(() => {
                  ui.authActions.authorize({
                    bearerAuth: { 
                      name: 'bearerAuth', 
                      schema: { type: 'http', scheme: 'bearer' }, 
                      value: body.token 
                    }
                  });
                  showNotification('✅ Token auto-set! You are now authorized', 'success');
                }, 500);
              }
            }
          } catch (e) { 
            console.error('Response parse error:', e); 
          }
          return res;
        }
      });
      window.ui = ui;
      
      function showNotification(msg, type) {
        const n = document.createElement('div');
        n.style.cssText = 'position:fixed;top:20px;right:20px;padding:15px 25px;background:'+(type==='success'?'#4CAF50':'#2196F3')+';color:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);z-index:9999;font-family:sans-serif;font-size:14px;animation:slideIn 0.3s ease';
        n.textContent = msg;
        document.body.appendChild(n);
        setTimeout(() => { 
          n.style.animation = 'slideOut 0.3s ease'; 
          setTimeout(() => n.remove(), 300); 
        }, 5000);
      }
      
      setTimeout(() => {
        console.log('🚀 Auto Token Injection ENABLED');
        console.log('✅ Register or Login to automatically set authorization token');
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

// ============================================
// API ROUTES
// ============================================

app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", accountRoutes);
app.use("/api", chatRoutes);
app.use("/api/verification", verificationRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "GKash API Server",
    status: "running",
    docs: "/api-docs",
    features: ["Auto Token Injection", "Multi-Currency", "AI Chatbot"]
  });
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`✨ Auto Token Injection: ENABLED\n`);
});