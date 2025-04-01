import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Constants
const MEMBERSHIP_LEVELS = {
    IRON: "Hạng Sắt",
    SILVER: "Hạng Bạc",
    GOLD: "Hạng Vàng",
    PLATINUM: "Hạng Bạch Kim",
    DIAMOND: "Hạng Kim Cương"
};

const GENDERS = {
    MALE: "male",
    FEMALE: "female",
    OTHER: "other"
};

const ROLES = {
    USER: "user",
    ADMIN: "admin"
};

const AUTH_STATUS = {
    PENDING: "pending",
    VERIFIED: "verified",
    BLOCKED: "blocked"
};

// Schema
const userSchema = new mongoose.Schema({
    googleId: { 
        type: String, 
        unique: true, 
        sparse: true,
        trim: true
    },
    email: { 
        type: String, 
        required: true, 
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    password: { 
        type: String, 
        required: function () { return !this.googleId; },
        minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự']
    },
    fullname: { 
        type: String, 
        default: "",
        trim: true,
        maxlength: [100, 'Họ tên không được vượt quá 100 ký tự']
    },
    username: { 
        type: String, 
        required: function () { return !this.googleId; },
        trim: true,
        minlength: [3, 'Tên đăng nhập phải có ít nhất 3 ký tự'],
        maxlength: [30, 'Tên đăng nhập không được vượt quá 30 ký tự']
    },
    phone: { 
        type: String, 
        default: "",
        trim: true,
        match: [/^[0-9]{10}$/, 'Số điện thoại không hợp lệ']
    },
    avatar: { 
        type: String, 
        default: "",
        trim: true
    },
    role: { 
        type: String, 
        default: ROLES.USER,
        enum: Object.values(ROLES)
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },
    authStatus: {
        type: String,
        enum: Object.values(AUTH_STATUS),
        default: AUTH_STATUS.PENDING
    },
    lastLoginAt: {
        type: Date,
        default: null
    },
    loginAttempts: {
        type: Number,
        default: 0,
        min: [0, 'Số lần đăng nhập không thể âm']
    },
    lockedUntil: {
        type: Date,
        default: null
    },
    refreshToken: { 
        type: String,
        select: false
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    otp: { 
        type: String, 
        default: null,
        select: false
    },
    otpExpires: { 
        type: Date, 
        default: null,
        select: false
    },
    resetPasswordToken: { 
        type: String, 
        default: null,
        select: false
    },
    resetPasswordExpires: { 
        type: Date, 
        default: null,
        select: false
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    address: {
        province: { 
            type: String, 
            default: "",
            trim: true
        },
        district: { 
            type: String, 
            default: "",
            trim: true
        },
        ward: { 
            type: String, 
            default: "",
            trim: true
        },
        street: { 
            type: String, 
            default: "",
            trim: true
        }
    },
    dob: { 
        type: Date, 
        default: null 
    },
    gender: { 
        type: String, 
        enum: Object.values(GENDERS), 
        default: GENDERS.OTHER 
    },
    membershipLevel: { 
        type: String, 
        enum: Object.values(MEMBERSHIP_LEVELS), 
        default: MEMBERSHIP_LEVELS.IRON 
    },
    totalSpent: { 
        type: Number, 
        default: 0,
        min: [0, 'Tổng chi tiêu không thể âm']
    },
    pendingUpdate: { 
        type: Object, 
        default: {} 
    },
    orderCount: { 
        type: Number, 
        default: 0,
        min: [0, 'Số đơn hàng không thể âm']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual fields
userSchema.virtual('age').get(function() {
    if (!this.dob) return null;
    const today = new Date();
    let age = today.getFullYear() - this.dob.getFullYear();
    const monthDiff = today.getMonth() - this.dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < this.dob.getDate())) {
        age--;
    }
    return age;
});

userSchema.virtual('fullAddress').get(function() {
    const { province, district, ward, street } = this.address;
    return [street, ward, district, province].filter(Boolean).join(', ');
});

userSchema.virtual('isBlocked').get(function() {
    return this.authStatus === AUTH_STATUS.BLOCKED && this.lockedUntil > new Date();
});

// Methods
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        if (!this.password) {
            throw new Error('Password not set');
        }
        const isMatch = await bcrypt.compare(candidatePassword, this.password);
        if (isMatch) {
            await this.resetLoginAttempts();
        } else {
            await this.incrementLoginAttempts();
        }
        return isMatch;
    } catch (error) {
        console.error('Error comparing passwords:', error);
        throw error;
    }
};

userSchema.methods.generateOTP = function() {
    this.otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 phút
    return this.otp;
};

userSchema.methods.generateResetToken = function() {
    this.resetPasswordToken = crypto.randomBytes(32).toString('hex');
    this.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000); // 30 phút
    return this.resetPasswordToken;
};

userSchema.methods.updateMembershipLevel = function() {
    if (this.totalSpent >= 10000000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.DIAMOND;
    } else if (this.totalSpent >= 5000000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.PLATINUM;
    } else if (this.totalSpent >= 2000000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.GOLD;
    } else if (this.totalSpent >= 500000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.SILVER;
    }
};

userSchema.methods.incrementLoginAttempts = async function() {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
        this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 phút
        this.authStatus = AUTH_STATUS.BLOCKED;
    }
    return this.save();
};

userSchema.methods.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lockedUntil = null;
    if (this.authStatus === AUTH_STATUS.BLOCKED) {
        this.authStatus = AUTH_STATUS.VERIFIED;
    }
    return this.save();
};

userSchema.methods.updateLastLogin = async function() {
    this.lastLoginAt = new Date();
    return this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByPhone = function(phone) {
    return this.findOne({ phone });
};

userSchema.statics.findByGoogleId = function(googleId) {
    return this.findOne({ googleId });
};

userSchema.statics.findActive = function() {
    return this.find({ 
        isActive: true,
        authStatus: AUTH_STATUS.VERIFIED
    });
};

userSchema.statics.findBlocked = function() {
    return this.find({ 
        authStatus: AUTH_STATUS.BLOCKED,
        lockedUntil: { $gt: new Date() }
    });
};

// Pre-save middleware
userSchema.pre("save", async function(next) {
    if (this.isNew) {
        this.authStatus = AUTH_STATUS.PENDING;
    }
    
    if (!this.isModified("password") || this.password.startsWith("$2a$10$")) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Indexes
userSchema.index({ phone: 1 });
userSchema.index({ role: 1 });
userSchema.index({ membershipLevel: 1 });
userSchema.index({ totalSpent: -1 });
userSchema.index({ orderCount: -1 });
userSchema.index({ authStatus: 1 });
userSchema.index({ lastLoginAt: -1 });
userSchema.index({ loginAttempts: 1 });
userSchema.index({ lockedUntil: 1 });

// Export model
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;