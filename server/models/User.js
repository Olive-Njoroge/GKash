const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    // Basic user info
    user_name: {
        type: String, 
        required: true, 
        trim: true
    },
    user_nationalId: {
        type: String, 
        required: true, 
        unique: true, 
        trim: true
    },
    phoneNumber: {
        type: String, 
        required: false,  // ✅ Changed to false - will be added in Step 2
        trim: true,
        sparse: true,     // ✅ Allow multiple null/undefined values
        default: null
    },
    
    // PIN-based authentication
    user_pin: {
        type: String,
        default: null
    },
    pin_set: {
        type: Boolean, 
        default: false
    },
    temp_token: {
        type: String,
        default: null
    },
    
    // Registration status tracking
    isRegistered: {
        type: Boolean, 
        default: false
    },
    phoneVerified: {
        type: Boolean, 
        default: false
    },
    
    // ID Verification fields
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
        
        // OCR extracted text
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
        
        // Verification score (0-100)
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
        
        // Admin review (optional)
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

// Add unique index on phoneNumber only for non-null values
userSchema.index({ phoneNumber: 1 }, { 
    unique: true, 
    sparse: true,
    partialFilterExpression: { phoneNumber: { $type: "string", $ne: null } }
});

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

// Method to check if registration is complete
userSchema.methods.isRegistrationComplete = function() {
    return this.phoneNumber && 
           this.phoneNumber !== 'TEMP_PHONE' && 
           this.pin_set && 
           this.isRegistered;
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