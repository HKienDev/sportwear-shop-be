import mongoose from "mongoose";
import Product from "../models/product.js";
import Category from "../models/category.js";
import Order from "../models/order.js";
import { logInfo, logError } from "../utils/logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PRODUCT_STATUS } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";

// Constants
const REQUIRED_FIELDS = {
    name: "Tên sản phẩm là bắt buộc",
    description: "Mô tả sản phẩm là bắt buộc",
    brand: "Thương hiệu là bắt buộc",
    price: "Giá là bắt buộc",
    stock: "Số lượng tồn kho là bắt buộc",
    category: "Danh mục là bắt buộc",
    "images.main": "Ảnh chính là bắt buộc",
    sku: "SKU là bắt buộc"
};

// Helper functions
const validateProductFields = (productData) => {
    const missingFields = {};
    for (const [field, message] of Object.entries(REQUIRED_FIELDS)) {
        if (field.includes('.')) {
            const [parent, child] = field.split('.');
            if (!productData[parent]?.[child]) {
                missingFields[field] = message;
            }
        } else if (!productData[field]) {
            missingFields[field] = message;
        }
    }
    return missingFields;
};

const validateProductData = (productData) => {
    const errors = {};

    if (productData.price && (isNaN(productData.price) || productData.price < 0)) {
        errors.price = ERROR_MESSAGES.INVALID_PRICE;
    }

    if (productData.stock && (isNaN(productData.stock) || productData.stock < 0)) {
        errors.stock = ERROR_MESSAGES.INVALID_STOCK;
    }

    if (productData.discountPrice && (isNaN(productData.discountPrice) || productData.discountPrice < 0)) {
        errors.discountPrice = ERROR_MESSAGES.INVALID_PRICE;
    }

    return errors;
};

// Controllers
export const getAllProducts = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
        const skip = (page - 1) * limit;

        const products = await Product.find()
            .sort({ [sort]: order === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit)
            .populate('category', 'name');

        const total = await Product.countDocuments();

        logInfo(`[${requestId}] Successfully retrieved products`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCTS_RETRIEVED,
            data: {
                products,
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

export const getProductById = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name');

        if (!product) {
            logError(`[${requestId}] Product not found: ${req.params.id}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        logInfo(`[${requestId}] Successfully retrieved product: ${product.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_RETRIEVED,
            data: product
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getProductsByCategory = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { categoryId } = req.params;
        const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
        const skip = (page - 1) * limit;

        const products = await Product.find({ category: categoryId })
            .sort({ [sort]: order === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit)
            .populate('category', 'name');

        const total = await Product.countDocuments({ category: categoryId });

        logInfo(`[${requestId}] Successfully retrieved products for category: ${categoryId}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCTS_RETRIEVED,
            data: {
                products,
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

export const searchProducts = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { query, page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
        const skip = (page - 1) * limit;

        const searchQuery = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } }
            ]
        };

        const products = await Product.find(searchQuery)
            .sort({ [sort]: order === 'desc' ? -1 : 1 })
            .skip(skip)
            .limit(limit)
            .populate('category', 'name');

        const total = await Product.countDocuments(searchQuery);

        logInfo(`[${requestId}] Successfully searched products for query: ${query}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCTS_RETRIEVED,
            data: {
                products,
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

export const createProduct = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description, price, category, stock, images } = req.body;

        const existingProduct = await Product.findOne({ name });
        if (existingProduct) {
            logError(`[${requestId}] Product already exists: ${name}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_EXISTS
            });
        }

        const product = new Product({
            name,
            description,
            price,
            category,
            stock,
            images,
            status: PRODUCT_STATUS.ACTIVE
        });

        const savedProduct = await product.save();

        logInfo(`[${requestId}] Successfully created product: ${name}`);
        res.status(201).json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_CREATED,
            data: savedProduct
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateProduct = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { name, description, price, category, stock, images } = req.body;
        const productId = req.params.id;

        const product = await Product.findById(productId);
        if (!product) {
            logError(`[${requestId}] Product not found: ${productId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        if (name && name !== product.name) {
            const existingProduct = await Product.findOne({ name });
            if (existingProduct) {
                logError(`[${requestId}] Product already exists: ${name}`);
                return res.status(400).json({
                    success: false,
                    message: ERROR_MESSAGES.PRODUCT_EXISTS
                });
            }
        }

        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.category = category || product.category;
        product.stock = stock || product.stock;
        product.images = images || product.images;

        const updatedProduct = await product.save();

        logInfo(`[${requestId}] Successfully updated product: ${product.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_UPDATED,
            data: updatedProduct
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const deleteProduct = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const productId = req.params.id;

        const product = await Product.findById(productId);
        if (!product) {
            logError(`[${requestId}] Product not found: ${productId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        await product.deleteOne();

        logInfo(`[${requestId}] Successfully deleted product: ${product.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_DELETED
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateProductStock = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { stock } = req.body;
        const productId = req.params.id;

        const product = await Product.findById(productId);
        if (!product) {
            logError(`[${requestId}] Product not found: ${productId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        product.stock = stock;
        await product.save();

        logInfo(`[${requestId}] Successfully updated product stock: ${product.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_STOCK_UPDATED,
            data: product
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateProductStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { status } = req.body;
        const productId = req.params.id;

        if (!Object.values(PRODUCT_STATUS).includes(status)) {
            logError(`[${requestId}] Invalid product status: ${status}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.INVALID_PRODUCT_STATUS
            });
        }

        const product = await Product.findById(productId);
        if (!product) {
            logError(`[${requestId}] Product not found: ${productId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        product.status = status;
        await product.save();

        logInfo(`[${requestId}] Successfully updated product status: ${product.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_STATUS_UPDATED,
            data: product
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getBestSellingProducts = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const limit = parseInt(req.query.limit) || 10;

        logInfo(`[${requestId}] Fetching ${limit} best selling products`);
        
        const bestSellers = await Order.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    totalSold: { $sum: "$items.quantity" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            { $sort: { totalSold: -1 } },
            { $limit: limit }
        ]);

        logInfo(`[${requestId}] Successfully fetched ${bestSellers.length} best selling products`);
        res.json({
            success: true,
            data: bestSellers
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};