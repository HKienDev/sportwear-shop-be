import express from "express";
import * as orderController from "../controllers/orderController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createOrderSchema,
  updateOrderSchema
} from '../schemas/orderSchema.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../utils/constants.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: SUCCESS_MESSAGES.ROUTE_WORKING });
});

// Order routes (User only)
router.post("/", verifyUser, validateRequest(createOrderSchema), orderController.createOrder);
router.get("/my-orders", verifyUser, orderController.getMyOrders);
router.get("/my-orders/:id", verifyUser, orderController.getMyOrderById);
router.put("/my-orders/:id/cancel", verifyUser, orderController.cancelOrder);

// Protected routes (Admin only)
router.get("/admin", verifyAdmin, orderController.getAllOrders);
router.get("/all", verifyAdmin, orderController.getAllOrders);
router.get("/", verifyAdmin, orderController.getAllOrders);
router.post("/create", verifyAdmin, validateRequest(createOrderSchema), orderController.createOrder);
router.put("/:id/status", verifyAdmin, validateRequest(updateOrderSchema), orderController.updateOrderStatus);
router.put("/:id/payment", verifyAdmin, validateRequest(updateOrderSchema), orderController.updateOrderPayment);
router.get("/:id", verifyAdmin, orderController.getOrderById);
router.delete("/:id", verifyAdmin, orderController.deleteOrder);

export default router;