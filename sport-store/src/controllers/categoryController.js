import mongoose from "mongoose";
import Category from "../models/category.js";
import { logInfo, logError } from "../utils/logger.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";

// Controllers
export const getAllCategories = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { page = 1, limit = 10, search, categoryId, isActive, isFeatured } = req.query;
        const skip = (page - 1) * limit;

        // Xây dựng query
        const query = { isDeleted: false };
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }
        if (categoryId) {
            query.categoryId = categoryId.toUpperCase();
        }
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        if (isFeatured !== undefined) {
            query.isFeatured = isFeatured === 'true';
        }

        // Lấy danh sách categories với phân trang
        const categories = await Category.find(query)
            .sort({ name: 1 })
            .skip(skip)
            .limit(limit);

        // Đếm tổng số categories
        const total = await Category.countDocuments(query);

        logInfo(`[${requestId}] Successfully retrieved categories`);
        res.json({
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
        const category = await Category.findByCategoryId(req.params.id);
        
        if (!category) {
            logError(`[${requestId}] Category not found: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Successfully retrieved category: ${category.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORY_RETRIEVED,
            data: category
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const createCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description, slug, image, isActive, isFeatured } = req.body;

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            logError(`[${requestId}] Category already exists: ${name}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_EXISTS
            });
        }

        // Tạo categoryId mới
        const lastCategory = await Category.findOne().sort({ categoryId: -1 });
        const lastId = lastCategory ? parseInt(lastCategory.categoryId.slice(-4)) : 0;
        const newId = `VJUSPORTCAT${String(lastId + 1).padStart(4, '0')}`;

        const category = new Category({
            categoryId: newId,
            name,
            description,
            slug,
            image,
            isActive,
            isFeatured,
            createdBy: req.user._id
        });

        await category.save();

        logInfo(`[${requestId}] Successfully created category: ${category.name}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORY_CREATED,
            data: category
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description, slug, image, isActive, isFeatured } = req.body;
        const categoryId = req.params.id;

        const category = await Category.findByCategoryId(categoryId);
        if (!category) {
            logError(`[${requestId}] Category not found: ${categoryId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_NOT_FOUND
            });
        }

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

        category.name = name || category.name;
        category.description = description || category.description;
        category.slug = slug || category.slug;
        category.image = image || category.image;
        category.isActive = isActive !== undefined ? isActive : category.isActive;
        category.isFeatured = isFeatured !== undefined ? isFeatured : category.isFeatured;
        category.updatedBy = req.user._id;

        const updatedCategory = await category.save();

        logInfo(`[${requestId}] Successfully updated category: ${category.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORY_UPDATED,
            data: updatedCategory
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const deleteCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const categoryId = req.params.id;

        const category = await Category.findByCategoryId(categoryId);
        if (!category) {
            logError(`[${requestId}] Category not found: ${categoryId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_NOT_FOUND
            });
        }

        await category.softDelete(req.user._id);

        logInfo(`[${requestId}] Successfully deleted category: ${category.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORY_DELETED
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const searchCategories = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { query, categoryId } = req.query;
        
        if (!query && !categoryId) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED
            });
        }

        const searchQuery = { isDeleted: false };
        if (query) {
            searchQuery.name = { $regex: query, $options: 'i' };
        }
        if (categoryId) {
            searchQuery.categoryId = categoryId.toUpperCase();
        }

        const categories = await Category.find(searchQuery).sort({ name: 1 });

        logInfo(`[${requestId}] Successfully searched categories for query: ${query || categoryId}`);
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