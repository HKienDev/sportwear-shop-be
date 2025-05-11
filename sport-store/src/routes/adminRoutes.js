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
  resetUserPasswordSchema
} from '../schemas/userSchema.js';

const router = express.Router();

// Tất cả routes đều yêu cầu token và quyền admin
router.use(verifyUser, verifyAdmin);

// Routes quản lý user
router.get('/users', getAllUsers);
router.get('/users/:customId', getUserById);
router.post('/users', validateRequest(createUserSchema), updateUser);
router.put('/users/:customId', validateRequest(updateUserSchema), updateUser);
router.delete('/users/:customId', deleteUser);
router.patch('/users/:customId/toggle-status', toggleUserStatus);
router.get('/users/phone/:phone', getUserByPhone);
router.put('/users/update-order-count', updateAllUsersOrderCount);
router.put('/users/:customId/update-spent', updateUserTotalSpent);
router.put('/users/:customId/reset-password', validateRequest(resetUserPasswordSchema), resetUserPassword);

// Routes thống kê
router.get('/stats', getStats);
router.get('/revenue', getRevenue);

export default router; 