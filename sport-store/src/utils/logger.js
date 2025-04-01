import winston from 'winston';
import env from '../config/env.js';

// Định nghĩa các level log
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

// Định nghĩa màu sắc cho từng level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white'
};

// Thêm màu sắc vào winston
winston.addColors(colors);

// Định dạng log
const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`
    )
);

// Định nghĩa các transport (nơi lưu log)
const transports = [
    // Console transport
    new winston.transports.Console(),
    // File transport cho error
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
    }),
    // File transport cho tất cả logs
    new winston.transports.File({ filename: 'logs/all.log' })
];

// Tạo logger instance
export const logger = winston.createLogger({
    level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    levels,
    format,
    transports
});

// Tạo các hàm helper để log
export const logError = (message, error = null) => {
    if (error) {
        logger.error(`${message}: ${error.message}`);
        if (error.stack) {
            logger.error(`Stack trace: ${error.stack}`);
        }
    } else {
        logger.error(message);
    }
};

export const logWarn = (message) => {
    logger.warn(message);
};

export const logInfo = (message) => {
    logger.info(message);
};

export const logHttp = (message) => {
    logger.http(message);
};

export const logDebug = (message) => {
    logger.debug(message);
};

// Middleware để log HTTP requests
export const httpLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.http(
            `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
        );
    });
    
    next();
}; 