import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { logInfo, logError } from '../utils/logger.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseUtils.js';
import { getMembershipTier } from '../utils/membershipUtils.js';
import mongoose from 'mongoose';

// Lấy lịch sử tin nhắn theo session
export const getMessageHistory = async (req, res) => {
    try {
        const { sessionId, userId } = req.query;
        
        if (!sessionId && !userId) {
            return sendErrorResponse(res, 400, 'SessionId hoặc userId là bắt buộc');
        }

        let messages;
        if (sessionId) {
            messages = await ChatMessage.getMessagesBySession(sessionId, 100);
        } else {
            // Lấy tin nhắn giữa user và admin
            messages = await ChatMessage.getMessagesBetweenUsers(userId, 'admin', 100);
        }

        // Format tin nhắn để gửi về client
        const formattedMessages = messages.map(msg => ({
            senderId: msg.senderId,
            senderName: msg.senderName,
            text: msg.text,
            timestamp: msg.createdAt,
            isAdmin: msg.isAdmin,
            isRead: msg.isRead
        }));

        return sendSuccessResponse(res, 200, 'Lấy lịch sử tin nhắn thành công', {
            messages: formattedMessages
        });

    } catch (error) {
        logError('Error in getMessageHistory:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Lấy danh sách cuộc trò chuyện cho admin
export const getConversations = async (req, res) => {
    try {
        // Lấy tất cả tin nhắn nhóm theo senderId (user)
        const conversations = await ChatMessage.aggregate([
            {
                $match: {
                    $or: [
                        { senderId: { $ne: 'admin' } },
                        { recipientId: { $ne: 'admin' } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ['$senderId', 'admin'] },
                            '$recipientId',
                            '$senderId'
                        ]
                    },
                    lastMessage: { $last: '$$ROOT' },
                    messageCount: { $sum: 1 },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $ne: ['$senderId', 'admin'] },
                                        { $eq: ['$isRead', false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $sort: { 'lastMessage.createdAt': -1 }
            }
        ]);

        // Format dữ liệu
        const formattedConversations = await Promise.all(
            conversations.map(async (conv) => {
                const userId = conv._id;
                
                // Tìm thông tin user nếu có
                let userInfo = null;
                let membershipTier = null;
                
                if (userId && !userId.startsWith('temp_') && !userId.startsWith('user_') && mongoose.Types.ObjectId.isValid(userId)) {
                    try {
                        userInfo = await User.findById(userId).select('fullname email phone totalSpent');
                        
                        if (userInfo) {
                            // Tính toán hạng thành viên dựa trên totalSpent
                            const totalSpent = userInfo.totalSpent || 0;
                            membershipTier = getMembershipTier(totalSpent);
                        }
                    } catch (error) {
                        logError(`Error finding user ${userId}:`, error);
                    }
                } else {
                    // Tìm thông tin từ tin nhắn đầu tiên của user này
                    try {
                        const firstMessage = await ChatMessage.findOne({
                            $or: [
                                { senderId: userId },
                                { recipientId: userId }
                            ]
                        }).sort({ createdAt: 1 });

                        if (firstMessage) {
                            // Lấy tên từ senderName nếu có
                            const userName = firstMessage.senderName || 
                                           (firstMessage.senderId === userId ? firstMessage.senderName : null) ||
                                           'Khách vãng lai';
                            
                            userInfo = {
                                fullname: userName,
                                email: null,
                                phone: null
                            };
                        } else {
                            // Fallback cho temporary users
                            userInfo = {
                                fullname: 'Khách vãng lai',
                                email: null,
                                phone: null
                            };
                        }
                    } catch (error) {
                        logError(`Error finding first message for ${userId}:`, error);
                        userInfo = {
                            fullname: 'Khách vãng lai',
                            email: null,
                            phone: null
                        };
                    }
                }

                return {
                    id: userId,
                    name: userInfo?.fullname || 'Unknown User',
                    lastMessage: conv.lastMessage.text || 'No messages yet',
                    lastMessageTime: conv.lastMessage.createdAt,
                    unread: conv.unreadCount || 0,
                    messageCount: conv.messageCount || 0,
                    userInfo: {
                        _id: userId,
                        id: userId,
                        name: userInfo?.fullname || 'Unknown User',
                        email: userInfo?.email || null,
                        phone: userInfo?.phone || null,
                        totalSpent: userInfo?.totalSpent || 0
                    },
                    membershipTier: membershipTier || null,
                    status: 'active',
                    priority: 'normal'
                };
            })
        );

        return sendSuccessResponse(res, 200, 'Lấy danh sách cuộc trò chuyện thành công', {
            conversations: formattedConversations
        });

    } catch (error) {
        logError('Error in getConversations:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Lấy tin nhắn theo conversationId (userId)
export const getMessagesByConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        if (!conversationId) {
            return sendErrorResponse(res, 400, 'ConversationId là bắt buộc');
        }

        // Lấy tin nhắn giữa user và admin
        const messages = await ChatMessage.getMessagesBetweenUsers(conversationId, 'admin', 100);

        // Format tin nhắn để gửi về client
        const formattedMessages = messages.map(msg => ({
            senderId: msg.senderId,
            senderName: msg.senderName,
            text: msg.text,
            timestamp: msg.createdAt,
            messageId: msg._id,
            isAdmin: msg.isAdmin,
            isRead: msg.isRead
        }));

        return sendSuccessResponse(res, 200, 'Lấy tin nhắn thành công', {
            messages: formattedMessages
        });

    } catch (error) {
        logError('Error in getMessagesByConversation:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Gửi tin nhắn
export const sendMessage = async (req, res) => {
    try {
        const { conversationId, message, senderId, senderName } = req.body;
        
        if (!conversationId || !message || !senderId) {
            return sendErrorResponse(res, 400, 'ConversationId, message và senderId là bắt buộc');
        }

        // Tạo tin nhắn mới
        const newMessage = new ChatMessage({
            senderId: senderId,
            recipientId: conversationId,
            text: message,
            senderName: senderName || senderId,
            isAdmin: senderId === 'admin',
            isRead: false
        });

        await newMessage.save();
        
        return sendSuccessResponse(res, 200, 'Gửi tin nhắn thành công', {
            message: newMessage
        });

    } catch (error) {
        logError('Error in sendMessage:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Đánh dấu tin nhắn đã đọc (cũ)
export const markAsRead = async (req, res) => {
    try {
        const { senderId, recipientId } = req.body;
        
        if (!senderId || !recipientId) {
            return sendErrorResponse(res, 400, 'SenderId và recipientId là bắt buộc');
        }

        await ChatMessage.markAsRead(senderId, recipientId);
        
        return sendSuccessResponse(res, 200, 'Đánh dấu đã đọc thành công');

    } catch (error) {
        logError('Error in markAsRead:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Đánh dấu tin nhắn đã đọc theo conversationId
export const markAsReadByConversation = async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        if (!conversationId) {
            return sendErrorResponse(res, 400, 'ConversationId là bắt buộc');
        }

        // Đánh dấu tất cả tin nhắn từ user này đến admin là đã đọc
        await ChatMessage.updateMany(
            {
                senderId: conversationId,
                recipientId: 'admin',
                isRead: false
            },
            {
                isRead: true
            }
        );
        
        return sendSuccessResponse(res, 200, 'Đánh dấu đã đọc thành công');

    } catch (error) {
        logError('Error in markAsReadByConversation:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Lấy số tin nhắn chưa đọc
export const getUnreadCount = async (req, res) => {
    try {
        const { recipientId } = req.params;
        
        if (!recipientId) {
            return sendErrorResponse(res, 400, 'RecipientId là bắt buộc');
        }

        const unreadCount = await ChatMessage.getUnreadCount(recipientId);
        
        return sendSuccessResponse(res, 200, 'Lấy số tin nhắn chưa đọc thành công', {
            unreadCount
        });

    } catch (error) {
        logError('Error in getUnreadCount:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Xóa cuộc trò chuyện
export const deleteConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return sendErrorResponse(res, 400, 'UserId là bắt buộc');
        }

        // Xóa tất cả tin nhắn liên quan đến user này
        await ChatMessage.deleteMany({
            $or: [
                { senderId: userId },
                { recipientId: userId }
            ]
        });
        
        return sendSuccessResponse(res, 200, 'Xóa cuộc trò chuyện thành công');

    } catch (error) {
        logError('Error in deleteConversation:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
};

// Xóa tin nhắn của khách vãng lai
export const clearGuestMessages = async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return sendErrorResponse(res, 400, 'UserId là bắt buộc');
        }

        // Chỉ cho phép xóa tin nhắn của temp user (khách vãng lai)
        if (!userId.startsWith('temp_')) {
            return sendErrorResponse(res, 403, 'Chỉ có thể xóa tin nhắn của khách vãng lai');
        }

        // Xóa tất cả tin nhắn liên quan đến temp user này
        const result = await ChatMessage.deleteMany({
            $or: [
                { senderId: userId },
                { recipientId: userId }
            ]
        });
        
        logInfo(`Cleared ${result.deletedCount} messages for guest user: ${userId}`);
        return sendSuccessResponse(res, 200, 'Xóa tin nhắn khách vãng lai thành công');

    } catch (error) {
        logError('Error in clearGuestMessages:', error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
}; 