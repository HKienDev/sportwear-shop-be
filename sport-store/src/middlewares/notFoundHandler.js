import { ERROR_MESSAGES } from '../utils/constants.js';

export const notFoundHandler = (req, res) => {
  console.error(`[${req.id}] Not Found: ${req.method} ${req.url}`);
  
  return res.status(404).json({
    success: false,
    message: ERROR_MESSAGES.NOT_FOUND,
    path: req.url
  });
}; 