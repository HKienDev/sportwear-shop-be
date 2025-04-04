import express from 'express';
import { verifyUser, verifyAdmin } from '../middlewares/authMiddleware.js';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getUserByPhone,
  updateAllUsersOrderCount,
  updateUserTotalSpent,
  resetUserPassword
} from '../controllers/adminController.js';
import { getStats, getRevenue } from '../controllers/statsController.js';
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createUserSchema,
  updateUserSchema,
  searchUserSchema,
  resetUserPasswordSchema
} from '../schemas/userSchema.js';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware kiểm tra ObjectId hợp lệ
const validateObjectId = (req, res, next) => {
  const id = req.params.id;
  console.log('Validating ObjectId:', id);
  
  if (!id) {
    console.log('ID is missing');
    return res.status(400).json({ 
      success: false,
      message: "ID không tồn tại.",
      path: req.url
    });
  }
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    console.log('Invalid ObjectId format:', id);
    return res.status(400).json({ 
      success: false,
      message: "ID không hợp lệ!",
      path: req.url
    });
  }
  
  console.log('ObjectId is valid:', id);
  next();
};

// Tất cả routes đều yêu cầu token và quyền admin
router.use(verifyUser, verifyAdmin);

// Routes quản lý user
router.get('/users', getAllUsers);
router.get('/users/:id', validateObjectId, getUserById);
router.post('/users', validateRequest(createUserSchema), updateUser);
router.put('/users/:id', validateObjectId, validateRequest(updateUserSchema), updateUser);
router.delete('/users/:id', validateObjectId, deleteUser);
router.patch('/users/:id/toggle-status', validateObjectId, toggleUserStatus);
router.get('/users/phone/:phone', getUserByPhone);
router.put('/users/batch-update', updateAllUsersOrderCount);
router.put('/users/:userId/update-spent', validateObjectId, updateUserTotalSpent);
router.put('/users/:userId/reset-password', validateObjectId, validateRequest(resetUserPasswordSchema), resetUserPassword);

// Routes thống kê
router.get('/stats', getStats);
router.get('/revenue', getRevenue);

export default router; 