import { v4 as uuidv4 } from 'uuid';

/**
 * Tạo request ID duy nhất
 * @returns {string} Request ID
 */
export const generateRequestId = () => {
  return uuidv4();
};

/**
 * Lấy request ID từ request object
 * @param {Object} req - Request object
 * @returns {string} Request ID
 */
export const getRequestId = (req) => {
  return req.id || generateRequestId();
};

/**
 * Lấy IP của client
 * @param {Object} req - Request object
 * @returns {string} Client IP
 */
export const getClientIp = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.connection.socket.remoteAddress;
};

/**
 * Lấy user agent của client
 * @param {Object} req - Request object
 * @returns {string} User agent
 */
export const getUserAgent = (req) => {
  return req.get('user-agent') || 'Unknown';
};

/**
 * Lấy thông tin cơ bản của request
 * @param {Object} req - Request object
 * @returns {Object} Request info
 */
export const getRequestInfo = (req) => {
  return {
    id: getRequestId(req),
    method: req.method,
    url: req.originalUrl,
    ip: getClientIp(req),
    userAgent: getUserAgent(req),
    timestamp: new Date().toISOString()
  };
}; 