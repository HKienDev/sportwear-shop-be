import express from 'express';
import { sendEmailFromTemplate, sendEmailToAdmin } from '../controllers/emailController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route gửi email từ template FE
router.post('/send', authenticateToken, sendEmailFromTemplate);

// Route gửi email cho admin
router.post('/send-admin', authenticateToken, sendEmailToAdmin);

export default router; 