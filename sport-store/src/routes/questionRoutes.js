import express from 'express';
import {
    getQuestions,
    getProductQuestions,
    getUserQuestions,
    createQuestion,
    deleteQuestion,
    markQuestionHelpful,
    getAllQuestions,
    answerQuestion,
    verifyQuestion
} from '../controllers/questionController.js';
import { auth } from '../middlewares/auth.js';
import { isAdmin } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Test route
router.get('/test', (req, res) => {
    res.json({ success: true, message: 'Questions route working' });
});

// Test helpful route
router.get('/helpful-test', (req, res) => {
    res.json({ success: true, message: 'Helpful route working' });
});

// Public routes
router.get('/product/:productSku', getProductQuestions);
router.post('/helpful/:questionId', markQuestionHelpful);

// Get all questions (public route for product pages)
router.get('/', getQuestions);

// User routes (require authentication)
router.get('/user', auth, getUserQuestions);
router.post('/', auth, createQuestion);
router.delete('/:questionId', auth, deleteQuestion);

// Admin routes (require admin role)
router.get('/admin', auth, isAdmin, getAllQuestions);
router.put('/admin/:questionId/answer', auth, isAdmin, answerQuestion);
router.put('/admin/:questionId/verify', auth, isAdmin, verifyQuestion);

export default router; 