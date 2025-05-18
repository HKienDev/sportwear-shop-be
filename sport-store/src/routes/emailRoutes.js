import express from 'express';
import { sendEmailFromTemplate, sendAdminEmailFromTemplate } from '../controllers/emailController.js';
import { verifyUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Route gửi email từ template FE (user)
router.post('/send', verifyUser, sendEmailFromTemplate);

// Route gửi email admin (FE gửi subject, html)
router.post('/send-admin', verifyUser, sendAdminEmailFromTemplate);

export default router; 