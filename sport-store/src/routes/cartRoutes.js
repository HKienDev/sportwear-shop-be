import express from "express";
import { auth } from "../middlewares/auth.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { createCartSchema, updateCartSchema, addToCartSchema, updateCartItemSchema } from "../schemas/cartSchema.js";
import {
    getCart,
    createCart,
    updateCart,
    deleteCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
} from "../controllers/cartController.js";

const router = express.Router();

// User routes
router.get("/", auth, getCart);
router.post("/", auth, validateRequest({ body: createCartSchema }), createCart);
router.put("/", auth, validateRequest({ body: updateCartSchema }), updateCart);
router.delete("/", auth, deleteCart);
router.post("/add", auth, validateRequest({ body: addToCartSchema }), addToCart);
router.put("/items/:productId", auth, validateRequest({ body: updateCartItemSchema }), updateCartItem);
router.delete("/items/:productId", auth, removeFromCart);
router.delete("/clear", auth, clearCart);

export default router; 