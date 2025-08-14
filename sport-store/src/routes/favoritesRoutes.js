import express from 'express';
import { auth } from '../middlewares/auth.js';
import * as wishlistController from '../controllers/wishlistController.js';

const router = express.Router();

// Lấy danh sách wishlist của user
router.get('/', auth, wishlistController.getWishlist);

// Thêm sản phẩm vào wishlist
router.post('/add', auth, wishlistController.addToWishlist);

// Xóa sản phẩm khỏi wishlist
router.post('/remove', auth, wishlistController.removeFromWishlist);

// Xóa toàn bộ wishlist
router.delete('/clear', auth, wishlistController.clearWishlist);

// Kiểm tra sản phẩm có trong wishlist không
router.get('/check/:productId', auth, wishlistController.checkWishlistStatus);

export default router;
