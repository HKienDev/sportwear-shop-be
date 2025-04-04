import { ERROR_MESSAGES } from '../utils/constants.js';
import { logError } from '../utils/logger.js';

export const notFoundHandler = (req, res) => {
  const requestId = req.id || 'unknown';
  logError(`[${requestId}] Not Found: ${req.method} ${req.url}`);
  
  return res.status(404).json({
    success: false,
    message: ERROR_MESSAGES.NOT_FOUND,
    path: req.url
  });
}; 