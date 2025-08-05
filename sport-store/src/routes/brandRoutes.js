import express from 'express';
import { adminBrandController, userBrandController } from '../controllers/brandController.js';
import { auth, checkRole } from '../middlewares/auth.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Admin Routes (require authentication and admin role)
router.use('/admin', auth, checkRole(['admin']));

// Admin brand management routes
router.get('/admin/brands', adminBrandController.getBrands);
router.get('/admin/brands/stats', adminBrandController.getBrandStats);

router.post('/admin/brands', adminBrandController.createBrand);
router.post('/admin/brands/upload-logo', upload.single('logo'), adminBrandController.uploadBrandLogo);
router.delete('/admin/brands/bulk-delete', adminBrandController.deleteMultipleBrands);
router.get('/admin/brands/:id', adminBrandController.getBrand);
router.put('/admin/brands/:id', adminBrandController.updateBrand);
router.delete('/admin/brands/:id', adminBrandController.deleteBrand);
router.patch('/admin/brands/:id/toggle-status', adminBrandController.toggleBrandStatus);

// User Routes (public access)
router.get('/brands', userBrandController.getBrands);
router.get('/brands/featured', userBrandController.getFeaturedBrands);
router.get('/brands/trending', userBrandController.getTrendingBrands);
router.get('/brands/premium', userBrandController.getPremiumBrands);
router.get('/brands/search', userBrandController.searchBrands);
router.get('/brands/stats', userBrandController.getBrandStats);

router.get('/brands/:id', userBrandController.getBrand);

export default router; 