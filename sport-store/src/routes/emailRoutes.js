import express from 'express';
import { sendEmailFromTemplate } from '../controllers/emailController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Route gửi email từ template FE
router.post('/send', authenticateToken, sendEmailFromTemplate);

export default router; 