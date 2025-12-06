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
const testRoutes = require("./routes/testRoutes");

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
// 🔑 FIXED AUTO TOKEN INJECTION FOR SWAGGER UI
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
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        docExpansion: 'list',
        filter: true,
        requestInterceptor: (request) => {
          console.log('📤 Request:', request.method, request.url);
          return request;
        },
        responseInterceptor: (response) => {
          console.log('📥 Response:', response.status, response.url);
          
          try {
            // Extract response body safely
            let responseBody;
            
            if (response.body) {
              try {
                responseBody = JSON.parse(response.body);
              } catch (e) {
                responseBody = response.body;
              }
            } else if (response.obj) {
              responseBody = response.obj;
            } else if (response.data) {
              responseBody = response.data;
            }
            
            if (responseBody && typeof responseBody === 'object') {
              // AUTO-SET TEMP TOKEN from /auth/register-with-id
              if (response.url.includes('/auth/register-with-id') && responseBody.temp_token) {
                console.log('🔑 Found temp_token:', responseBody.temp_token.substring(0, 20) + '...');
                
                setTimeout(() => {
                  ui.authActions.authorize({
                    tempTokenAuth: { 
                      name: 'tempTokenAuth',
                      schema: { type: 'http', scheme: 'bearer' },
                      value: responseBody.temp_token 
                    }
                  });
                  showNotification('✅ Temp token automatically set! Proceed to Step 2', 'success');
                }, 500);
              }
              
              // AUTO-SET PERMANENT TOKEN from /auth/create-pin or /auth/login
              if ((response.url.includes('/auth/create-pin') || response.url.includes('/auth/login')) && responseBody.token) {
                console.log('🔑 Found permanent token:', responseBody.token.substring(0, 20) + '...');
                
                setTimeout(() => {
                  ui.authActions.authorize({
                    bearerAuth: { 
                      name: 'bearerAuth',
                      schema: { type: 'http', scheme: 'bearer' },
                      value: responseBody.token 
                    }
                  });
                  showNotification('✅ Permanent token automatically set! All endpoints ready', 'success');
                  
                  if (responseBody.user && responseBody.user.user_nationalId) {
                    localStorage.setItem('nationalId', responseBody.user.user_nationalId);
                    console.log('💾 National ID saved:', responseBody.user.user_nationalId);
                  }
                }, 500);
              }
            }
          } catch (error) {
            console.error('Error processing response:', error);
          }
          
          return response;
        }
      });

      window.ui = ui;
      
      // Notification helper
      function showNotification(message, type) {
        const notif = document.createElement('div');
        notif.style.cssText = 
          'position: fixed; top: 20px; right: 20px; padding: 15px 25px; ' +
          'background: ' + (type === 'success' ? '#4CAF50' : '#2196F3') + '; ' +
          'color: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); ' +
          'z-index: 9999; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; ' +
          'font-size: 14px; font-weight: 500; animation: slideIn 0.3s ease; max-width: 350px;';
        notif.textContent = message;
        document.body.appendChild(notif);
        
        setTimeout(() => {
          notif.style.animation = 'slideOut 0.3s ease';
          setTimeout(() => notif.remove(), 300);
        }, 5000);
      }
      
      setTimeout(() => {
        console.log('🚀 GKash API - Auto Token Injection ENABLED');
        console.log('📋 Registration Flow:');
        console.log('   1️⃣  POST /auth/register-with-id → Temp token auto-set ✅');
        console.log('   2️⃣  POST /auth/add-phone → Already authorized ✅');
        console.log('   3️⃣  POST /auth/create-pin → Permanent token auto-set ✅');
        console.log('💡 Watch for green notifications when tokens are set!');
      }, 1000);
    };
  </script>
</body>
</html>
  `;
};

// Serve custom Swagger UI
app.get('/api-docs', (req, res) => {
  res.send(customSwaggerHtml(swaggerDocument));
});

// API Routes
app.use("/api", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api", transactionRoutes);
app.use("/api", accountRoutes);
app.use("/api", chatRoutes);
app.use("/api/verification", verificationRoutes);
app.use("/api", testRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({
    message: "GKash API Server",
    status: "running",
    docs: "/api-docs",
    features: ["Auto Token Injection", "Multi-Currency Payments", "AI Chatbot"]
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`✨ Auto Token Injection: ENABLED\n`);
});