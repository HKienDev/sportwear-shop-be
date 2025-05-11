import { Server } from 'socket.io';
import { logInfo, logError } from '../utils/logger.js';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ['http://localhost:3000', 'https://sport-store-fe-graduation.vercel.app'],
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling']
    });

    // Lưu trữ thông tin user đã kết nối
    const connectedUsers = new Map();
    // Lưu trữ thông tin admin đã kết nối
    const connectedAdmins = new Set();
    // Lưu trữ thông tin socket ID và user ID
    const socketToUserId = new Map();
    // Lưu trữ thông tin user
    const userInfo = new Map();
    // Lưu trữ lịch sử tin nhắn
    const messageHistory = new Map();

    io.on('connection', (socket) => {
        logInfo(`Client connected: ${socket.id}`);

        // Xử lý khi client xác định danh tính
        socket.on('identifyUser', (data) => {
            const { userId, userName, isAdmin } = data;
            
            if (isAdmin) {
                // Nếu là admin, thêm vào danh sách admin
                connectedAdmins.add(socket.id);
                logInfo(`Admin identified with socket ${socket.id}`);
                
                // Gửi xác nhận lại cho admin
                socket.emit('identified', { 
                    status: 'success', 
                    role: 'admin',
                    socketId: socket.id
                });
                
                // Log số lượng admin hiện tại
                logInfo(`Current admin count: ${connectedAdmins.size}`);
            } else if (userId) {
                // Nếu là user, thêm vào danh sách user
                connectedUsers.set(userId, socket.id);
                socketToUserId.set(socket.id, userId);
                // Lưu thông tin user
                userInfo.set(userId, { name: userName || 'Unknown User' });
                socket.join(`user_${userId}`);
                logInfo(`User ${userId} (${userName || 'Unknown'}) identified with socket ${socket.id}`);
                
                // Gửi xác nhận lại cho user
                socket.emit('identified', { 
                    status: 'success', 
                    role: 'user',
                    userId: userId,
                    socketId: socket.id
                });
                
                // Gửi lịch sử tin nhắn cho user nếu có
                if (messageHistory.has(userId)) {
                    socket.emit('messageHistory', messageHistory.get(userId));
                    logInfo(`Sent message history to user ${userId}`);
                }
            }
        });

        // Xử lý khi client join vào một room
        socket.on('join', (room) => {
            socket.join(room);
            logInfo(`Client ${socket.id} joined room: ${room}`);
        });

        // Xử lý khi client leave một room
        socket.on('leave', (room) => {
            socket.leave(room);
            logInfo(`Client ${socket.id} left room: ${room}`);
        });

        // Xử lý khi client gửi tin nhắn
        socket.on('sendMessage', (data) => {
            logInfo(`Message received from ${socket.id}:`, data);
            
            const { text, recipientId, userId, userName } = data;
            
            // Kiểm tra xem người gửi có phải là admin không
            const isAdmin = connectedAdmins.has(socket.id);
            
            if (isAdmin && recipientId) {
                // Nếu người gửi là admin và có recipientId, gửi tin nhắn đến user cụ thể
                const recipientSocketId = connectedUsers.get(recipientId);
                if (recipientSocketId) {
                    const messageData = {
                        senderId: 'admin',
                        senderName: 'Admin',
                        text,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Lưu tin nhắn vào lịch sử
                    if (!messageHistory.has(recipientId)) {
                        messageHistory.set(recipientId, []);
                    }
                    messageHistory.get(recipientId).push(messageData);
                    
                    // Gửi tin nhắn đến user thông qua room
                    io.to(`user_${recipientId}`).emit('receiveMessage', messageData);
                    logInfo(`Admin message forwarded to user ${recipientId}`);
                } else {
                    logInfo(`User ${recipientId} not found`);
                }
            } else {
                // Kiểm tra xem người gửi có phải là user không
                let senderId = socketToUserId.get(socket.id);
                
                // Nếu không tìm thấy senderId từ socket, sử dụng userId từ data
                if (!senderId && userId) {
                    senderId = userId;
                    // Cập nhật thông tin socket
                    connectedUsers.set(userId, socket.id);
                    socketToUserId.set(socket.id, userId);
                    if (userName) {
                        userInfo.set(userId, { name: userName });
                    }
                    socket.join(`user_${userId}`);
                    logInfo(`User ${userId} (${userName || 'Unknown'}) identified with socket ${socket.id}`);
                }
                
                if (senderId) {
                    // Lấy thông tin user
                    const user = userInfo.get(senderId) || { name: userName || 'Unknown User' };
                    
                    const messageData = {
                        senderId: senderId,
                        senderName: user.name,
                        text,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Lưu tin nhắn vào lịch sử
                    if (!messageHistory.has(senderId)) {
                        messageHistory.set(senderId, []);
                    }
                    messageHistory.get(senderId).push(messageData);
                    
                    // Nếu người gửi là user, gửi tin nhắn đến tất cả admin
                    if (connectedAdmins.size > 0) {
                        connectedAdmins.forEach(adminSocketId => {
                            io.to(adminSocketId).emit('receiveMessage', messageData);
                        });
                        logInfo(`User ${senderId} (${user.name}) message sent to all admins`);
                    } else {
                        logInfo(`No admins online to receive message from user ${senderId}`);
                    }
                } else {
                    // Nếu không có senderId, tạo một ID tạm thời và lưu thông tin
                    const tempUserId = userId || `temp_${socket.id.substring(0, 8)}`;
                    const tempUserName = userName || 'Anonymous User';
                    
                    connectedUsers.set(tempUserId, socket.id);
                    socketToUserId.set(socket.id, tempUserId);
                    userInfo.set(tempUserId, { name: tempUserName });
                    socket.join(`user_${tempUserId}`);
                    
                    logInfo(`Created temporary user ${tempUserId} (${tempUserName}) for socket ${socket.id}`);
                    
                    const messageData = {
                        senderId: tempUserId,
                        senderName: tempUserName,
                        text,
                        timestamp: new Date().toISOString()
                    };
                    
                    // Lưu tin nhắn vào lịch sử
                    if (!messageHistory.has(tempUserId)) {
                        messageHistory.set(tempUserId, []);
                    }
                    messageHistory.get(tempUserId).push(messageData);
                    
                    // Gửi tin nhắn đến tất cả admin
                    if (connectedAdmins.size > 0) {
                        connectedAdmins.forEach(adminSocketId => {
                            io.to(adminSocketId).emit('receiveMessage', messageData);
                        });
                        logInfo(`Temporary user ${tempUserId} (${tempUserName}) message sent to all admins`);
                    } else {
                        logInfo(`No admins online to receive message from temporary user ${tempUserId}`);
                    }
                }
            }
        });

        // Xử lý khi client yêu cầu lịch sử tin nhắn
        socket.on('requestMessageHistory', (data) => {
            const { userId } = data;
            
            if (userId && messageHistory.has(userId)) {
                socket.emit('messageHistory', messageHistory.get(userId));
                logInfo(`Sent message history to client ${socket.id} for user ${userId}`);
            } else {
                logInfo(`No message history found for user ${userId}`);
            }
        });

        // Xử lý khi client disconnect
        socket.on('disconnect', () => {
            // Xóa thông tin user khi disconnect
            const userId = socketToUserId.get(socket.id);
            if (userId) {
                // Không xóa thông tin user khỏi userInfo và messageHistory
                // Chỉ xóa thông tin socket
                connectedUsers.delete(userId);
                socketToUserId.delete(socket.id);
                logInfo(`User ${userId} disconnected`);
            }
            
            // Xóa thông tin admin khi disconnect
            if (connectedAdmins.has(socket.id)) {
                connectedAdmins.delete(socket.id);
                logInfo(`Admin disconnected: ${socket.id}`);
            }
            
            logInfo(`Client disconnected: ${socket.id}`);
        });

        // Xử lý lỗi
        socket.on('error', (error) => {
            logError(`Socket error for client ${socket.id}:`, error);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error('Socket.IO not initialized!');
    }
    return io;
};

// Các hàm tiện ích để gửi sự kiện
export const emitToRoom = (room, event, data) => {
    if (!io) return;
    io.to(room).emit(event, data);
};

export const emitToAll = (event, data) => {
    if (!io) return;
    io.emit(event, data);
};

export const emitToUser = (userId, event, data) => {
    if (!io) return;
    io.to(`user_${userId}`).emit(event, data);
};