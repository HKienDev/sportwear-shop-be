import express from "express";
import * as userController from "../controllers/userController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    updateProfileSchema, 
    changePasswordSchema
} from '../schemas/userSchema.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: "Route is working!" });
});

// Route kiểm tra số điện thoại
router.get("/check-phone/:phone", userController.getUserByPhone);

// Protected routes (require authentication)
router.get("/profile", verifyUser, userController.getUserProfile);
router.put("/profile", verifyUser, validateRequest(updateProfileSchema), userController.updateProfile);
router.put("/change-password", verifyUser, validateRequest(changePasswordSchema), userController.changePassword);

// Admin routes (require admin authentication)
router.get("/", verifyAdmin, userController.getAllUsers);

// Health check route
router.get("/health", (req, res) => {
    res.json({ message: "User service is running!" });
});

export default router;