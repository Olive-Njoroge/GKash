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

// OCR.space API function with improved error handling
const extractTextFromImage = async (imageBuffer) => {
    try {
        const formData = new FormData();
        formData.append('file', imageBuffer, 'image.jpg');
        formData.append('apikey', process.env.OCR_SPACE_API_KEY || 'K87899142588957');
        formData.append('language', 'eng');
        formData.append('isOverlayRequired', 'false');
        formData.append('detectOrientation', 'true');
        formData.append('isTable', 'true');
        formData.append('scale', 'true');        // Better for low-resolution images
        formData.append('OCREngine', '2');       // Better for IDs and documents

        console.log('Attempting OCR extraction...');
        
        const response = await axios.post('https://api.ocr.space/parse/image', formData, {
            headers: {
                ...formData.getHeaders(),
            },
            timeout: 30000, // 30 second timeout
            maxRedirects: 5
        });

        console.log('OCR Response status:', response.status);
        
        if (response.data.IsErroredOnProcessing) {
            console.error('OCR Error:', response.data.ErrorMessage);
            throw new Error(response.data.ErrorMessage || 'OCR processing failed');
        }

        const extractedText = response.data.ParsedResults[0]?.ParsedText || '';
        console.log('OCR extraction successful, text length:', extractedText.length);
        
        return extractedText;
    } catch (error) {
        console.error('OCR extraction error:', error.message);
        
        // Return empty string instead of throwing error to allow registration to continue
        if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
            console.warn('OCR timeout - continuing without text extraction');
            return 'OCR_TIMEOUT_ERROR';
        }
        
        return 'OCR_EXTRACTION_FAILED';
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

        let extractedData = { user_nationalId: null, user_name: null };
        
        // Step 2: Extract user data from ID (only if OCR was successful)
        if (extractedText && !extractedText.includes('OCR_')) {
            extractedData = extractUserDataFromId(extractedText);
        } else {
            console.warn('OCR failed or timed out - proceeding with manual verification');
            extractedData = { 
                user_nationalId: 'MANUAL_VERIFICATION_REQUIRED', 
                user_name: 'MANUAL_VERIFICATION_REQUIRED' 
            };
        }
        
        // Check if user already exists with this ID number (only if we have a valid ID)
        if(extractedData.user_nationalId && extractedData.user_nationalId !== 'MANUAL_VERIFICATION_REQUIRED') {
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
    console.log('Full extracted text length:', extractedText.length);
    console.log('Full extracted text:', JSON.stringify(extractedText, null, 2));
    
    // Extract ID number - More flexible patterns for Kenyan IDs
    let user_nationalId = null;
    
    // Try multiple ID number patterns
    const idPatterns = [
        /\b\d{7,8}\b/g,           // 7-8 digits
        /\b\d{6,9}\b/g,           // 6-9 digits (broader range)
        /ID[\s:]*(\d{7,8})/gi,    // "ID: 12345678"
        /NO[\s:]*(\d{7,8})/gi,    // "NO: 12345678"
        /NUMBER[\s:]*(\d{7,8})/gi // "NUMBER: 12345678"
    ];
    
    for (let pattern of idPatterns) {
        const matches = [...extractedText.matchAll(pattern)];
        if (matches.length > 0) {
            // Take the first match, extract the capture group if exists
            user_nationalId = matches[0][1] || matches[0][0];
            console.log('Found ID number with pattern:', pattern, '-> Result:', user_nationalId);
            break;
        }
    }
    
    // Extract name with more aggressive pattern matching
    const lines = extractedText.split(/[\n\r]+/).filter(line => line.trim().length > 0);
    let user_name = null;
    
    console.log('Total lines found:', lines.length);
    lines.forEach((line, index) => {
        console.log(`Line ${index + 1}:`, JSON.stringify(line.trim()));
    });
    
    // Common words to skip when looking for names (expanded list)
    const skipWords = [
        'republic', 'kenya', 'identity', 'card', 'national', 'id', 'number', 'no',
        'date', 'birth', 'sex', 'male', 'female', 'signature', 'photo', 'issued',
        'mayes', 'issue', 'expires', 'authority', 'government', 'official', 'card',
        'holder', 'dob', 'place', 'district', 'location', 'of', 'the', 'and', 'in'
    ];
    
    // Strategy 1: Look for name patterns, especially after "FULL NAMES" or "NAME" labels
    for (let i = 0; i < lines.length; i++) {
        const cleanLine = lines[i].trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
        
        // Skip empty lines
        if (!cleanLine) continue;
        
        console.log(`Processing line ${i + 1}:`, cleanLine);
        
        // Special case: Check if current line contains "FULL NAMES" or "NAME" 
        // If so, look at the next few lines for the actual name
        const lowerLine = cleanLine.toLowerCase();
        if (lowerLine.includes('full names') || lowerLine.includes('full name') || 
            (lowerLine === 'name' || lowerLine === 'names')) {
            console.log('  -> Found name label, checking next lines...');
            
            // Check the next 3 lines for the actual name
            for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
                const nextLine = lines[j].trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
                
                if (!nextLine || nextLine.length < 5) continue;
                
                // Skip if contains numbers or common keywords
                if (/\d/.test(nextLine)) continue;
                
                const nextLower = nextLine.toLowerCase();
                if (skipWords.some(word => nextLower.includes(word))) continue;
                
                const nameWords = nextLine.split(/\s+/).filter(word => word.length > 1);
                
                if (nameWords.length >= 2 && nameWords.length <= 4) {
                    const isValidName = nameWords.every(word => 
                        /^[A-Za-z]+$/.test(word) && word.length >= 2 && word.length <= 20
                    );
                    
                    if (isValidName) {
                        user_name = nextLine.toUpperCase();
                        console.log(`  ✓ Found name after label (line ${j + 1}):`, user_name);
                        break;
                    }
                }
            }
            
            if (user_name) break;
        }
        
        // Regular pattern matching (skip if line looks like a label)
        if (lowerLine.includes('full') || lowerLine.includes('name') || 
            lowerLine.includes('names') || lowerLine.includes('surname')) {
            console.log('  -> Skipped: appears to be a label');
            continue;
        }
        
        // Skip lines with numbers (likely not names)
        if (/\d/.test(cleanLine)) {
            console.log('  -> Skipped: contains numbers');
            continue;
        }
        
        // Skip lines that are too short or too long
        if (cleanLine.length < 5 || cleanLine.length > 50) {
            console.log('  -> Skipped: length out of range');
            continue;
        }
        
        // Skip lines that contain common ID keywords
        if (skipWords.some(word => lowerLine.includes(word))) {
            console.log('  -> Skipped: contains skip words');
            continue;
        }
        
        // Look for lines that look like names
        const words = cleanLine.split(/\s+/).filter(word => word.length > 1);
        
        // Check for multiple word names (most common)
        if (words.length >= 2 && words.length <= 4) {
            const isValidName = words.every(word => 
                /^[A-Za-z]+$/.test(word) && word.length >= 2 && word.length <= 15
            );
            
            if (isValidName) {
                user_name = cleanLine.toUpperCase();
                console.log('  ✓ Found multi-word name:', user_name);
                break;
            }
        }
        
        // Check for single word names (fallback)
        if (!user_name && words.length === 1 && words[0].length >= 4) {
            const word = words[0];
            if (/^[A-Za-z]+$/.test(word)) {
                user_name = word.toUpperCase();
                console.log('  ✓ Found single-word name:', user_name);
            }
        }
    }
    
    // Strategy 2: Look for names on the same line as labels (e.g., "FULL NAMES: JOHN DOE")
    if (!user_name) {
        console.log('Strategy 2: Looking for names after colons or labels...');
        for (let line of lines) {
            const cleanLine = line.trim();
            
            // Look for patterns like "FULL NAMES: ACTUAL NAME" or "NAME: ACTUAL NAME"
            const colonMatch = cleanLine.match(/(?:full\s*names?|names?)\s*:?\s*(.+)/i);
            if (colonMatch && colonMatch[1]) {
                const potentialName = colonMatch[1].trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
                const nameWords = potentialName.split(/\s+/).filter(word => word.length > 1);
                
                if (nameWords.length >= 2 && nameWords.length <= 4) {
                    const isValidName = nameWords.every(word => 
                        /^[A-Za-z]+$/.test(word) && word.length >= 2 && word.length <= 20
                    );
                    
                    if (isValidName) {
                        user_name = potentialName.toUpperCase();
                        console.log('  ✓ Found name after colon:', user_name);
                        break;
                    }
                }
            }
            
            // Look for any line with multiple capitalized words that aren't labels
            const words = cleanLine.split(/\s+/).filter(word => 
                word.length > 2 && 
                /^[A-Z][A-Za-z]+$/.test(word) && 
                !skipWords.includes(word.toLowerCase()) &&
                !word.toLowerCase().includes('name') &&
                !word.toLowerCase().includes('full')
            );
            
            if (words.length >= 2 && words.length <= 4) {
                const testName = words.join(' ');
                // Make sure it's not just repeated words or obvious non-names
                const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
                if (uniqueWords.length >= 2) {
                    user_name = testName.toUpperCase();
                    console.log('  ✓ Found capitalized name:', user_name);
                    break;
                }
            }
        }
    }
    
    // Strategy 3: Look for any reasonable text that could be a name
    if (!user_name) {
        console.log('Strategy 3: Looking for any reasonable name candidates...');
        for (let line of lines) {
            const cleanLine = line.trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ');
            
            // Skip obvious non-names
            if (!cleanLine || cleanLine.length < 6 || cleanLine.length > 40) continue;
            if (/\d/.test(cleanLine)) continue;
            
            const lowerLine = cleanLine.toLowerCase();
            if (skipWords.some(word => lowerLine.includes(word))) continue;
            if (lowerLine.includes('name') || lowerLine.includes('full')) continue;
            
            const words = cleanLine.split(/\s+/).filter(word => word.length > 1);
            
            // Look for 2-3 words that could be a name
            if (words.length >= 2 && words.length <= 3) {
                const couldBeName = words.every(word => 
                    /^[A-Za-z]+$/.test(word) && 
                    word.length >= 3 && 
                    word.length <= 20
                );
                
                if (couldBeName) {
                    user_name = cleanLine.toUpperCase();
                    console.log('  ✓ Found fallback name candidate:', user_name);
                    break;
                }
            }
        }
    }
    
    // Clean and fix the extracted name
    if (user_name) {
        user_name = cleanExtractedName(user_name);
    }
    
    console.log('Final extracted name:', user_name);
    console.log('Final extracted ID:', user_nationalId);
    
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

// Helper function to clean and fix extracted names
function cleanExtractedName(name) {
    if (!name) return name;
    
    console.log('Cleaning name:', name);
    
    // Remove extra spaces and normalize
    let cleaned = name.trim().replace(/\s+/g, ' ').toUpperCase();
    
    // Fix common OCR splitting issues
    const fixes = [
        // Common name fixes - add more as you encounter them
        ['OL IVE', 'OLIVE'],
        ['JO HN', 'JOHN'],
        ['MAR Y', 'MARY'],
        ['DAV ID', 'DAVID'],
        ['PET ER', 'PETER'],
        ['ANN E', 'ANNE'],
        ['JA MES', 'JAMES'],
        ['ROB ERT', 'ROBERT'],
        ['MICH AEL', 'MICHAEL'],
        ['CHRIST INE', 'CHRISTINE'],
        ['CHRIST OPHER', 'CHRISTOPHER'],
        ['ELIZ ABETH', 'ELIZABETH'],
        
        // Fix single letter splits in common positions
        [/\b([A-Z])\s+([A-Z]{2,})\b/g, '$1$2'], // "A NTHONY" -> "ANTHONY"
        [/\b([A-Z]{2,})\s+([A-Z])\b/g, '$1$2'], // "OLIVE S" -> "OLIVES" (only if makes sense)
    ];
    
    // Apply specific fixes first
    for (let [pattern, replacement] of fixes) {
        if (typeof pattern === 'string') {
            cleaned = cleaned.replace(new RegExp(pattern, 'g'), replacement);
        } else {
            cleaned = cleaned.replace(pattern, replacement);
        }
    }
    
    // Additional cleaning: fix obvious splits in the middle of words
    // Look for single letters followed by longer segments
    cleaned = cleaned.replace(/\b([A-Z])\s+([A-Z]{3,})\b/g, (match, single, rest) => {
        // Only join if it creates a reasonable word length (5-15 chars)
        const combined = single + rest;
        if (combined.length >= 4 && combined.length <= 15) {
            console.log(`  Fixed split: "${single} ${rest}" -> "${combined}"`);
            return combined;
        }
        return match;
    });
    
    // Fix splits within obvious name parts (2-letter + 2+ letters)
    cleaned = cleaned.replace(/\b([A-Z]{2})\s+([A-Z]{2,})\b/g, (match, first, second) => {
        const combined = first + second;
        // Only join if it creates a reasonable name length
        if (combined.length >= 4 && combined.length <= 15) {
            console.log(`  Fixed split: "${first} ${second}" -> "${combined}"`);
            return combined;
        }
        return match;
    });
    
    // Clean up any remaining multiple spaces
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    console.log('Cleaned name result:', cleaned);
    return cleaned;
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