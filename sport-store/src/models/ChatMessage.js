import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema({
    senderId: {
        type: String,
        required: true,
        index: true
    },
    senderName: {
        type: String,
        required: true
    },
    senderPhone: {
        type: String,
        sparse: true,
        index: true
    },
    senderEmail: {
        type: String,
        sparse: true,
        index: true
    },
    recipientId: {
        type: String,
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true,
        maxlength: [1000, 'Tin nhắn không được vượt quá 1000 ký tự']
    },
    messageType: {
        type: String,
        enum: ['text', 'image', 'file'],
        default: 'text'
    },
    isRead: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    // Thông tin user nếu có
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        sparse: true
    },
    // Thông tin session để theo dõi cuộc trò chuyện
    sessionId: {
        type: String,
        index: true
    }
}, {
    timestamps: true
});

// Index để tối ưu truy vấn
chatMessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
chatMessageSchema.index({ sessionId: 1, createdAt: -1 });

// Virtual để tính thời gian đã trôi qua
chatMessageSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const diffInSeconds = Math.floor((now - this.createdAt) / 1000);
    
    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
});

// Method để format thời gian
chatMessageSchema.methods.getFormattedTime = function() {
    return this.createdAt.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Method để format ngày
chatMessageSchema.methods.getFormattedDate = function() {
    return this.createdAt.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

// Static method để lấy tin nhắn theo session
chatMessageSchema.statics.getMessagesBySession = function(sessionId, limit = 50) {
    return this.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .sort({ createdAt: 1 });
};

// Static method để lấy tin nhắn giữa 2 user
chatMessageSchema.statics.getMessagesBetweenUsers = function(userId1, userId2, limit = 50) {
    return this.find({
        $or: [
            { senderId: userId1, recipientId: userId2 },
            { senderId: userId2, recipientId: userId1 }
        ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .sort({ createdAt: 1 });
};

// Static method để đánh dấu tin nhắn đã đọc
chatMessageSchema.statics.markAsRead = function(senderId, recipientId) {
    return this.updateMany(
        { senderId, recipientId, isRead: false },
        { isRead: true }
    );
};

// Static method để lấy số tin nhắn chưa đọc
chatMessageSchema.statics.getUnreadCount = function(recipientId) {
    return this.countDocuments({ recipientId, isRead: false });
};

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage; 