import mongoose from "mongoose";
import Category from "../models/Category.js";
import { logInfo, logError } from "../utils/logger.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";
import Product from '../models/product.js';
import cloudinary from "../config/cloudinary.js";
import User from '../models/User.js';

// Controllers
export const getAllCategories = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            page = 1, 
            limit = 10, 
            search, 
            isActive, 
            sort = "createdAt", 
            order = "desc",
            _t // Bỏ qua tham số timestamp
        } = req.query;
        
        const skip = (page - 1) * limit;

        // Xây dựng query
        const filterQuery = {};
        if (search) {
            filterQuery.$or = [
                { name: { $regex: search, $options: 'i' } },
                { categoryId: { $regex: search, $options: 'i' } }
            ];
        }
        if (isActive !== undefined) {
            filterQuery.isActive = isActive === "true";
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

        logInfo(`[${requestId}] Successfully retrieved categories`);
        
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
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getCategoryById = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { id } = req.params;
        
        // Tìm category bằng categoryId trước
        let category = await Category.findOne({ categoryId: id });
        
        // Nếu không tìm thấy bằng categoryId, thử tìm bằng _id
        if (!category) {
            try {
                category = await Category.findById(id);
            } catch (error) {
                // Bỏ qua lỗi CastError khi id không phải là ObjectId hợp lệ
            }
        }
        
        if (!category) {
            logError(`[${requestId}] Category not found with id: ${id}`);
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
            createdBy: {
                _id: creator._id,
                name: creator.name
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

        logInfo(`[${requestId}] Successfully retrieved category: ${category.name}`);
        res.status(200).json({
            success: true,
            message: "Lấy thông tin danh mục thành công",
            data: response
        });
    } catch (error) {
        logError(`[${requestId}] Error getting category:`, error);
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const createCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description, image, isActive } = req.body;

        // Log request data
        logInfo(`[${requestId}] Creating category with data:`, {
            name,
            description,
            image,
            isActive
        });

        // Validate required fields
        if (!name) {
            logError(`[${requestId}] Missing required field: name`);
            return res.status(400).json({
                success: false,
                message: "Tên danh mục là bắt buộc"
            });
        }

        if (!image) {
            logError(`[${requestId}] Missing required field: image`);
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
    } catch (error) {
        logError(`[${requestId}] Error creating category:`, error);
        res.status(500).json({
            success: false,
            message: "Lỗi server",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

export const updateCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description, slug, image, isActive } = req.body;
        const id = req.params.id;

        logInfo(`[${requestId}] Updating category with ID: ${id}`);
        logInfo(`[${requestId}] Update data:`, { name, description, slug, image, isActive });

        // Tìm category bằng categoryId trước
        let category = await Category.findOne({ categoryId: id });
        if (!category) {
            logInfo(`[${requestId}] Category not found by categoryId, trying _id`);
            // Nếu không tìm thấy bằng categoryId, thử tìm bằng _id
            try {
                category = await Category.findById(id);
            } catch (error) {
                // Bỏ qua lỗi CastError khi id không phải là ObjectId hợp lệ
                if (error.name !== 'CastError') {
                    throw error;
                }
            }
        }
        
        if (!category) {
            logError(`[${requestId}] Category not found: ${id}`);
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
    } catch (error) {
        logError(`[${requestId}] Error updating category:`, error);
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Kiểm tra xem danh mục có tồn tại không
        const category = await Category.findById(id);
        if (!category) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy danh mục'
            });
        }

        // Kiểm tra xem danh mục có sản phẩm không
        const hasProducts = await Product.exists({ categoryId: id });
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
        await Category.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Xóa danh mục thành công'
        });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server'
        });
    }
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
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};