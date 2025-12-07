// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const User = require("../models/User");
// const cloudinary = require("cloudinary").v2;
// const FormData = require('form-data');
// const axios = require('axios');

// // Configure Cloudinary
// cloudinary.config({
//     cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//     api_key: process.env.CLOUDINARY_API_KEY,
//     api_secret: process.env.CLOUDINARY_API_SECRET
// });

// // OCR.space API function with improved error handling
// const extractTextFromImage = async (imageBuffer) => {
//     try {
//         const formData = new FormData();
//         formData.append('file', imageBuffer, 'image.jpg');
//         formData.append('apikey', process.env.OCR_SPACE_API_KEY || 'K87899142588957');
//         formData.append('language', 'eng');
//         formData.append('isOverlayRequired', 'false');
//         formData.append('detectOrientation', 'true');
//         formData.append('isTable', 'true');
//         formData.append('scale', 'true');
//         formData.append('OCREngine', '2');

//         console.log('Attempting OCR extraction...');
        
//         const response = await axios.post('https://api.ocr.space/parse/image', formData, {
//             headers: {
//                 ...formData.getHeaders(),
//             },
//             timeout: 30000,
//             maxRedirects: 5
//         });

//         console.log('OCR Response status:', response.status);
        
//         if (response.data.IsErroredOnProcessing) {
//             console.error('OCR Error:', response.data.ErrorMessage);
//             throw new Error(response.data.ErrorMessage || 'OCR processing failed');
//         }

//         const extractedText = response.data.ParsedResults[0]?.ParsedText || '';
//         console.log('OCR extraction successful, text length:', extractedText.length);
        
//         return extractedText;
//     } catch (error) {
//         console.error('OCR extraction error:', error.message);
        
//         if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
//             console.warn('OCR timeout - continuing without text extraction');
//             return 'OCR_TIMEOUT_ERROR';
//         }
        
//         return 'OCR_EXTRACTION_FAILED';
//     }
// };

// // ============================================
// // STEP 1: REGISTER WITH ID
// // ============================================
// exports.registerWithId = async(req, res) => {
//     try{
//         if (!req.files || !req.files.idImage || !req.files.selfie) {
//             return res.status(400).json({ 
//                 success: false, 
//                 error: 'Please upload both ID and selfie images' 
//             });
//         }

//         const idImageBuffer = req.files.idImage[0].buffer;
//         const selfieBuffer = req.files.selfie[0].buffer;

//         console.log('\n🆔 === REGISTER WITH ID START ===');
//         console.log('ID Image size:', idImageBuffer.length);
//         console.log('Selfie size:', selfieBuffer.length);

//         // Extract text from ID using OCR
//         const extractedText = await extractTextFromImage(idImageBuffer);
//         console.log('Extracted text from ID:', extractedText.substring(0, 200));

//         let extractedData = { user_nationalId: null, user_name: null };
        
//         // Extract user data from ID (only if OCR was successful)
//         if (extractedText && !extractedText.includes('OCR_')) {
//             extractedData = extractUserDataFromId(extractedText);
//         } else {
//             console.warn('OCR failed - proceeding with manual verification');
//             extractedData = { 
//                 user_nationalId: 'MANUAL_VERIFICATION_REQUIRED', 
//                 user_name: 'MANUAL_VERIFICATION_REQUIRED' 
//             };
//         }
        
//         // Check if user already exists
//         if(extractedData.user_nationalId && extractedData.user_nationalId !== 'MANUAL_VERIFICATION_REQUIRED') {
//             const exist = await User.findOne({user_nationalId: extractedData.user_nationalId});
//             if(exist){
//                 return res.status(400).json({
//                     success: false,
//                     message: "User with this ID number already exists"
//                 });
//             }
//         }

//         // Validation checks
//         const validationChecks = {
//             hasName: extractedData.user_name !== null,
//             hasIdNumber: extractedData.user_nationalId !== null,
//             hasDateOfBirth: extractedData.dateOfBirth !== null,
//             hasValidIdKeywords: checkForIdKeywords(extractedText)
//         };

//         const hasFaceInId = true;
//         const hasFaceInSelfie = true;

//         // Calculate verification score
//         const checksCount = Object.values(validationChecks).filter(v => v).length;
//         const totalChecks = Object.keys(validationChecks).length;
//         let verificationScore = (checksCount / totalChecks) * 100;

//         if (hasFaceInId) verificationScore += 10;
//         if (hasFaceInSelfie) verificationScore += 10;
//         verificationScore = Math.min(verificationScore, 100);

//         // Upload images to Cloudinary
//         const idUploadResult = await new Promise((resolve, reject) => {
//             cloudinary.uploader.upload_stream(
//                 { 
//                     resource_type: 'image',
//                     folder: 'gkash/id_documents',
//                     public_id: `id_${Date.now()}`
//                 },
//                 (error, result) => {
//                     if (error) reject(error);
//                     else resolve(result);
//                 }
//             ).end(idImageBuffer);
//         });

//         const selfieUploadResult = await new Promise((resolve, reject) => {
//             cloudinary.uploader.upload_stream(
//                 { 
//                     resource_type: 'image',
//                     folder: 'gkash/selfies',
//                     public_id: `selfie_${Date.now()}`
//                 },
//                 (error, result) => {
//                     if (error) reject(error);
//                     else resolve(result);
//                 }
//             ).end(selfieBuffer);
//         });

//         const isVerified = verificationScore >= 60 && hasFaceInId && hasFaceInSelfie;

//         console.log('Verification score:', verificationScore);
//         console.log('Auto-verified:', isVerified);

//         // Create temporary registration record
//         const tempUser = await User.create({
//             user_name: extractedData.user_name || 'Extracted Name', 
//             user_nationalId: extractedData.user_nationalId || 'TEMP_ID_' + Date.now(),
//             // phoneNumber will be added in Step 2
//             pin_set: false,
//             idVerified: isVerified,
//             idVerification: {
//                 idImageUrl: idUploadResult.secure_url,
//                 selfieUrl: selfieUploadResult.secure_url,
//                 extractedText: extractedText,
//                 validationChecks: validationChecks,
//                 verificationScore: Math.round(verificationScore),
//                 hasFaceInId: hasFaceInId,
//                 hasFaceInSelfie: hasFaceInSelfie,
//                 verifiedAt: isVerified ? new Date() : null,
//                 status: isVerified ? 'approved' : 'rejected',
//                 submittedAt: new Date()
//             }
//         });

//         // Create temporary token
//         const temp_token = jwt.sign(
//             {id: tempUser._id, step: 'complete_registration'}, 
//             process.env.JWT_SECRET, 
//             { expiresIn: "30m" }
//         );
        
//         await User.findByIdAndUpdate(tempUser._id, {temp_token});

//         console.log('✅ Registration step 1 complete');
//         console.log('🆔 === REGISTER WITH ID END ===\n');

//         res.status(201).json({
//             success: true,
//             message: isVerified ? 
//                 "✅ ID verified successfully! Please complete your registration." : 
//                 "⚠️ ID verification failed, but you can still complete registration.",
//             temp_token,
//             user_id: tempUser._id,
//             verified: isVerified,
//             score: Math.round(verificationScore),
//             extractedData: {
//                 user_name: extractedData.user_name,
//                 user_nationalId: extractedData.user_nationalId,
//                 dateOfBirth: extractedData.dateOfBirth
//             },
//             checks: {
//                 ...validationChecks,
//                 hasFaceInId,
//                 hasFaceInSelfie
//             }
//         });
//     }catch(error){
//         console.error('❌ ID Registration error:', error);
//         res.status(500).json({ 
//             success: false,
//             message: "Registration failed. Please try again.",
//             details: process.env.NODE_ENV === 'development' ? error.message : undefined
//         });
//     }
// }

// // ============================================
// // STEP 2: ADD PHONE NUMBER
// // ============================================
// exports.addPhone = async(req, res) => {
//     try {
//         console.log('\n📞 === ADD PHONE START ===');
//         console.log('User ID from token:', req.userId);
//         console.log('Request body:', req.body);
        
//         const { phoneNumber } = req.body;
//         const userId = req.userId;

//         // Validate phone number format
//         if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
//             console.error('❌ Invalid phone number format:', phoneNumber);
//             return res.status(400).json({
//                 success: false,
//                 message: "Please provide a valid 10-digit phone number"
//             });
//         }

//         // Check if phone number already exists
//         const existingUser = await User.findOne({ phoneNumber });
//         if (existingUser) {
//             console.error('❌ Phone number already exists:', phoneNumber);
//             return res.status(400).json({
//                 success: false,
//                 message: "Phone number already registered"
//             });
//         }

//         // Update user with phone number
//         // Mark as verified since OTP is handled externally
//         const updatedUser = await User.findByIdAndUpdate(
//             userId, 
//             { 
//                 phoneNumber,
//                 phoneVerified: true
//             },
//             { new: true }
//         );

//         if (!updatedUser) {
//             console.error('❌ User not found:', userId);
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

//         console.log('✅ Phone number added successfully');
//         console.log('📞 === ADD PHONE END ===\n');

//         res.status(200).json({
//             success: true,
//             message: "Phone number added successfully. Proceed to create PIN."
//         });

//     } catch (error) {
//         console.error('❌ Add phone error:', error);
//         res.status(500).json({
//             success: false,
//             message: "Failed to add phone number. Please try again."
//         });
//     }
// };

// // ============================================
// // STEP 3: CREATE PIN
// // ============================================
// exports.createPin = async(req, res) => {
//     try{
//         console.log('\n🔐 === CREATE PIN START ===');
//         const {user_pin} = req.body;
//         const userId = req.userId;
        
//         if(!user_pin || !/^[0-9]{4}$/.test(user_pin)) {
//             console.error('❌ Invalid PIN format');
//             return res.status(400).json({
//                 success: false,
//                 message: "PIN must be exactly 4 digits"
//             });
//         }

//         console.log('🔒 Hashing PIN...');
//         const hashed = await bcrypt.hash(user_pin, 10);
        
//         console.log('💾 Updating user...');
//         const user = await User.findByIdAndUpdate(
//             userId, 
//             {
//                 user_pin: hashed,
//                 pin_set: true,
//                 isRegistered: true,
//                 temp_token: null
//             },
//             { new: true }
//         ).select("-user_pin -temp_token");

//         if (!user) {
//             console.error('❌ User not found');
//             return res.status(404).json({
//                 success: false,
//                 message: "User not found"
//             });
//         }

//         // Create final permanent token
//         console.log('🎫 Creating permanent token...');
//         const token = jwt.sign(
//             {id: userId}, 
//             process.env.JWT_SECRET, 
//             { expiresIn: "7d" }
//         );
        
//         console.log('✅ Registration completed successfully');
//         console.log('🔐 === CREATE PIN END ===\n');
        
//         res.status(201).json({
//             success: true,
//             message: "Registration completed successfully! You can now login with your PIN.",
//             token,
//             user: {
//                 user_nationalId: user.user_nationalId,
//                 user_name: user.user_name,
//                 phoneNumber: user.phoneNumber,
//                 idVerified: user.idVerified
//             }
//         });
//     }catch(error){
//         console.error('❌ Create PIN error:', error);
//         console.log('🔐 === CREATE PIN END ===\n');
        
//         res.status(500).json({
//             success: false,
//             message: "Failed to create PIN. Please try again."
//         });
//     }
// }

// // ============================================
// // LOGIN
// // ============================================
// exports.login = async(req, res) => {
//     try{
//         console.log('\n🔑 === LOGIN START ===');
//         const { user_pin, user_nationalId } = req.body;

//         if(!user_pin || !user_nationalId) {
//             return res.status(400).json({
//                 success: false,
//                 message: "National ID and PIN are required"
//             });
//         }

//         // Find user by National ID
//         const user = await User.findOne({ user_nationalId });
//         if(!user) {
//             console.error('❌ User not found');
//             return res.status(404).json({
//                 success: false,
//                 message: "Invalid credentials"
//             });
//         }
        
//         // Check if registration is complete
//         if(!user.pin_set || !user.user_pin) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please complete your registration by setting a PIN"
//             });
//         }

//         if(!user.isRegistered) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Please complete your registration process"
//             });
//         }
        
//         // Verify PIN
//         const match = await bcrypt.compare(user_pin, user.user_pin);
//         if(!match) {
//             console.error('❌ Invalid PIN');
//             return res.status(401).json({
//                 success: false,
//                 message: "Invalid PIN"
//             });
//         }
        
//         // Generate JWT token
//         const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, { expiresIn: "7d" });
        
//         console.log('✅ Login successful');
//         console.log('🔑 === LOGIN END ===\n');
        
//         res.status(200).json({
//             success: true,
//             message: "Login successful", 
//             token, 
//             user: {
//                 user_nationalId: user.user_nationalId, 
//                 user_name: user.user_name, 
//                 phoneNumber: user.phoneNumber,
//                 idVerified: user.idVerified
//             }
//         });

//     }catch(error){
//         console.error('❌ Login error:', error);
//         console.log('🔑 === LOGIN END ===\n');
        
//         res.status(500).json({
//             success: false,
//             message: "Login failed. Please try again."
//         });
//     }
// }

// // ============================================
// // HELPER FUNCTIONS (Keep all your existing helper functions below)
// // ============================================

// function extractUserDataFromId(extractedText) {
//     // ... (keep your existing extractUserDataFromId function)
//     console.log('=== DEBUGGING NAME EXTRACTION ===');
//     console.log('Full extracted text length:', extractedText.length);
    
//     let user_nationalId = null;
//     const idPatterns = [
//         /\b\d{7,8}\b/g,
//         /\b\d{6,9}\b/g,
//         /ID[\s:]*(\d{7,8})/gi,
//         /NO[\s:]*(\d{7,8})/gi,
//         /NUMBER[\s:]*(\d{7,8})/gi
//     ];
    
//     for (let pattern of idPatterns) {
//         const matches = [...extractedText.matchAll(pattern)];
//         if (matches.length > 0) {
//             user_nationalId = matches[0][1] || matches[0][0];
//             break;
//         }
//     }
    
//     const lines = extractedText.split(/[\n\r]+/).filter(line => line.trim().length > 0);
//     let user_name = null;
    
//     const skipWords = [
//         'republic', 'kenya', 'identity', 'card', 'national', 'id', 'number', 'no',
//         'date', 'birth', 'sex', 'male', 'female', 'signature', 'photo', 'issued',
//         'mayes', 'issue', 'expires', 'authority', 'government', 'official', 'card',
//         'holder', 'dob', 'place', 'district', 'location', 'of', 'the', 'and', 'in'
//     ];
    
//     // Strategy 1: Look for name after labels
//     for (let i = 0; i < lines.length; i++) {
//         const cleanLine = lines[i].trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
//         if (!cleanLine) continue;
        
//         const lowerLine = cleanLine.toLowerCase();
//         if (lowerLine.includes('full names') || lowerLine.includes('full name') || 
//             (lowerLine === 'name' || lowerLine === 'names')) {
            
//             for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
//                 const nextLine = lines[j].trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
//                 if (!nextLine || nextLine.length < 5) continue;
//                 if (/\d/.test(nextLine)) continue;
                
//                 const nextLower = nextLine.toLowerCase();
//                 if (skipWords.some(word => nextLower.includes(word))) continue;
                
//                 const nameWords = nextLine.split(/\s+/).filter(word => word.length > 1);
                
//                 if (nameWords.length >= 2 && nameWords.length <= 4) {
//                     const isValidName = nameWords.every(word => 
//                         /^[A-Za-z]+$/.test(word) && word.length >= 2 && word.length <= 20
//                     );
                    
//                     if (isValidName) {
//                         user_name = nextLine.toUpperCase();
//                         break;
//                     }
//                 }
//             }
            
//             if (user_name) break;
//         }
//     }
    
//     if (user_name) {
//         user_name = cleanExtractedName(user_name);
//     }
    
//     const dobPatterns = [
//         /\d{2}[-/.]\d{2}[-/.]\d{4}/,
//         /\d{4}[-/.]\d{2}[-/.]\d{2}/,
//         /\d{2}\s+[A-Za-z]{3}\s+\d{4}/,
//         /\d{1,2}\/\d{1,2}\/\d{4}/
//     ];
    
//     let dateOfBirth = null;
//     for (let pattern of dobPatterns) {
//         const match = extractedText.match(pattern);
//         if (match) {
//             dateOfBirth = match[0];
//             break;
//         }
//     }
    
//     return {
//         user_name,
//         user_nationalId,
//         dateOfBirth
//     };
// }

// function cleanExtractedName(name) {
//     // ... (keep your existing cleanExtractedName function)
//     if (!name) return name;
    
//     let cleaned = name.trim().replace(/\s+/g, ' ').toUpperCase();
    
//     const fixes = [
//         ['OL IVE', 'OLIVE'],
//         ['JO HN', 'JOHN'],
//         ['MAR Y', 'MARY'],
//         [/\b([A-Z])\s+([A-Z]{2,})\b/g, '$1$2'],
//     ];
    
//     for (let [pattern, replacement] of fixes) {
//         if (typeof pattern === 'string') {
//             cleaned = cleaned.replace(new RegExp(pattern, 'g'), replacement);
//         } else {
//             cleaned = cleaned.replace(pattern, replacement);
//         }
//     }
    
//     cleaned = cleaned.replace(/\s+/g, ' ').trim();
//     return cleaned;
// }

// function checkForIdKeywords(extractedText) {
//     const idKeywords = ['republic', 'kenya', 'identity', 'card', 'national'];
//     return idKeywords.some(keyword => 
//         extractedText.toLowerCase().includes(keyword)
//     );
// }

// exports.cleanupTempUsers = async(req, res) => {
//     try {
//         const result = await User.deleteMany({
//             $or: [
//                 { phoneNumber: 'TEMP_PHONE' },
//                 { phoneNumber: null },
//                 { isRegistered: false }
//             ]
//         });
        
//         res.json({
//             success: true,
//             message: `Cleaned up ${result.deletedCount} temp users`
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: error.message
//         });
//     }
// };

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Register - Name, Email, PIN, Confirm PIN
exports.register = async(req, res) => {
    try {
        console.log('\n📝 === REGISTER START ===');
        console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
        
        const { user_name, email, user_pin, confirm_pin } = req.body;
        
        console.log('🔍 Extracted values:');
        console.log('  - user_pin:', user_pin, '(type:', typeof user_pin, ')');
        console.log('  - confirm_pin:', confirm_pin, '(type:', typeof confirm_pin, ')');
        console.log('  - Are they equal?', user_pin === confirm_pin);
        console.log('  - Strict comparison:', user_pin, '===', confirm_pin, '→', user_pin === confirm_pin);

        // Validate required fields
        if (!user_name || !email || !user_pin || !confirm_pin) {
            return res.status(400).json({
                success: false,
                message: "Name, email, PIN, and PIN confirmation are required"
            });
        }

        // Check if PIN and confirmation match FIRST (before other validations)
        if (user_pin !== confirm_pin) {
            console.error('❌ PINs do not match');
            return res.status(400).json({
                success: false,
                message: "PIN and confirmation do not match"
            });
        }

        // Validate PIN format (4 digits)
        if (!/^[0-9]{4}$/.test(user_pin)) {
            return res.status(400).json({
                success: false,
                message: "PIN must be exactly 4 digits"
            });
        }

        // Validate email format
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email already registered"
            });
        }

        // Hash the PIN
        console.log('🔒 Hashing PIN...');
        const hashedPin = await bcrypt.hash(user_pin, 10);

        // Create user
        const user = await User.create({
            user_name: user_name.trim(),
            email: email.toLowerCase().trim(),
            user_pin: hashedPin
        });

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: "7d" }
        );

        console.log('✅ User registered successfully');
        console.log('📝 === REGISTER END ===\n');

        res.status(201).json({
            success: true,
            message: "Registration successful",
            token,
            user: {
                id: user._id,
                user_name: user.user_name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Registration error:', error);
        console.log('📝 === REGISTER END ===\n');
        
        res.status(500).json({
            success: false,
            message: "Registration failed. Please try again.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Login - Email + PIN
exports.login = async(req, res) => {
    try {
        console.log('\n🔑 === LOGIN START ===');
        const { email, user_pin } = req.body;

        // Validate required fields
        if (!email || !user_pin) {
            return res.status(400).json({
                success: false,
                message: "Email and PIN are required"
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.error('❌ User not found');
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Verify PIN
        const match = await bcrypt.compare(user_pin, user.user_pin);
        if (!match) {
            console.error('❌ Invalid PIN');
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: "7d" }
        );

        console.log('✅ Login successful');
        console.log('🔑 === LOGIN END ===\n');

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                user_name: user.user_name,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error);
        console.log('🔑 === LOGIN END ===\n');
        
        res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
};

// Change PIN - Requires current PIN and new PIN
exports.changePin = async(req, res) => {
    try {
        console.log('\n🔄 === CHANGE PIN START ===');
        const { current_pin, new_pin, confirm_new_pin } = req.body;
        const userId = req.user.id; // From auth middleware

        // Validate required fields
        if (!current_pin || !new_pin || !confirm_new_pin) {
            return res.status(400).json({
                success: false,
                message: "Current PIN, new PIN, and confirmation are required"
            });
        }

        // Validate new PIN format (4 digits)
        if (!/^[0-9]{4}$/.test(new_pin)) {
            return res.status(400).json({
                success: false,
                message: "New PIN must be exactly 4 digits"
            });
        }

        // Check if new PIN matches confirmation
        if (new_pin !== confirm_new_pin) {
            return res.status(400).json({
                success: false,
                message: "New PIN and confirmation do not match"
            });
        }

        // Find user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verify current PIN
        const isCurrentPinValid = await bcrypt.compare(current_pin, user.user_pin);
        if (!isCurrentPinValid) {
            console.error('❌ Current PIN invalid');
            return res.status(401).json({
                success: false,
                message: "Current PIN is incorrect"
            });
        }

        // Check if new PIN is same as current PIN
        const isSamePin = await bcrypt.compare(new_pin, user.user_pin);
        if (isSamePin) {
            return res.status(400).json({
                success: false,
                message: "New PIN must be different from current PIN"
            });
        }

        // Hash new PIN
        console.log('🔒 Hashing new PIN...');
        const hashedNewPin = await bcrypt.hash(new_pin, 10);

        // Update user PIN
        user.user_pin = hashedNewPin;
        await user.save();

        console.log('✅ PIN changed successfully');
        console.log('🔄 === CHANGE PIN END ===\n');

        res.status(200).json({
            success: true,
            message: "PIN changed successfully"
        });

    } catch (error) {
        console.error('❌ Change PIN error:', error);
        console.log('🔄 === CHANGE PIN END ===\n');
        
        res.status(500).json({
            success: false,
            message: "Failed to change PIN. Please try again."
        });
    }
};

// Reset PIN - For forgot PIN (email-based)
exports.resetPin = async(req, res) => {
    try {
        console.log('\n🔓 === RESET PIN START ===');
        const { email, new_pin, confirm_new_pin } = req.body;

        // Validate required fields
        if (!email || !new_pin || !confirm_new_pin) {
            return res.status(400).json({
                success: false,
                message: "Email, new PIN, and confirmation are required"
            });
        }

        // Validate new PIN format (4 digits)
        if (!/^[0-9]{4}$/.test(new_pin)) {
            return res.status(400).json({
                success: false,
                message: "New PIN must be exactly 4 digits"
            });
        }

        // Check if new PIN matches confirmation
        if (new_pin !== confirm_new_pin) {
            return res.status(400).json({
                success: false,
                message: "New PIN and confirmation do not match"
            });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Don't reveal if email exists or not for security
            return res.status(200).json({
                success: true,
                message: "If the email exists, PIN reset instructions have been sent"
            });
        }

        // Hash new PIN
        console.log('🔒 Hashing new PIN...');
        const hashedNewPin = await bcrypt.hash(new_pin, 10);

        // Update user PIN
        user.user_pin = hashedNewPin;
        await user.save();

        console.log('✅ PIN reset successfully');
        console.log('🔓 === RESET PIN END ===\n');

        // In production, you'd want to send a verification email first
        res.status(200).json({
            success: true,
            message: "PIN reset successfully"
        });

    } catch (error) {
        console.error('❌ Reset PIN error:', error);
        console.log('🔓 === RESET PIN END ===\n');
        
        res.status(500).json({
            success: false,
            message: "Failed to reset PIN. Please try again."
        });
    }
};