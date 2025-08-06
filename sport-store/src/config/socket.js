import { Server } from 'socket.io';
import { logInfo, logError } from '../utils/logger.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

let io;

export const initSocket = (server) => {
    // Khởi tạo conversation tracker
    if (!global.conversationTracker) {
        global.conversationTracker = new Set();
    }
    
    io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:3000",
            methods: ["GET", "POST"],
            credentials: true
        },
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

    io.on('connection', (socket) => {
        // Xử lý khi client xác định danh tính
        socket.on('identifyUser', async (data) => {
            try {
                const { userId, userName, isAdmin, userInfo: userInfoData } = data;
                
                if (isAdmin) {
                    // Nếu là admin, thêm vào danh sách admin
                    connectedAdmins.add(socket.id);
                    
                    // Gửi xác nhận lại cho admin
                    socket.emit('identified', { 
                        status: 'success', 
                        role: 'admin',
                        socketId: socket.id
                    });
                } else if (userId) {
                    // Xóa thông tin socket cũ nếu có
                    const oldUserId = socketToUserId.get(socket.id);
                    if (oldUserId && oldUserId !== userId) {
                        connectedUsers.delete(oldUserId);
                    }
                    
                    // Nếu là user, thêm vào danh sách user
                    connectedUsers.set(userId, socket.id);
                    socketToUserId.set(socket.id, userId);
                    
                    // Lấy thông tin user từ database nếu có
                    let userData = { name: userName || 'Unknown User' };
                    
                    // Nếu có userInfo từ frontend (user đã login), sử dụng thông tin đó
                    if (userInfoData && userInfoData.fullname) {
                        userData = { 
                            name: userInfoData.fullname,
                            email: userInfoData.email,
                            phone: userInfoData.phone
                        };
                    } else if (userId && !userId.startsWith('temp_') && mongoose.Types.ObjectId.isValid(userId)) {
                        // Nếu không có userInfo, thử lấy từ database
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
                    
                    // Cập nhật thông tin user
                    userInfo.set(userId, userData);
                    const roomName = `user_${userId}`;
                    socket.join(roomName);
                    
                    // Clear conversationTracker cho user này để có thể gửi newConversation event
                    if (global.conversationTracker && global.conversationTracker.has(userId)) {
                        global.conversationTracker.delete(userId);
                    }
                    
                    // Gửi thông báo cho admin về user mới hoặc user đã cập nhật
                    if (connectedAdmins.size > 0) {
                        const userUpdateData = {
                            type: 'userUpdate',
                            userId: userId,
                            userName: userData.name,
                            userEmail: userData.email,
                            userPhone: userData.phone,
                            isOnline: true
                        };
                        
                        connectedAdmins.forEach(adminSocketId => {
                            io.to(adminSocketId).emit('userUpdate', userUpdateData);
                        });
                    }
                    
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
        });

        // Xử lý khi client leave một room
        socket.on('leave', (room) => {
            socket.leave(room);
        });

        // Xử lý khi client gửi tin nhắn
        socket.on('sendMessage', async (data) => {
            
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
                } catch (error) {
                    logError('Error saving admin message to database:', error);
                }
                
                // Gửi tin nhắn đến user thông qua room (không cần kiểm tra socket ID)
                const roomName = `user_${recipientId}`;
                
                io.to(roomName).emit('receiveMessage', messageData);
                
                // Cũng gửi lại cho admin để confirm
                socket.emit('receiveMessage', messageData);
                
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
                    if (userId && !userId.startsWith('temp_') && mongoose.Types.ObjectId.isValid(userId)) {
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
                        // Kiểm tra database connection
                        const dbState = mongoose.connection.readyState;
                        
                        if (dbState !== 1) {
                            logError('Database not connected! Cannot save message.');
                            return;
                        }
                        
                        const savedMessage = await ChatMessage.create({
                            senderId: senderId,
                            senderName: user.name,
                            senderPhone: user.phone || null,
                            senderEmail: user.email || null,
                            recipientId: 'admin',
                            text: text,
                            isAdmin: false,
                            sessionId: `admin_${senderId}`
                        });
                    } catch (error) {
                        logError('Error saving user message to database:', error);
                    }
                    
                    // Nếu người gửi là user, gửi tin nhắn đến tất cả admin
                    if (connectedAdmins.size > 0) {
                        // Gửi tin nhắn đến admin
                        connectedAdmins.forEach(adminSocketId => {
                            io.to(adminSocketId).emit('receiveMessage', messageData);
                        });
                        
                        // Gửi newConversation event nếu đây là tin nhắn đầu tiên từ user này
                        if (!global.conversationTracker) {
                            global.conversationTracker = new Set();
                        }
                        
                        if (!global.conversationTracker.has(senderId)) {
                            global.conversationTracker.add(senderId);
                            
                            const newConversationData = {
                                conversationId: senderId,
                                userId: senderId,
                                userName: user.name
                            };
                            
                            connectedAdmins.forEach(adminSocketId => {
                                io.to(adminSocketId).emit('newConversation', newConversationData);
                            });
                        }
                    }
                } else {
                    // Nếu không có senderId, tạo một ID tạm thời và lưu thông tin
                    const tempUserId = userId || `temp_${socket.id.substring(0, 8)}`;
                    const tempUserName = userName || 'Anonymous User';
                    
                    connectedUsers.set(tempUserId, socket.id);
                    socketToUserId.set(socket.id, tempUserId);
                    userInfo.set(tempUserId, { name: tempUserName });
                    socket.join(`user_${tempUserId}`);
                    
                    const messageData = {
                        senderId: tempUserId,
                        senderName: tempUserName,
                        text,
                        timestamp: new Date().toISOString(),
                        isAdmin: false
                    };
                    
                    // Lưu tin nhắn vào database
                    try {
                        const savedMessage = await ChatMessage.create({
                            senderId: tempUserId,
                            senderName: tempUserName,
                            senderPhone: null, // Temporary users không có phone
                            senderEmail: null, // Temporary users không có email
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
                        
                        // Gửi newConversation event cho temporary user
                        if (!global.conversationTracker) {
                            global.conversationTracker = new Set();
                        }
                        
                        if (!global.conversationTracker.has(tempUserId)) {
                            global.conversationTracker.add(tempUserId);
                            
                            const newConversationData = {
                                conversationId: tempUserId,
                                userId: tempUserId,
                                userName: tempUserName
                            };
                            
                            connectedAdmins.forEach(adminSocketId => {
                                io.to(adminSocketId).emit('newConversation', newConversationData);
                            });
                        }
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
                
                // Thông báo cho admin về việc user offline
                if (connectedAdmins.size > 0) {
                    const userData = userInfo.get(userId);
                    const userUpdateData = {
                        type: 'userUpdate',
                        userId: userId,
                        userName: userData?.name || 'Unknown User',
                        userEmail: userData?.email,
                        userPhone: userData?.phone,
                        isOnline: false
                    };
                    
                    connectedAdmins.forEach(adminSocketId => {
                        io.to(adminSocketId).emit('userUpdate', userUpdateData);
                    });
                }
            }
            
            // Xóa thông tin admin khi disconnect
            if (connectedAdmins.has(socket.id)) {
                connectedAdmins.delete(socket.id);
            }
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