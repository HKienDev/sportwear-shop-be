import Category from "../models/Category.js";
import { logInfo, logError } from "../utils/logger.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants.js";
import Product from '../models/Product.js';
import cloudinary from "../config/cloudinary.js";
import User from '../models/User.js';

// Controllers
export const getAllCategories = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            search, 
            isActive, 
            sort = "createdAt", 
            order = "desc"
        } = req.query;
        
        const skip = (page - 1) * limit;

        // Xây dựng query - Admin thấy tất cả categories, public chỉ thấy active
        const isAdminRoute = req.originalUrl.includes('/admin');
        const filterQuery = {};
        
        if (search) {
            filterQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { categoryId: { $regex: search, $options: 'i' } }
            ];
        }
        
        // Admin có thể filter theo status, public chỉ thấy active
        if (isAdminRoute && isActive !== undefined) {
            filterQuery.isActive = isActive === "true";
        } else if (!isAdminRoute) {
            // Public chỉ thấy categories active
            filterQuery.isActive = true;
        }

        // Xây dựng sort
        const sortQuery = {};
        sortQuery[sort] = order === "asc" ? 1 : -1;

        // Lấy danh sách categories với phân trang
        const categories = await Category.find(filterQuery)
            .sort(sortQuery)
            .skip(skip)
            .limit(parseInt(limit));

        // Đếm tổng số categories
        const total = await Category.countDocuments(filterQuery);

        logInfo(`Successfully retrieved categories`);
        
        // Tắt hoàn toàn caching
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('ETag', null);
        
        // Gửi response
        res.status(200).json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORIES_RETRIEVED,
            data: {
                categories,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / limit)
                }
            }
        });
    } catch { /* empty */ }
};

export const getCategoryById = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        // Tìm category bằng categoryId trước
        let category = await Category.findOne({ categoryId });
        
        // Nếu không tìm thấy bằng categoryId, thử tìm bằng _id
        if (!category) {
            try {
                category = await Category.findById(categoryId);
            } catch (err) {
                logError(`Error in findById: ${err.message}`);
            }
        }
        
        if (!category) {
            logError(`Category not found with id: ${categoryId}`);
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục"
            });
        }

        // Lấy thông tin người tạo và cập nhật
        const [creator, updater] = await Promise.all([
            User.findById(category.createdBy).select('name'),
            category.updatedBy ? User.findById(category.updatedBy).select('name') : null
        ]);

        // Format response
        const response = {
            _id: category._id,
            categoryId: category.categoryId,
            name: category.name,
            slug: category.slug,
            description: category.description,
            image: category.image,
            isActive: category.isActive,
            showInNewProducts: category.showInNewProducts !== undefined ? category.showInNewProducts : true,
            createdBy: {
                _id: creator?._id,
                name: creator?.name
            },
            updatedBy: updater ? {
                _id: updater._id,
                name: updater.name
            } : null,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            productCount: category.productCount || 0,
            hasProducts: category.hasProducts || false
        };

        logInfo(`Successfully retrieved category: ${category.name}`);
        res.status(200).json({
            success: true,
            message: "Lấy thông tin danh mục thành công",
            data: response
        });
    } catch (err) {
        logError(`Error in getCategoryById: ${err.message}`);
    }
};

export const getCategoryBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Tìm category bằng slug
        const category = await Category.findBySlug(slug);
        
        if (!category) {
            logError(`Category not found with slug: ${slug}`);
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục"
            });
        }

        // Lấy thông tin người tạo và cập nhật
        const [creator, updater] = await Promise.all([
            User.findById(category.createdBy).select('name'),
            category.updatedBy ? User.findById(category.updatedBy).select('name') : null
        ]);

        // Format response
        const response = {
            _id: category._id,
            categoryId: category.categoryId,
            name: category.name,
            slug: category.slug,
            description: category.description,
            image: category.image,
            isActive: category.isActive,
            showInNewProducts: category.showInNewProducts !== undefined ? category.showInNewProducts : true,
            createdBy: {
                _id: creator?._id,
                name: creator?.name
            },
            updatedBy: updater ? {
                _id: updater._id,
                name: updater.name
            } : null,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            productCount: category.productCount || 0,
            hasProducts: category.hasProducts || false
        };

        logInfo(`Successfully retrieved category by slug: ${category.name}`);
        res.status(200).json({
            success: true,
            message: "Lấy thông tin danh mục thành công",
            data: response
        });
    } catch (err) {
        logError(`Error getting category by slug: ${err.message}`);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
};

export const createCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    try {
        const { name, description, image, isActive, showInNewProducts } = req.body;

        // Log request data
        logInfo(`Creating category with data:`, {
            name,
            description,
            image,
            isActive
        });

        // Validate required fields
        if (!name) {
            logError(`Missing required field: name`);
            return res.status(400).json({
                success: false,
                message: "Tên danh mục là bắt buộc"
            });
        }

        if (!image) {
            logError(`Missing required field: image`);
            return res.status(400).json({
                success: false,
                message: "Ảnh danh mục là bắt buộc"
            });
        }

        // Check if category name already exists
        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            logError(`[${requestId}] Category name already exists: ${name}`);
            return res.status(400).json({
                success: false,
                message: "Tên danh mục đã tồn tại"
            });
        }

        // Generate slug from name
        const slug = name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[đĐ]/g, 'd')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

        // Get last category ID
        const lastCategory = await Category.findOne({}, {}, { sort: { 'categoryId': -1 } });
        const lastId = lastCategory ? parseInt(lastCategory.categoryId.slice(-4)) : 0;
        const categoryId = `VJUSPORTCAT${String(lastId + 1).padStart(4, '0')}`;

        // Create new category
        const newCategory = await Category.create({
            categoryId,
            name,
            slug,
            description: description || "",
            image,
            isActive: isActive !== undefined ? isActive : true,
            showInNewProducts: showInNewProducts !== undefined ? showInNewProducts : true,
            createdBy: req.user._id
        });

        // Lấy thông tin người tạo
        const creator = await User.findById(req.user._id).select('name');
        
        // Format response
        const response = {
            categoryId: newCategory.categoryId,
            name: newCategory.name,
            slug: newCategory.slug,
            description: newCategory.description,
            image: newCategory.image,
            isActive: newCategory.isActive,
            createdBy: {
                _id: creator._id,
                name: creator.name
            },
            createdAt: newCategory.createdAt,
            updatedAt: newCategory.updatedAt
        };

        logInfo(`[${requestId}] Successfully created category: ${newCategory.name}`);
        res.status(201).json({
            success: true,
            message: "Tạo danh mục thành công",
            data: response
        });
    } catch { /* empty */ }
};

export const updateCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description, slug, image, isActive, showInNewProducts } = req.body;
        const { categoryId } = req.params;

        logInfo(`[${requestId}] Updating category with ID: ${categoryId}`);
        logInfo(`[${requestId}] Update data:`, { name, description, slug, image, isActive });

        // Tìm category bằng categoryId trước
        let category = await Category.findOne({ categoryId });
        if (!category) {
            logInfo(`[${requestId}] Category not found by categoryId, trying _id`);
            // Nếu không tìm thấy bằng categoryId, thử tìm bằng _id
            try {
                category = await Category.findById(categoryId);
            } catch { /* empty */ }
        }
        
        if (!category) {
            logError(`[${requestId}] Category not found: ${categoryId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Found category:`, category);

        if (name && name !== category.name) {
            const existingCategory = await Category.findOne({ name });
            if (existingCategory) {
                logError(`[${requestId}] Category already exists: ${name}`);
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.CATEGORY_EXISTS
                });
            }
        }

        // Chỉ cập nhật các trường được cung cấp
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (slug !== undefined) updateData.slug = slug;
        if (image !== undefined) updateData.image = image;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (showInNewProducts !== undefined) updateData.showInNewProducts = showInNewProducts;
        updateData.updatedBy = req.user._id;

        logInfo(`[${requestId}] Update data to be applied:`, updateData);

        const updatedCategory = await Category.findByIdAndUpdate(
            category._id,
            { $set: updateData },
            { new: true, runValidators: true }
        );

        if (!updatedCategory) {
            logError(`[${requestId}] Failed to update category`);
            return res.status(500).json({
                success: false,
                message: "Có lỗi xảy ra khi cập nhật danh mục"
            });
        }

        logInfo(`[${requestId}] Successfully updated category:`, updatedCategory);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORY_UPDATED,
            data: updatedCategory
        });
    } catch { /* empty */ }
};

export const deleteCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        
        // Kiểm tra xem danh mục có tồn tại không
        let category = await Category.findOne({ categoryId });
        if (!category) {
            try {
                category = await Category.findById(categoryId);
            } catch { /* empty */ }
        }
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        // Kiểm tra xem danh mục có sản phẩm không
        const hasProducts = await Product.exists({ categoryId: categoryId });
        if (hasProducts) {
            return res.status(400).json({
                success: false,
                message: 'Không thể xóa danh mục vì có sản phẩm đang sử dụng'
            });
        }

        // Xóa ảnh khỏi Cloudinary
        if (category.image) {
            const publicId = category.image.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`sport-store/categories/${publicId}`);
        }

        // Xóa danh mục khỏi database
        await Category.findByIdAndDelete(category._id);

        res.json({
            success: true,
            message: 'Xóa danh mục thành công'
        });
    } catch { /* empty */ }
};

export const searchCategories = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED
            });
        }

        const searchQuery = { 
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { categoryId: { $regex: query, $options: 'i' } }
            ]
        };

        const categories = await Category.find(searchQuery).sort({ name: 1 });

        logInfo(`[${requestId}] Successfully searched categories for query: ${query}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORIES_RETRIEVED,
            data: categories
        });
    } catch { /* empty */ }
};

export const bulkDeleteCategories = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { categoryIds } = req.body;

        if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
            logError(`[${requestId}] Invalid categoryIds provided`);
            return res.status(400).json({
                success: false,
                message: "Danh sách ID danh mục không hợp lệ"
            });
        }

        logInfo(`[${requestId}] Bulk deleting categories:`, categoryIds);

        // Kiểm tra xem các danh mục có tồn tại không và có sản phẩm không
        const categories = await Category.find({
            $or: [
                { _id: { $in: categoryIds } },
                { categoryId: { $in: categoryIds } }
            ]
        });

        if (categories.length === 0) {
            logError(`[${requestId}] No categories found to delete`);
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy danh mục nào để xóa"
            });
        }

        // Kiểm tra xem có danh mục nào có sản phẩm không
        const categoryIdsToCheck = categories.map(cat => cat.categoryId);
        const productsWithCategories = await Product.find({
            categoryId: { $in: categoryIdsToCheck }
        });

        if (productsWithCategories.length > 0) {
            const categoriesWithProducts = [...new Set(productsWithCategories.map(p => p.categoryId))];
            logError(`[${requestId}] Categories with products found:`, categoriesWithProducts);
            return res.status(400).json({
                success: false,
                message: `Không thể xóa các danh mục sau vì có sản phẩm đang sử dụng: ${categoriesWithProducts.join(', ')}`
            });
        }

        // Xóa ảnh khỏi Cloudinary
        const imageDeletionPromises = categories
            .filter(category => category.image)
            .map(async (category) => {
                try {
                    const publicId = category.image.split('/').pop().split('.')[0];
                    await cloudinary.uploader.destroy(`sport-store/categories/${publicId}`);
                } catch (error) {
                    logError(`[${requestId}] Error deleting image from Cloudinary:`, error);
                }
            });

        await Promise.all(imageDeletionPromises);

        // Xóa các danh mục khỏi database
        const deleteResult = await Category.deleteMany({
            _id: { $in: categories.map(cat => cat._id) }
        });

        logInfo(`[${requestId}] Successfully deleted ${deleteResult.deletedCount} categories`);
        res.json({
            success: true,
            message: `Đã xóa thành công ${deleteResult.deletedCount} danh mục`,
            data: {
                deletedCount: deleteResult.deletedCount
            }
        });
    } catch (error) {
        logError(`[${requestId}] Error in bulkDeleteCategories:`, error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa danh mục"
        });
    }
};