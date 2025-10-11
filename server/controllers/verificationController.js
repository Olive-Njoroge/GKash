// const vision = require('@google-cloud/vision');
// const User = require('../models/User');

// // Initialize Google Vision API
// const visionClient = new vision.ImageAnnotatorClient({
//     keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-cloud-key.json'
// });

// // @desc    Verify user ID
// // @route   POST /api/verification/verify-id
// // @access  Private
// exports.verifyId = async (req, res) => {
//     try {
//         const user = await User.findById(req.userId); // Fixed to match your auth middleware
        
//         if (!user) {
//             return res.status(404).json({ 
//                 success: false, 
//                 error: 'User not found' 
//             });
//         }

//         // Check if files were uploaded
//         if (!req.files || !req.files.idFront || !req.files.selfie) {
//             return res.status(400).json({ 
//                 success: false, 
//                 error: 'Please upload both ID and selfie images' 
//             });
//         }

//         const idImageUrl = req.files.idFront[0].path;
//         const selfieUrl = req.files.selfie[0].path;

//         console.log('Processing ID verification for user:', user._id);
//         console.log('ID Image URL:', idImageUrl);
//         console.log('Selfie URL:', selfieUrl);

//         // Step 1: Extract text from ID using OCR
//         const [textResult] = await visionClient.textDetection(idImageUrl);
//         const detections = textResult.textAnnotations;
//         const extractedText = detections[0]?.description || '';

//         console.log('Extracted text from ID:', extractedText);

//         // Step 2: Perform validation checks
//         const validationChecks = {
//             hasName: false,
//             hasIdNumber: false,
//             hasDateOfBirth: false,
//             nameMatches: false,
//             hasValidIdKeywords: false
//         };

//         // Check for name match (case-insensitive, partial match)
//         const userName = user.user_name.toLowerCase().trim();
//         const userNameParts = userName.split(' ');
        
//         // Check if any part of the user's name appears in the extracted text
//         validationChecks.hasName = userNameParts.some(namePart => 
//             extractedText.toLowerCase().includes(namePart) && namePart.length > 2
//         );
//         validationChecks.nameMatches = validationChecks.hasName;

//         // Check for ID number (Kenyan format: typically 7-8 digits)
//         const idNumberPattern = /\b\d{7,8}\b/;
//         validationChecks.hasIdNumber = idNumberPattern.test(extractedText);

//         // Check for date of birth (various formats)
//         const dobPatterns = [
//             /\d{2}[-/.]\d{2}[-/.]\d{4}/, // DD-MM-YYYY
//             /\d{4}[-/.]\d{2}[-/.]\d{2}/, // YYYY-MM-DD
//             /\d{2}\s+[A-Za-z]{3}\s+\d{4}/ // DD Mon YYYY
//         ];
//         validationChecks.hasDateOfBirth = dobPatterns.some(pattern => 
//             pattern.test(extractedText)
//         );

//         // Check for Kenyan ID keywords
//         const idKeywords = ['republic', 'kenya', 'identity', 'card', 'national'];
//         validationChecks.hasValidIdKeywords = idKeywords.some(keyword => 
//             extractedText.toLowerCase().includes(keyword)
//         );

//         // Step 3: Face detection on ID to ensure it's a real ID card
//         const [faceResult] = await visionClient.faceDetection(idImageUrl);
//         const facesInId = faceResult.faceAnnotations || [];
//         const hasFaceInId = facesInId.length > 0;

//         // Step 4: Face detection on selfie
//         const [selfieFaceResult] = await visionClient.faceDetection(selfieUrl);
//         const facesInSelfie = selfieFaceResult.faceAnnotations || [];
//         const hasFaceInSelfie = facesInSelfie.length > 0;

//         // Step 5: Calculate verification score
//         const checksCount = Object.values(validationChecks).filter(v => v).length;
//         const totalChecks = Object.keys(validationChecks).length;
//         let verificationScore = (checksCount / totalChecks) * 100;

//         // Add bonus points for face detection
//         if (hasFaceInId) verificationScore += 10;
//         if (hasFaceInSelfie) verificationScore += 10;

//         // Cap at 100
//         verificationScore = Math.min(verificationScore, 100);

//         // Step 6: Determine if verified (require 60% score + faces in both images)
//         const isVerified = verificationScore >= 60 && hasFaceInId && hasFaceInSelfie;

//         console.log('Verification checks:', validationChecks);
//         console.log('Verification score:', verificationScore);
//         console.log('Has face in ID:', hasFaceInId);
//         console.log('Has face in selfie:', hasFaceInSelfie);
//         console.log('Final verification status:', isVerified);

//         // Step 7: Update user record
//         const updateData = {
//             idVerified: isVerified,
//             idVerification: {
//                 idImageUrl: idImageUrl,
//                 selfieUrl: selfieUrl,
//                 extractedText: extractedText,
//                 validationChecks: validationChecks,
//                 verificationScore: Math.round(verificationScore),
//                 hasFaceInId: hasFaceInId,
//                 hasFaceInSelfie: hasFaceInSelfie,
//                 verifiedAt: isVerified ? new Date() : null,
//                 status: isVerified ? 'approved' : 'rejected',
//                 submittedAt: new Date()
//             }
//         };

//         await User.findByIdAndUpdate(req.user._id, updateData, { new: true });

//         // Step 8: Send response
//         res.json({
//             success: true,
//             verified: isVerified,
//             score: Math.round(verificationScore),
//             checks: {
//                 ...validationChecks,
//                 hasFaceInId,
//                 hasFaceInSelfie
//             },
//             message: isVerified 
//                 ? '✅ ID verification successful! Your account is now verified.' 
//                 : '❌ ID verification failed. Please ensure:\n- Your ID is clear and well-lit\n- Your name matches your account\n- Both ID and selfie show your face clearly'
//         });

//     } catch (error) {
//         console.error('ID Verification error:', error);
//         res.status(500).json({ 
//             success: false, 
//             error: 'Verification failed. Please try again.',
//             details: process.env.NODE_ENV === 'development' ? error.message : undefined
//         });
//     }
// };

// // @desc    Get verification status
// // @route   GET /api/verification/verification-status
// // @access  Private
// exports.getVerificationStatus = async (req, res) => {
//     try {
//         const user = await User.findById(req.userId).select('idVerified idVerification');
        
//         res.json({
//             success: true,
//             verified: user.idVerified || false,
//             status: user.idVerification?.status || 'not_submitted',
//             score: user.idVerification?.verificationScore || 0,
//             submittedAt: user.idVerification?.submittedAt || null,
//             verifiedAt: user.idVerification?.verifiedAt || null
//         });
//     } catch (error) {
//         console.error('Status check error:', error);
//         res.status(500).json({ 
//             success: false, 
//             error: 'Failed to get verification status' 
//         });
//     }
// };

// // @desc    Admin approve/reject verification
// // @route   PATCH /api/verification/admin/verify-user/:userId
// // @access  Private/Admin
// exports.adminVerifyUser = async (req, res) => {
//     try {
//         const { status, reason } = req.body; // 'approved' or 'rejected'

//         if (!['approved', 'rejected'].includes(status)) {
//             return res.status(400).json({ 
//                 success: false, 
//                 error: 'Invalid status. Use "approved" or "rejected"' 
//             });
//         }

//         const user = await User.findByIdAndUpdate(
//             req.params.userId,
//             {
//                 idVerified: status === 'approved',
//                 'idVerification.status': status,
//                 'idVerification.verifiedAt': status === 'approved' ? new Date() : null,
//                 'idVerification.rejectionReason': reason || null,
//                 'idVerification.reviewedBy': req.userId,
//                 'idVerification.reviewedAt': new Date()
//             },
//             { new: true }
//         );

//         if (!user) {
//             return res.status(404).json({ 
//                 success: false, 
//                 error: 'User not found' 
//             });
//         }

//         res.json({ 
//             success: true, 
//             message: `User ${status}`,
//             user: {
//                 id: user._id,
//                 verified: user.idVerified,
//                 status: user.idVerification.status
//             }
//         });
//     } catch (error) {
//         console.error('Admin verification error:', error);
//         res.status(500).json({ 
//             success: false, 
//             error: 'Failed to update verification status' 
//         });
//     }
// };

const vision = require('@google-cloud/vision');
const User = require('../models/User');

// Initialize Google Vision API (UPDATED - fixes deprecation warning)
const visionClient = new vision.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS || './google-cloud-key.json'
});

// @desc    Verify user ID
// @route   POST /api/verification/verify-id
// @access  Private
exports.verifyId = async (req, res) => {
    try {
        const user = await User.findById(req.userId); // Your auth uses req.userId
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Check if files were uploaded
        if (!req.files || !req.files.idFront || !req.files.selfie) {
            return res.status(400).json({ 
                success: false, 
                error: 'Please upload both ID and selfie images' 
            });
        }

        const idImageUrl = req.files.idFront[0].path;
        const selfieUrl = req.files.selfie[0].path;

        console.log('🔍 Processing ID verification for user:', user._id);
        console.log('📸 ID Image URL:', idImageUrl);
        console.log('🤳 Selfie URL:', selfieUrl);

        // Step 1: Extract text from ID using OCR
        const [textResult] = await visionClient.textDetection(idImageUrl);
        const detections = textResult.textAnnotations;
        const extractedText = detections[0]?.description || '';

        console.log('📄 Extracted text:', extractedText.substring(0, 100) + '...');

        // Step 2: Perform validation checks
        const validationChecks = {
            hasName: false,
            hasIdNumber: false,
            hasDateOfBirth: false,
            nameMatches: false,
            hasValidIdKeywords: false
        };

        // Check for name match (using your user_name field)
        const userName = user.user_name.toLowerCase().trim();
        const userNameParts = userName.split(' ');
        
        validationChecks.hasName = userNameParts.some(namePart => 
            extractedText.toLowerCase().includes(namePart) && namePart.length > 2
        );
        validationChecks.nameMatches = validationChecks.hasName;

        // Check for ID number (Kenyan format: 7-8 digits)
        validationChecks.hasIdNumber = /\b\d{7,8}\b/.test(extractedText);

        // Check for date of birth
        const dobPatterns = [
            /\d{2}[-/.]\d{2}[-/.]\d{4}/,
            /\d{4}[-/.]\d{2}[-/.]\d{2}/,
            /\d{2}\s+[A-Za-z]{3}\s+\d{4}/
        ];
        validationChecks.hasDateOfBirth = dobPatterns.some(pattern => pattern.test(extractedText));

        // Check for Kenyan ID keywords
        const idKeywords = ['republic', 'kenya', 'identity', 'card', 'national'];
        validationChecks.hasValidIdKeywords = idKeywords.some(keyword => 
            extractedText.toLowerCase().includes(keyword)
        );

        // Step 3: Face detection on ID
        const [faceResult] = await visionClient.faceDetection(idImageUrl);
        const facesInId = faceResult.faceAnnotations || [];
        const hasFaceInId = facesInId.length > 0;

        // Step 4: Face detection on selfie
        const [selfieFaceResult] = await visionClient.faceDetection(selfieUrl);
        const facesInSelfie = selfieFaceResult.faceAnnotations || [];
        const hasFaceInSelfie = facesInSelfie.length > 0;

        // Step 5: Calculate verification score
        const checksCount = Object.values(validationChecks).filter(v => v).length;
        const totalChecks = Object.keys(validationChecks).length;
        let verificationScore = (checksCount / totalChecks) * 100;

        if (hasFaceInId) verificationScore += 10;
        if (hasFaceInSelfie) verificationScore += 10;
        verificationScore = Math.min(verificationScore, 100);

        // Step 6: Auto-approve if score >= 60%
        const isVerified = verificationScore >= 60 && hasFaceInId && hasFaceInSelfie;

        console.log('✅ Checks:', validationChecks);
        console.log('📊 Score:', Math.round(verificationScore) + '%');
        console.log('👤 Face in ID:', hasFaceInId);
        console.log('🤳 Face in selfie:', hasFaceInSelfie);
        console.log('🎯 Result:', isVerified ? 'APPROVED ✅' : 'REJECTED ❌');

        // Step 7: Update user
        await User.findByIdAndUpdate(req.userId, {
            idVerified: isVerified,
            idVerification: {
                idImageUrl: idImageUrl,
                selfieUrl: selfieUrl,
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

        // Step 8: Send response
        res.json({
            success: true,
            verified: isVerified,
            score: Math.round(verificationScore),
            checks: {
                ...validationChecks,
                hasFaceInId,
                hasFaceInSelfie
            },
            message: isVerified 
                ? '✅ ID verification successful! Your account is now verified.' 
                : '❌ ID verification failed. Please try again with:\n- A clear, well-lit photo of your ID\n- Your name matching your account name\n- A clear selfie showing your face'
        });

    } catch (error) {
        console.error('❌ Verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Verification failed. Please try again.',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get verification status
// @route   GET /api/verification/status
// @access  Private
exports.getVerificationStatus = async (req, res) => {
    try {
        const user = await User.findById(req.userId).select('idVerified idVerification');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            verified: user.idVerified || false,
            status: user.idVerification?.status || 'not_submitted',
            score: user.idVerification?.verificationScore || 0,
            submittedAt: user.idVerification?.submittedAt || null,
            verifiedAt: user.idVerification?.verifiedAt || null
        });
    } catch (error) {
        console.error('❌ Status check error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get verification status' 
        });
    }
};

// @desc    Admin approve/reject verification
// @route   PATCH /api/verification/admin/verify-user/:userId
// @access  Private/Admin
exports.adminVerifyUser = async (req, res) => {
    try {
        const { status, reason } = req.body; // 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid status. Use "approved" or "rejected"' 
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.userId,
            {
                idVerified: status === 'approved',
                'idVerification.status': status,
                'idVerification.verifiedAt': status === 'approved' ? new Date() : null,
                'idVerification.rejectionReason': reason || null,
                'idVerification.reviewedBy': req.userId,
                'idVerification.reviewedAt': new Date()
            },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        res.json({ 
            success: true, 
            message: `User ${status}`,
            user: {
                id: user._id,
                verified: user.idVerified,
                status: user.idVerification.status
            }
        });
    } catch (error) {
        console.error('❌ Admin verification error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update verification status' 
        });
    }
};