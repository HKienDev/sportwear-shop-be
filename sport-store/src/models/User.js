import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Constants
const MEMBERSHIP_LEVELS = {
    BRONZE: "Đồng",
    SILVER: "Bạc",
    GOLD: "Vàng",
    PLATINUM: "Bạch Kim",
    DIAMOND: "Kim Cương"
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
    // Thông tin cơ bản (Basic Information)
    customId: {
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
        required: true,
        trim: true,
        maxlength: [100, 'Họ tên không được vượt quá 100 ký tự']
    },
    phone: { 
        type: String, 
        required: function () { return !this.googleId; },
        trim: true,
        match: [/^[0-9]{10}$/, 'Số điện thoại không hợp lệ']
    },
    avatar: { 
        type: String, 
        default: "",
        trim: true
    },
    gender: { 
        type: String, 
        enum: Object.values(GENDERS),
        default: GENDERS.OTHER
    },
    dob: { 
        type: Date, 
        default: null 
    },

    // Thông tin địa chỉ (Address Information)
    address: {
        province: { type: String, default: "" },
        district: { type: String, default: "" },
        ward: { type: String, default: "" },
        street: { type: String, default: "" }
    },

    // Thông tin xác thực (Authentication Information)
    googleId: { 
        type: String, 
        sparse: true,
        trim: true,
        default: null
    },
    googleEmail: { 
        type: String, 
        trim: true,
        default: null
    },
    isVerified: { 
        type: Boolean, 
        default: false 
    },
    authStatus: {
        type: String,
        enum: Object.values(AUTH_STATUS),
        default: AUTH_STATUS.PENDING
    },
    refreshToken: { 
        type: String, 
        select: false 
    },

    // Thông tin phân quyền (Authorization Information)
    role: { 
        type: String, 
        default: ROLES.USER,
        enum: Object.values(ROLES)
    },
    isActive: { 
        type: Boolean, 
        default: true 
    },

    // Thông tin thành viên (Membership Information)
    membershipLevel: { 
        type: String, 
        default: MEMBERSHIP_LEVELS.BRONZE,
        enum: Object.values(MEMBERSHIP_LEVELS)
    },
    totalSpent: { 
        type: Number, 
        default: 0 
    },
    orderCount: { 
        type: Number, 
        default: 0 
    },

    // Thông tin bảo mật (Security Information)
    resetPasswordToken: { 
        type: String, 
        select: false 
    },
    resetPasswordExpires: { 
        type: Date, 
        select: false 
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

    // Thông tin hoạt động (Activity Information)
    lastLoginAt: {
        type: Date,
        default: null
    },

    // Thông tin khác (Other Information)
    createdAt: { 
        type: Date, 
        default: Date.now 
    },
    pendingUpdate: { 
        type: Object, 
        default: {} 
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
    if (this.totalSpent >= 50000000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.DIAMOND;
    } else if (this.totalSpent >= 10000000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.PLATINUM;
    } else if (this.totalSpent >= 5000000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.GOLD;
    } else if (this.totalSpent >= 2000000) {
        this.membershipLevel = MEMBERSHIP_LEVELS.SILVER;
    } else {
        this.membershipLevel = MEMBERSHIP_LEVELS.BRONZE;
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
    // Hash password if modified and not already hashed
    if (!this.isModified("password") || this.password.startsWith("$2a$10$")) {
        // Skip password hashing
    } else {
        this.password = await bcrypt.hash(this.password, 10);
    }
    
    // Generate customId if not exists
    if (!this.customId) {
        this.customId = `VJUSPORTUSER-${this._id.toString().slice(0, 8)}`;
    }
    
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
userSchema.index({ "address.province": 1 });
userSchema.index({ "address.district": 1 });
userSchema.index({ "address.ward": 1 });

// Export model
const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;