const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    // Basic user info (matching your existing auth controllers)
    user_name: {type: String, required: true, trim: true},
    user_nationalId: {type: String, required: true, unique: true, trim: true},
    phoneNumber: {type: String, required: true, trim: true},
    
    // PIN-based authentication (matching your auth system)
    user_pin: {type: String}, // Not required initially - set during PIN creation
    pin_set: {type: Boolean, default: false}, // Track PIN status
    temp_token: {type: String}, // For PIN setup session
    
    // Registration status tracking
    isRegistered: {type: Boolean, default: false}, // Complete registration status
    phoneVerified: {type: Boolean, default: false}, // OTP verification status
    
    // ID Verification fields (for Cloud Vision + Cloudinary)
    idVerified: {
        type: Boolean,
        default: false
    },
    idVerification: {
        // Image URLs from Cloudinary
        idImageUrl: {
            type: String,
            default: null
        },
        selfieUrl: {
            type: String,
            default: null
        },
        
        // OCR extracted text from Cloud Vision
        extractedText: {
            type: String,
            default: null
        },
        
        // Validation results
        validationChecks: {
            hasName: { type: Boolean, default: false },
            hasIdNumber: { type: Boolean, default: false },
            hasDateOfBirth: { type: Boolean, default: false },
            nameMatches: { type: Boolean, default: false },
            hasValidIdKeywords: { type: Boolean, default: false }
        },
        
        // Verification score (0-100) for auto-approval at 60%+
        verificationScore: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        
        // Face detection results
        hasFaceInId: {
            type: Boolean,
            default: false
        },
        hasFaceInSelfie: {
            type: Boolean,
            default: false
        },
        
        // Status tracking
        status: {
            type: String,
            enum: ['not_submitted', 'pending', 'approved', 'rejected'],
            default: 'not_submitted'
        },
        
        // Timestamps
        submittedAt: {
            type: Date,
            default: null
        },
        verifiedAt: {
            type: Date,
            default: null
        },
        
        // Admin review (optional - for manual reviews)
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        },
        rejectionReason: {
            type: String,
            default: null
        }
    },
    
    // Account status
    isActive: {
        type: Boolean,
        default: true
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, {timestamps: true});

// Method to check if user is fully verified
userSchema.methods.isVerified = function() {
    return this.idVerified === true && this.idVerification.status === 'approved';
};

// Method to get verification status
userSchema.methods.getVerificationStatus = function() {
    return {
        verified: this.idVerified,
        status: this.idVerification.status,
        score: this.idVerification.verificationScore,
        submittedAt: this.idVerification.submittedAt,
        verifiedAt: this.idVerification.verifiedAt
    };
};

// Virtual for full verification details (admin use)
userSchema.virtual('verificationDetails').get(function() {
    return {
        ...this.idVerification,
        user: {
            id: this._id,
            user_name: this.user_name,
            user_nationalId: this.user_nationalId,
            phoneNumber: this.phoneNumber
        }
    };
});

// Ensure virtuals are included in JSON
userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model("User", userSchema);