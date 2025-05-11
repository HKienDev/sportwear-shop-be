import express from "express";
import { verifyUser } from '../middlewares/authMiddleware.js';
import {
    getCart,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart
} from "../controllers/cartController.js";

const router = express.Router();

// Áp dụng middleware xác thực cho tất cả các routes
router.use(verifyUser);

// Routes
router.get("/", getCart);
router.post("/add", addToCart);
router.put("/update", updateCartItemQuantity);
router.delete("/remove", removeFromCart);
router.delete("/clear", clearCart);

export default router; 