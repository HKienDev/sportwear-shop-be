import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import { logInfo, logError } from '../utils/logger.js';
import { sendResponse } from '../utils/responseUtils.js';

// Lấy lịch sử tin nhắn theo session
export const getMessageHistory = async (req, res) => {
    try {
        const { sessionId, userId } = req.query;
        
        if (!sessionId && !userId) {
            return sendResponse(res, 400, false, 'SessionId hoặc userId là bắt buộc');
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

        sendResponse(res, 200, true, 'Lấy lịch sử tin nhắn thành công', {
            messages: formattedMessages
        });

    } catch (error) {
        logError('Error in getMessageHistory:', error);
        sendResponse(res, 500, false, 'Lỗi server');
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
                if (userId && !userId.startsWith('temp_')) {
                    try {
                        userInfo = await User.findById(userId).select('fullname email phone');
                    } catch (error) {
                        logError(`Error finding user ${userId}:`, error);
                    }
                }

                return {
                    id: userId,
                    name: userInfo?.fullname || conv.lastMessage.senderName || 'Unknown User',
                    lastMessage: conv.lastMessage.text,
                    unread: conv.unreadCount,
                    messageCount: conv.messageCount,
                    lastMessageTime: conv.lastMessage.createdAt,
                    userInfo: userInfo ? {
                        fullname: userInfo.fullname,
                        email: userInfo.email,
                        phone: userInfo.phone
                    } : null
                };
            })
        );

        sendResponse(res, 200, true, 'Lấy danh sách cuộc trò chuyện thành công', {
            conversations: formattedConversations
        });

    } catch (error) {
        logError('Error in getConversations:', error);
        sendResponse(res, 500, false, 'Lỗi server');
    }
};

// Đánh dấu tin nhắn đã đọc
export const markAsRead = async (req, res) => {
    try {
        const { senderId, recipientId } = req.body;
        
        if (!senderId || !recipientId) {
            return sendResponse(res, 400, false, 'SenderId và recipientId là bắt buộc');
        }

        await ChatMessage.markAsRead(senderId, recipientId);
        
        sendResponse(res, 200, true, 'Đánh dấu đã đọc thành công');

    } catch (error) {
        logError('Error in markAsRead:', error);
        sendResponse(res, 500, false, 'Lỗi server');
    }
};

// Lấy số tin nhắn chưa đọc
export const getUnreadCount = async (req, res) => {
    try {
        const { recipientId } = req.params;
        
        if (!recipientId) {
            return sendResponse(res, 400, false, 'RecipientId là bắt buộc');
        }

        const unreadCount = await ChatMessage.getUnreadCount(recipientId);
        
        sendResponse(res, 200, true, 'Lấy số tin nhắn chưa đọc thành công', {
            unreadCount
        });

    } catch (error) {
        logError('Error in getUnreadCount:', error);
        sendResponse(res, 500, false, 'Lỗi server');
    }
};

// Xóa cuộc trò chuyện
export const deleteConversation = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return sendResponse(res, 400, false, 'UserId là bắt buộc');
        }

        // Xóa tất cả tin nhắn liên quan đến user này
        await ChatMessage.deleteMany({
            $or: [
                { senderId: userId },
                { recipientId: userId }
            ]
        });
        
        sendResponse(res, 200, true, 'Xóa cuộc trò chuyện thành công');

    } catch (error) {
        logError('Error in deleteConversation:', error);
        sendResponse(res, 500, false, 'Lỗi server');
    }
}; 