import express from "express";
import * as orderController from "../controllers/orderController.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";
import { validateRequest } from '../middlewares/validateRequest.js';
import {
  createOrderSchema,
  updateOrderSchema
} from '../schemas/orderSchema.js';

const router = express.Router();

// Public routes
router.get("/test", (req, res) => {
    res.json({ message: "Route is working" });
});

// Address API routes
router.get("/address/provinces", async (req, res) => {
    try {
        const response = await fetch("https://provinces.open-api.vn/api/?depth=1");
        const data = await response.json();
        const provinces = data.map((p) => ({
            code: p.code.toString(),
            name: p.name
        }));
        res.json({ success: true, data: provinces });
    } catch (error) {
        console.error("Error fetching provinces:", error);
        res.status(500).json({ success: false, message: "Không thể lấy danh sách tỉnh/thành phố" });
    }
});

router.get("/address/districts/:provinceCode", async (req, res) => {
    try {
        const { provinceCode } = req.params;
        const response = await fetch(`https://provinces.open-api.vn/api/p/${provinceCode}?depth=2`);
        const data = await response.json();
        const districts = data.districts?.map((d) => ({
            code: d.code.toString(),
            name: d.name
        })) || [];
        res.json({ success: true, data: districts });
    } catch (error) {
        console.error("Error fetching districts:", error);
        res.status(500).json({ success: false, message: "Không thể lấy danh sách quận/huyện" });
    }
});

router.get("/address/wards/:districtCode", async (req, res) => {
    try {
        const { districtCode } = req.params;
        const response = await fetch(`https://provinces.open-api.vn/api/d/${districtCode}?depth=2`);
        const data = await response.json();
        const wards = data.wards?.map((w) => ({
            code: w.code.toString(),
            name: w.name
        })) || [];
        res.json({ success: true, data: wards });
    } catch (error) {
        console.error("Error fetching wards:", error);
        res.status(500).json({ success: false, message: "Không thể lấy danh sách phường/xã" });
    }
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
router.delete("/bulk-delete", verifyAdmin, orderController.bulkDeleteOrders);
router.put("/:id/status", verifyAdmin, validateRequest(updateOrderSchema), orderController.updateOrderStatus);
router.put("/:id/payment", verifyAdmin, validateRequest(updateOrderSchema), orderController.updateOrderPayment);
router.get("/:id", verifyAdmin, orderController.getOrderById);
router.delete("/:id", verifyAdmin, orderController.deleteOrder);

export default router;