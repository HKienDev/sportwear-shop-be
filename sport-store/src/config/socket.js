import { Server } from 'socket.io';
import { logInfo, logError } from '../utils/logger.js';
import env from './env.js';

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

    io.on('connection', (socket) => {
        logInfo(`Client connected: ${socket.id}`);

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

        // Xử lý khi client disconnect
        socket.on('disconnect', () => {
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