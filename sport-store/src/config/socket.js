import { Server } from 'socket.io';
import { logInfo, logError } from '../utils/logger.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';

let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: [
                'http://localhost:3000',
                'https://sport-store-fe-graduation.vercel.app',
                'https://www.vjusport.com'
            ],
            methods: ['GET', 'POST'],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        transports: ['websocket', 'polling'],
        allowEIO3: true // Cho phép Engine.IO v3
    });

    // Lưu trữ thông tin user đã kết nối
    const connectedUsers = new Map();
    // Lưu trữ thông tin admin đã kết nối
    const connectedAdmins = new Set();
    // Lưu trữ thông tin socket ID và user ID
    const socketToUserId = new Map();
    // Lưu trữ thông tin user
    const userInfo = new Map();

    io.on('connection', (socket) => {
        logInfo(`Client connected: ${socket.id}`);

        // Xử lý khi client xác định danh tính
        socket.on('identifyUser', async (data) => {
            try {
                const { userId, userName, isAdmin } = data;
                logInfo(`IdentifyUser request from ${socket.id}:`, { userId, userName, isAdmin });
                
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
                    
                    // Lấy thông tin user từ database nếu có
                    let userData = { name: userName || 'Unknown User' };
                    if (userId && !userId.startsWith('temp_')) {
                        try {
                            const user = await User.findById(userId).select('fullname email phone');
                            if (user) {
                                userData = { 
                                    name: user.fullname || userName || 'Unknown User',
                                    email: user.email,
                                    phone: user.phone
                                };
                            }
                        } catch (error) {
                            logError(`Error fetching user ${userId}:`, error);
                        }
                    }
                    
                    userInfo.set(userId, userData);
                    const roomName = `user_${userId}`;
                    socket.join(roomName);
                    logInfo(`✅ User ${userId} (${userData.name}) joined room: ${roomName}`);
                    logInfo(`🔍 Current rooms for socket ${socket.id}:`, Array.from(socket.rooms));
                    
                    // Gửi xác nhận lại cho user
                    socket.emit('identified', { 
                        status: 'success', 
                        role: 'user',
                        userId: userId,
                        socketId: socket.id,
                        userInfo: userData
                    });
                } else {
                    logError(`Invalid identifyUser data from ${socket.id}:`, data);
                    socket.emit('identified', { 
                        status: 'error', 
                        message: 'Invalid data provided'
                    });
                }
            } catch (error) {
                logError(`Error in identifyUser for socket ${socket.id}:`, error);
                socket.emit('identified', { 
                    status: 'error', 
                    message: 'Internal server error'
                });
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
        socket.on('sendMessage', async (data) => {
            logInfo(`Message received from ${socket.id}:`, data);
            
            const { text, recipientId, userId, userName } = data;
            
            // Kiểm tra text có tồn tại và không rỗng
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                logError(`Invalid text received from ${socket.id}:`, { text, data });
                socket.emit('messageError', { message: 'Tin nhắn không được để trống' });
                return;
            }
            
            // Kiểm tra xem người gửi có phải là admin không
            const isAdmin = connectedAdmins.has(socket.id);
            
            if (isAdmin && recipientId) {
                // Nếu người gửi là admin và có recipientId, gửi tin nhắn đến user cụ thể
                logInfo(`🔍 Admin sending message to user ${recipientId}`);
                logInfo(`🔍 Connected users:`, Array.from(connectedUsers.keys()));
                logInfo(`🔍 User rooms:`, Array.from(connectedUsers.keys()).map(id => `user_${id}`));
                
                const messageData = {
                    senderId: 'admin',
                    senderName: 'Admin',
                    text,
                    timestamp: new Date().toISOString(),
                    isAdmin: true
                };
                
                // Lưu tin nhắn vào database
                try {
                    await ChatMessage.create({
                        senderId: 'admin',
                        senderName: 'Admin',
                        recipientId: recipientId,
                        text: text,
                        isAdmin: true,
                        sessionId: `admin_${recipientId}`
                    });
                    logInfo(`✅ Admin message saved to database for user ${recipientId}`);
                } catch (error) {
                    logError('Error saving admin message to database:', error);
                }
                
                // Gửi tin nhắn đến user thông qua room (không cần kiểm tra socket ID)
                const roomName = `user_${recipientId}`;
                logInfo(`🔍 Emitting to room: ${roomName}`);
                
                // Kiểm tra xem có ai trong room không
                const room = io.sockets.adapter.rooms.get(roomName);
                if (room) {
                    logInfo(`🔍 Room ${roomName} has ${room.size} members:`, Array.from(room));
                } else {
                    logInfo(`⚠️ Room ${roomName} is empty or doesn't exist`);
                }
                
                io.to(roomName).emit('receiveMessage', messageData);
                logInfo(`✅ Admin message sent to room ${roomName}`);
                
                // Cũng gửi lại cho admin để confirm
                socket.emit('receiveMessage', messageData);
                logInfo(`✅ Admin message confirmation sent back to admin`);
                
            } else {
                // Kiểm tra xem người gửi có phải là user không
                let senderId = socketToUserId.get(socket.id);
                
                // Nếu không tìm thấy senderId từ socket, sử dụng userId từ data
                if (!senderId && userId) {
                    senderId = userId;
                    // Cập nhật thông tin socket
                    connectedUsers.set(userId, socket.id);
                    socketToUserId.set(socket.id, userId);
                    socket.join(`user_${userId}`);
                    
                    // Lấy thông tin user từ database nếu có
                    let userData = { name: userName || 'Unknown User' };
                    if (userId && !userId.startsWith('temp_')) {
                        try {
                            const user = await User.findById(userId).select('fullname email phone');
                            if (user) {
                                userData = { 
                                    name: user.fullname || userName || 'Unknown User',
                                    email: user.email,
                                    phone: user.phone
                                };
                            }
                        } catch (error) {
                            logError(`Error fetching user ${userId}:`, error);
                        }
                    }
                    userInfo.set(userId, userData);
                    logInfo(`User ${userId} (${userData.name}) identified with socket ${socket.id}`);
                }
                
                if (senderId) {
                    // Lấy thông tin user
                    const user = userInfo.get(senderId) || { name: userName || 'Unknown User' };
                    
                    const messageData = {
                        senderId: senderId,
                        senderName: user.name,
                        text,
                        timestamp: new Date().toISOString(),
                        isAdmin: false
                    };
                    
                    // Lưu tin nhắn vào database
                    try {
                        await ChatMessage.create({
                            senderId: senderId,
                            senderName: user.name,
                            recipientId: 'admin',
                            text: text,
                            isAdmin: false,
                            userId: senderId.startsWith('temp_') ? null : senderId,
                            sessionId: `admin_${senderId}`
                        });
                    } catch (error) {
                        logError('Error saving user message to database:', error);
                    }
                    
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
                        timestamp: new Date().toISOString(),
                        isAdmin: false
                    };
                    
                    // Lưu tin nhắn vào database
                    try {
                        await ChatMessage.create({
                            senderId: tempUserId,
                            senderName: tempUserName,
                            recipientId: 'admin',
                            text: text,
                            isAdmin: false,
                            sessionId: `admin_${tempUserId}`
                        });
                    } catch (error) {
                        logError('Error saving temporary user message to database:', error);
                    }
                    
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
        socket.on('requestMessageHistory', async (data) => {
            const { userId } = data;
            
            if (userId) {
                try {
                    // Lấy tin nhắn từ database
                    const messages = await ChatMessage.getMessagesBetweenUsers(userId, 'admin', 100);
                    
                    // Format tin nhắn
                    const formattedMessages = messages.map(msg => ({
                        senderId: msg.senderId,
                        senderName: msg.senderName,
                        text: msg.text,
                        timestamp: msg.createdAt,
                        isAdmin: msg.isAdmin,
                        isRead: msg.isRead
                    }));
                    
                    socket.emit('messageHistory', formattedMessages);
                    logInfo(`Sent message history to client ${socket.id} for user ${userId}`);
                } catch (error) {
                    logError(`Error fetching message history for user ${userId}:`, error);
                    socket.emit('messageHistory', []);
                }
            } else {
                logInfo(`No userId provided for message history request`);
                socket.emit('messageHistory', []);
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