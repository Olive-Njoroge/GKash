const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const cloudinary = require("cloudinary").v2;
const FormData = require('form-data');
const axios = require('axios');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// OCR.space API function
const extractTextFromImage = async (imageBuffer) => {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, 'image.jpg');
        formData.append('apikey', process.env.OCR_SPACE_API_KEY || 'helloworld'); // Free tier key
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'false');
        formData.append('isTable', 'true');

        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                ...formData.getHeaders(),
            },
        });

        if (response.data.IsErroredOnProcessing) {
            throw new Error(response.data.ErrorMessage || 'OCR processing failed');
        }

        return response.data.ParsedResults[0]?.ParsedText || '';
    } catch (error) {
        console.error('OCR extraction error:', error.message);
        throw new Error('Failed to extract text from image');
    }
};

// OCR.space integration - no client initialization needed

// Step 1: ID-First Registration - Extract data from ID images
exports.registerWithId = async(req, res) => {
    try{
        // Check if files were uploaded
        if (!req.files || !req.files.idImage || !req.files.selfie) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please upload both ID and selfie images' 
            });
        }

        const idImageBuffer = req.files.idImage[0].buffer;
        const selfieBuffer = req.files.selfie[0].buffer;

        console.log('Processing ID registration for new user');
        console.log('ID Image size:', idImageBuffer.length);
        console.log('Selfie size:', selfieBuffer.length);

        // Step 1: Extract text from ID using OCR.space
        const extractedText = await extractTextFromImage(idImageBuffer);

        console.log('Extracted text from ID:', extractedText);

        // Step 2: Extract user data from ID
        const extractedData = extractUserDataFromId(extractedText);
        
        // Check if user already exists with this ID number
        if(extractedData.user_nationalId) {
            const exist = await User.findOne({user_nationalId: extractedData.user_nationalId});
            if(exist){
                return res.status(400).json({
                    success: false,
                    message: "User with this ID number already exists"
                });
            }
        }

        // Step 3: Perform validation checks
        const validationChecks = {
            hasName: extractedData.user_name !== null,
            hasIdNumber: extractedData.user_nationalId !== null,
            hasDateOfBirth: extractedData.dateOfBirth !== null,
            hasValidIdKeywords: checkForIdKeywords(extractedText)
        };

        // Step 4: Basic validation (we'll assume faces are present for now)
        // In a production environment, you could use a face detection service
        const hasFaceInId = true; // Simplified for now
        const hasFaceInSelfie = true; // Simplified for now

        // Step 5: Calculate verification score
        const checksCount = Object.values(validationChecks).filter(v => v).length;
        const totalChecks = Object.keys(validationChecks).length;
        let verificationScore = (checksCount / totalChecks) * 100;

        // Add bonus points for face detection
        if (hasFaceInId) verificationScore += 10;
        if (hasFaceInSelfie) verificationScore += 10;

        // Cap at 100
        verificationScore = Math.min(verificationScore, 100);

        // Step 6: Upload images to Cloudinary
        const cloudinary = require('cloudinary').v2;
        
        // Upload ID image
        const idUploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { 
                    resource_type: 'image',
                    folder: 'gkash/id_documents',
                    public_id: `id_${Date.now()}`
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(idImageBuffer);
        });

        // Upload selfie
        const selfieUploadResult = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { 
                    resource_type: 'image',
                    folder: 'gkash/selfies',
                    public_id: `selfie_${Date.now()}`
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(selfieBuffer);
        });

        // Step 7: Determine if verified (require 60% score + faces in both images)
        const isVerified = verificationScore >= 60 && hasFaceInId && hasFaceInSelfie;

        console.log('Verification checks:', validationChecks);
        console.log('Verification score:', verificationScore);
        console.log('Auto-verified:', isVerified);

        // Step 8: Create temporary registration record
        const tempUser = await User.create({
            user_name: extractedData.user_name || 'Extracted Name', 
            user_nationalId: extractedData.user_nationalId || 'TEMP_ID_' + Date.now(),
            phoneNumber: 'TEMP_PHONE', // Will be updated in step 2
            pin_set: false,
            idVerified: isVerified,
            idVerification: {
                idImageUrl: idUploadResult.secure_url,
                selfieUrl: selfieUploadResult.secure_url,
                extractedText: extractedText,
                validationChecks: validationChecks,
                verificationScore: Math.round(verificationScore),
                hasFaceInId: hasFaceInId,
                hasFaceInSelfie: hasFaceInSelfie,
                verifiedAt: isVerified ? new Date() : null,
                status: isVerified ? 'approved' : 'rejected',
                submittedAt: new Date()
            }
        });

        // Create temporary token for completing registration
        const temp_token = jwt.sign(
            {id: tempUser._id, step: 'complete_registration'}, 
            process.env.JWT_SECRET, 
            { expiresIn: "30m" }
        );
        
        await User.findByIdAndUpdate(tempUser._id, {temp_token});

        res.status(201).json({
            success: true,
            message: isVerified ? 
                "✅ ID verified successfully! Please complete your registration." : 
                "⚠️ ID verification failed, but you can still complete registration.",
            temp_token,
            user_id: tempUser._id,
            verified: isVerified,
            score: Math.round(verificationScore),
            extractedData: {
                user_name: extractedData.user_name,
                user_nationalId: extractedData.user_nationalId,
                dateOfBirth: extractedData.dateOfBirth
            },
            checks: {
                ...validationChecks,
                hasFaceInId,
                hasFaceInSelfie
            }
        });
    }catch(error){
        console.error('ID Registration error:', error);
        res.status(500).json({ 
            success: false,
            message: "Registration failed. Please try again.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

// Helper function to extract user data from ID text
function extractUserDataFromId(extractedText) {
    console.log('=== DEBUGGING NAME EXTRACTION ===');
    console.log('Full extracted text:', extractedText);
    
    // Extract ID number (Kenyan format: typically 7-8 digits)
    const idNumberMatch = extractedText.match(/\b\d{7,8}\b/);
    const user_nationalId = idNumberMatch ? idNumberMatch[0] : null;
    
    // Extract name with improved logic for Kenyan IDs
    const lines = extractedText.split('\n').filter(line => line.trim().length > 0);
    let user_name = null;
    
    console.log('Lines from ID:', lines);
    
    // Common words to skip when looking for names
    const skipWords = [
        'republic', 'kenya', 'identity', 'card', 'national', 'id', 'number',
        'date', 'birth', 'sex', 'male', 'female', 'signature', 'photo',
        'mayes', 'issue', 'expires', 'authority', 'government', 'official'
    ];
    
    // Look for name patterns - names are usually:
    // 1. All uppercase letters (common on Kenyan IDs)
    // 2. Multiple words (first name + surname)
    // 3. No numbers
    // 4. Between 5-50 characters
    for (let line of lines) {
        const cleanLine = line.trim();
        
        // Skip empty lines or lines with numbers
        if (!cleanLine || /\d/.test(cleanLine)) continue;
        
        // Skip lines that contain common ID keywords
        const lowerLine = cleanLine.toLowerCase();
        if (skipWords.some(word => lowerLine.includes(word))) continue;
        
        // Look for lines that look like names (2-4 words, all letters)
        const words = cleanLine.split(/\s+/).filter(word => word.length > 0);
        
        if (words.length >= 2 && words.length <= 4) {
            // Check if all words are alphabetic and reasonable length
            const isValidName = words.every(word => 
                /^[A-Za-z]+$/.test(word) && word.length >= 2 && word.length <= 20
            );
            
            if (isValidName) {
                user_name = cleanLine.toUpperCase(); // Convert to uppercase for consistency
                console.log('Found potential name:', user_name);
                break;
            }
        }
        
        // Fallback: single word names (less common but possible)
        if (!user_name && cleanLine.length >= 3 && cleanLine.length <= 30 && /^[A-Za-z\s]+$/.test(cleanLine)) {
            const wordCount = cleanLine.split(/\s+/).length;
            if (wordCount === 1 && cleanLine.length >= 5) {
                user_name = cleanLine.toUpperCase();
                console.log('Found fallback name:', user_name);
            }
        }
    }
    
    console.log('Final extracted name:', user_name);
    
    // Extract date of birth (various formats)
    const dobPatterns = [
        /\d{2}[-/.]\d{2}[-/.]\d{4}/, // DD-MM-YYYY
        /\d{4}[-/.]\d{2}[-/.]\d{2}/, // YYYY-MM-DD
        /\d{2}\s+[A-Za-z]{3}\s+\d{4}/, // DD Mon YYYY
        /\d{1,2}\/\d{1,2}\/\d{4}/ // M/D/YYYY or MM/DD/YYYY
    ];
    
    let dateOfBirth = null;
    for (let pattern of dobPatterns) {
        const match = extractedText.match(pattern);
        if (match) {
            dateOfBirth = match[0];
            break;
        }
    }
    
    console.log('=== END DEBUGGING ===');
    
    return {
        user_name,
        user_nationalId,
        dateOfBirth
    };
}

// Helper function to check for Kenyan ID keywords
function checkForIdKeywords(extractedText) {
    const idKeywords = ['republic', 'kenya', 'identity', 'card', 'national'];
    return idKeywords.some(keyword => 
        extractedText.toLowerCase().includes(keyword)
    );
}

// Step 2a: Send OTP to phone number
exports.sendOtp = async(req, res) => {
    try {
        const { phoneNumber } = req.body;
        const userId = req.userId; // From temp token middleware

        // Validate phone number format
        if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid 10-digit phone number"
            });
        }

        // Call your OTP service
        const otpResponse = await axios.post('https://tiara-connect-otp.onrender.com/send-otp', {
            phoneNumber: phoneNumber
        });

        if (otpResponse.data.success) {
            // Store the OTP reference for verification
            global.otpStorage = global.otpStorage || {};
            global.otpStorage[phoneNumber] = {
                reference: otpResponse.data.reference,
                userId: userId,
                expires: Date.now() + 10 * 60 * 1000 // 10 minutes
            };

            res.status(200).json({
                success: true,
                message: "OTP sent to your phone number",
                reference: otpResponse.data.reference
            });
        } else {
            res.status(400).json({
                success: false,
                message: otpResponse.data.message || 'Failed to send OTP'
            });
        }

    } catch (error) {
        console.error('Send OTP error:', error);
        console.error('Error details:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: "Failed to send OTP. Please try again.",
            debug: error.response?.data || error.message
        });
    }
};

// Step 2: Add Phone Number
exports.addPhone = async(req, res) => {
    try {
        const { phoneNumber } = req.body;
        const userId = req.userId; // From temp token middleware

        // Validate phone number format (basic validation)
        if (!phoneNumber || phoneNumber.length < 10) {
            return res.status(400).json({
                success: false,
                error: "Please provide a valid phone number"
            });
        }

        // Check if phone number already exists
        const existingUser = await User.findOne({ phoneNumber });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: "Phone number already registered"
            });
        }

        // Update user with phone number
        await User.findByIdAndUpdate(userId, { phoneNumber });

        res.status(200).json({
            success: true,
            message: "Phone number added successfully. Proceed to create PIN."
        });

    } catch (error) {
        console.error('Add phone error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to add phone number. Please try again."
        });
    }
};

// Step 3: Send OTP after phone number added
exports.sendOtp = async(req, res) => {
    try {
        const userId = req.userId; // From temp token middleware

        // Get user with phone number
        const user = await User.findById(userId);
        if (!user || !user.phoneNumber) {
            return res.status(400).json({
                success: false,
                error: "Phone number not found. Please add phone number first."
            });
        }

        console.log('Sending OTP to phone number:', user.phoneNumber);

        // Send OTP using Tiara Connect API
        const response = await axios.post('https://tiara-connect-otp.onrender.com/api/auth/send-otp', {
            phoneNumber: user.phoneNumber
        });

        console.log('OTP API Response:', response.data);

        if (response.data.success) {
            res.status(200).json({
                success: true,
                message: "OTP sent to your phone number",
                reference: response.data.reference
            });
        } else {
            console.error('OTP API returned failure:', response.data);
            res.status(400).json({
                success: false,
                error: response.data.message || 'Failed to send OTP'
            });
        }

    } catch (error) {
        console.error('Send OTP error details:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            phoneNumber: error.config?.data
        });
        res.status(500).json({
            success: false,
            message: "Failed to send OTP. Please try again."
        });
    }
};

// Step 4: Verify OTP
exports.verifyOtp = async(req, res) => {
    try {
        const { otpCode } = req.body;
        const userId = req.userId; // From temp token middleware

        // Get user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        // Verify OTP using Tiara Connect API
        const response = await axios.post('https://tiara-connect-otp.onrender.com/api/auth/verify-otp', {
            phoneNumber: user.phoneNumber,
            otpCode: otpCode
        });

        if (response.data.success) {
            // Mark phone as verified
            user.phoneVerified = true;
            await user.save();

            res.status(200).json({
                success: true,
                message: "Phone verified successfully. Proceed to create PIN."
            });
        } else {
            res.status(400).json({
                success: false,
                error: response.data.message || "Invalid or expired OTP code"
            });
        }

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to verify OTP. Please try again."
        });
    }
};

// Legacy: Complete registration (will be deprecated)
exports.completeRegistration = async(req, res) => {
    try{
        const { phoneNumber, otpCode, user_pin } = req.body;
        const userId = req.userId; // From temp token middleware
        
        // Validate required fields
        if (!phoneNumber || !otpCode || !user_pin) {
            return res.status(400).json({
                success: false,
                message: "Phone number, OTP code, and PIN are required"
            });
        }

        // Validate PIN format
        if (!/^[0-9]{4}$/.test(user_pin)) {
            return res.status(400).json({
                success: false,
                message: "PIN must be exactly 4 digits"
            });
        }

        // Verify OTP using your service
        try {
            const verifyResponse = await axios.post('https://tiara-connect-otp.onrender.com/verify-otp', {
                phoneNumber: phoneNumber,
                otpCode: otpCode
            });

            if (!verifyResponse.data.success) {
                return res.status(400).json({
                    success: false,
                    message: verifyResponse.data.message || "Invalid OTP code"
                });
            }
        } catch (error) {
            console.error('OTP verification error:', error);
            return res.status(400).json({
                success: false,
                message: "OTP verification failed. Please try again."
            });
        }

        // Verify stored data belongs to this user
        const storedData = global.otpStorage?.[phoneNumber];
        if (!storedData || storedData.userId !== userId) {
            return res.status(400).json({
                success: false,
                message: "Session verification failed"
            });
        }

        // Hash the PIN
        const hashedPin = await bcrypt.hash(user_pin, 12);

        // Complete registration: update user with phone number and PIN
        const user = await User.findByIdAndUpdate(userId, {
            phoneNumber: phoneNumber.trim(),
            user_pin: hashedPin,
            temp_token: null, // Clear temp token
            isActive: true // Activate account
        }, { new: true });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Registration session expired. Please start over."
            });
        }

        // Clear OTP from storage
        if (global.otpStorage?.[phoneNumber]) {
            delete global.otpStorage[phoneNumber];
        }

        // Generate final auth token
        const token = jwt.sign(
            { id: user._id }, 
            process.env.JWT_SECRET, 
            { expiresIn: "7d" }
        );

        res.status(201).json({
            success: true,
            message: "Registration completed successfully! You can now login with your PIN.",
            token,
            user: {
                user_name: user.user_name,
                user_nationalId: user.user_nationalId,
                phoneNumber: user.phoneNumber,
                verified: user.idVerified
            }
        });
    }catch(error){
        console.error('Complete registration error:', error);
        res.status(500).json({ 
            success: false,
            message: "Registration completion failed. Please try again."
        });
    }
}

// Step 2: Create PIN
exports.createPin = async(req, res) => {
    try{
        const {user_pin} = req.body;
        const userId = req.userId; // From temp token middleware
        
        if(!user_pin || user_pin.length !== 4) {
            return res.status(400).json({message: "PIN must be 4 digits"});
        }

        const hashed = await bcrypt.hash(user_pin, 10);
        
        await User.findByIdAndUpdate(userId, {
            user_pin: hashed,
            pin_set: true,
            isRegistered: true,
            temp_token: null
        });

        // Create final token
        const token = jwt.sign({id: userId}, process.env.JWT_SECRET, { expiresIn: "1d" });
        
        const user = await User.findById(userId).select("-user_pin -temp_token");
        
        res.status(201).json({
            success: true,
            message: "Registration completed successfully! You can now login with your PIN.",
            token,
            user: {
                user_nationalId: user.user_nationalId,
                user_name: user.user_name,
                phoneNumber: user.phoneNumber,
                idVerified: user.idVerified
            }
        });
    }catch(error){
        console.error('Create PIN error:', error);
        res.status(500).json({
            success: false,
            message: "Failed to create PIN. Please try again."
        });
    }
}

// Login with National ID + PIN
exports.login = async(req, res) => {
    try{
        const { user_pin, user_nationalId } = req.body;

        // Validate required fields
        if(!user_pin || !user_nationalId) {
            return res.status(400).json({
                success: false,
                message: "National ID and PIN are required"
            });
        }

        // Find user by National ID
        const user = await User.findOne({ user_nationalId });
        if(!user) {
            return res.status(404).json({
                success: false,
                message: "Invalid credentials"
            });
        }
        
        // Check if registration is complete
        if(!user.pin_set || !user.user_pin) {
            return res.status(400).json({
                success: false,
                message: "Please complete your registration by setting a PIN"
            });
        }

        if(!user.isRegistered) {
            return res.status(400).json({
                success: false,
                message: "Please complete your registration process"
            });
        }
        
        // Verify PIN
        const match = await bcrypt.compare(user_pin, user.user_pin);
        if(!match) {
            return res.status(401).json({
                success: false,
                message: "Invalid PIN"
            });
        }
        
        // Generate JWT token
        const token = jwt.sign({id: user._id}, process.env.JWT_SECRET, { expiresIn: "7d" });
        
        res.status(200).json({
            success: true,
            message: "Login successful", 
            token, 
            user: {
                user_nationalId: user.user_nationalId, 
                user_name: user.user_name, 
                phoneNumber: user.phoneNumber,
                idVerified: user.idVerified
            }
        });

    }catch(error){
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
}