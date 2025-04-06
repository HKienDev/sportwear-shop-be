import { logError, logInfo } from './logger.js';

/**
 * Gửi response thành công
 * @param {Object} res - Response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Message
 * @param {Object} data - Data to send
 * @returns {Object} Response object
 */
export const sendSuccessResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message
  };

  if (data) {
    response.data = data;
  }

  logInfo(`[Response] ${message}`);
  return res.status(statusCode).json(response);
};

/**
 * Gửi response lỗi
 * @param {Object} res - Response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Object} errors - Error details
 * @param {string} requestId - Request ID
 * @returns {Object} Response object
 */
export const sendErrorResponse = (res, statusCode, message, errors = {}, requestId = 'unknown') => {
  logError(`[${requestId}] ${message}`, errors);

  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

/**
 * Gửi response không tìm thấy
 * @param {Object} res - Response object
 * @param {string} message - Not found message
 * @param {string} requestId - Request ID
 * @returns {Object} Response object
 */
export const sendNotFoundResponse = (res, message, requestId = 'unknown') => {
  logError(`[${requestId}] ${message}`);
  return res.status(404).json({
    success: false,
    message
  });
};

/**
 * Gửi response validation error
 * @param {Object} res - Response object
 * @param {Object} errors - Validation errors
 * @param {string} requestId - Request ID
 * @returns {Object} Response object
 */
export const sendValidationErrorResponse = (res, errors, requestId = 'unknown') => {
  logError(`[${requestId}] Validation error`, errors);
  return res.status(400).json({
    success: false,
    message: 'Validation error',
    errors
  });
}; 