import express from "express";
import * as userController from "../controllers/userController.js";
import { verifyUser } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import { 
    updateProfileSchema, 
    changePasswordSchema
} from '../schemas/userSchema.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Protected routes (require authentication)
router.get("/profile", verifyUser, userController.getUserProfile);
router.put("/profile", verifyUser, validateRequest(updateProfileSchema), userController.updateProfile);
router.put("/change-password", verifyUser, validateRequest(changePasswordSchema), userController.changePassword);

// Health check route
router.get("/", (req, res) => {
    res.json({ message: "User service is running!" });
});

export default router;