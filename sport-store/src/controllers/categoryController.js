import mongoose from "mongoose";
import Category from "../models/category.js";
import Product from "../models/product.js";
import { logInfo, logError } from "../utils/logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, CATEGORY_REQUIRED_FIELDS } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";

// Constants
const REQUIRED_FIELDS = {
    name: "Tên danh mục là bắt buộc"
};

// Helper functions
const validateCategoryFields = (categoryData) => {
    const missingFields = {};
    for (const [field, message] of Object.entries(CATEGORY_REQUIRED_FIELDS)) {
        if (!categoryData[field]) {
            missingFields[field] = message;
        }
    }
    return missingFields;
};

// Controllers
export const getAllCategories = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { page = 1, limit = 10, search } = req.query;
        const skip = (page - 1) * limit;

        // Xây dựng query
        const query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
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
        const category = await Category.findById(req.params.id);
        
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
        const { name, description } = req.body;

        const existingCategory = await Category.findOne({ name });
        if (existingCategory) {
            logError(`[${requestId}] Category already exists: ${name}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_EXISTS
            });
        }

        const category = new Category({
            name,
            description,
            slug: name.toLowerCase().replace(/\s+/g, '-')
        });

        const savedCategory = await category.save();

        logInfo(`[${requestId}] Successfully created category: ${name}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.CATEGORY_CREATED,
            data: savedCategory
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description } = req.body;
        const categoryId = req.params.id;

        const category = await Category.findById(categoryId);
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
        category.slug = category.name.toLowerCase().replace(/\s+/g, '-');

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

        const category = await Category.findById(categoryId);
        if (!category) {
            logError(`[${requestId}] Category not found: ${categoryId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_NOT_FOUND
            });
        }

        await category.deleteOne();

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
        const { query } = req.query;
        
        if (!query) {
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.SEARCH_QUERY_REQUIRED
            });
        }

        const categories = await Category.find({
            name: { $regex: query, $options: 'i' }
        }).sort({ name: 1 });

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