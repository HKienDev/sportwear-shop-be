import express from 'express';
import { sendEmailFromTemplate, sendAdminEmailFromTemplate } from '../controllers/emailController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route gửi email từ template FE (user)
router.post('/send', authenticateToken, sendEmailFromTemplate);

// Route gửi email admin (FE gửi subject, html)
router.post('/send-admin', authenticateToken, sendAdminEmailFromTemplate);

export default router; 