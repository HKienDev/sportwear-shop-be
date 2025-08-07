import express from 'express';
import { logInfo, logError } from '../utils/logger.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseUtils.js';
import ChatMessage from '../models/ChatMessage.js';
import { 
    getConversations, 
    getMessagesByConversation, 
    sendMessage, 
    markAsReadByConversation,
    getUnreadCount,
    deleteConversation,
    clearGuestMessages
} from '../controllers/chatController.js';
import { verifyAdmin } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Lấy lịch sử tin nhắn theo userId
router.get('/history/:userId', async (req, res) => {
    const requestId = req.id || 'unknown';
    const { userId } = req.params;
    
    try {
        // Lấy tin nhắn từ database
        const messages = await ChatMessage.getMessagesBetweenUsers(userId, 'admin', 100);
        
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
        logError(`[${requestId}] Error getting chat history for user ${userId}:`, error);
        return sendErrorResponse(res, 500, 'Lỗi server');
    }
});

// Admin routes (require admin authentication)
// GET /api/chat/conversations - Lấy danh sách cuộc trò chuyện cho admin
router.get('/conversations', verifyAdmin, getConversations);

// GET /api/chat/messages/:conversationId - Lấy tin nhắn theo conversation (cho phép khách vãng lai)
router.get('/messages/:conversationId', getMessagesByConversation);

// POST /api/chat/send - Gửi tin nhắn (cho phép khách vãng lai)
router.post('/send', sendMessage);

// PUT /api/chat/mark-read/:conversationId - Đánh dấu đã đọc (cho phép khách vãng lai)
router.put('/mark-read/:conversationId', markAsReadByConversation);

// GET /api/chat/unread/:recipientId - Lấy số tin nhắn chưa đọc
router.get('/unread/:recipientId', getUnreadCount);

// DELETE /api/chat/conversation/:userId - Xóa conversation
router.delete('/conversation/:userId', verifyAdmin, deleteConversation);

// DELETE /api/chat/clear-guest-messages - Xóa tin nhắn của khách vãng lai
router.delete('/clear-guest-messages', clearGuestMessages);

export default router;