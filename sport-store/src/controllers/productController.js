import mongoose from "mongoose";
import Product from "../models/product.js";
import Category from "../models/category.js";
import Order from "../models/order.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import env from "../config/env.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES, PRODUCT_STATUS } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";
import { generateSKU } from "../utils/productUtils.js";
import cloudinary from "../config/cloudinary.js";

// Constants
const REQUIRED_FIELDS = {
    name: "Tên sản phẩm là bắt buộc",
    description: "Mô tả sản phẩm là bắt buộc",
    brand: "Thương hiệu là bắt buộc",
    originalPrice: "Giá gốc là bắt buộc",
    stock: "Số lượng tồn kho là bắt buộc",
    categoryId: "Danh mục là bắt buộc",
    mainImage: "Ảnh chính là bắt buộc"
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

    if (productData.originalPrice && (isNaN(productData.originalPrice) || productData.originalPrice < 0)) {
        errors.originalPrice = ERROR_MESSAGES.INVALID_PRICE;
    }

    if (productData.salePrice && (isNaN(productData.salePrice) || productData.salePrice < 0)) {
        errors.salePrice = ERROR_MESSAGES.INVALID_PRICE;
    }

    if (productData.stock && (isNaN(productData.stock) || productData.stock < 0)) {
        errors.stock = ERROR_MESSAGES.INVALID_STOCK;
    }

    return errors;
};

// Upload ảnh lên Cloudinary
const uploadImageToCloudinary = async (imageFile) => {
  try {
    const result = await cloudinary.uploader.upload(imageFile, {
      folder: "sport-store",
      resource_type: "auto"
    });
    return result.secure_url;
  } catch (error) {
    logError(`Error uploading image to Cloudinary: ${error.message}`);
    throw new Error("Không thể tải ảnh lên Cloudinary");
  }
};

// Controllers
export const getAllProducts = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { page = 1, limit = 10, sort = 'createdAt', order = 'desc' } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sort] = order === 'desc' ? -1 : 1;

        // Thực hiện query với pagination
        const products = await Product.find({ isDeleted: false })
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });

        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments({ isDeleted: false });

        logInfo(`[${requestId}] Successfully fetched ${products.length} products`);
        res.json({
            success: true,
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
        const { id } = req.params;
        
        const product = await Product.findOne({ 
            _id: id,
            isActive: true,
            isDeleted: false
        }).populate({
            path: 'category',
            select: 'name slug',
            match: { isActive: true },
            model: 'Category'
        });
        
        if (!product) {
            logWarn(`[${requestId}] Product not found with id: ${id}`);
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại'
            });
        }
        
        logInfo(`[${requestId}] Successfully retrieved product with id: ${id}`);
        res.json({
            success: true,
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
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Kiểm tra category có tồn tại và active
        const category = await Category.findOne({ 
            categoryId,
            isActive: true
        });
        
        if (!category) {
            logWarn(`[${requestId}] Category not found with id: ${categoryId}`);
            return res.status(404).json({
                success: false,
                message: 'Danh mục không tồn tại'
            });
        }
        
        // Xây dựng query
        const query = { 
            category: categoryId,
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products from category: ${categoryId}`);
        res.json({
            success: true,
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
        const { 
            keyword, 
            categoryId, 
            brand, 
            minPrice, 
            maxPrice, 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { isActive: true, isDeleted: false };
        
        // Thêm điều kiện tìm kiếm theo từ khóa
        if (keyword) {
            query.$or = [
                { name: { $regex: keyword, $options: 'i' } },
                { description: { $regex: keyword, $options: 'i' } },
                { brand: { $regex: keyword, $options: 'i' } },
                { tags: { $regex: keyword, $options: 'i' } }
            ];
        }
        
        // Thêm điều kiện tìm kiếm theo danh mục
        if (categoryId) {
            query.category = categoryId;
        }
        
        // Thêm điều kiện tìm kiếm theo thương hiệu
        if (brand) {
            query.brand = { $regex: brand, $options: 'i' };
        }
        
        // Thêm điều kiện tìm kiếm theo giá
        if (minPrice || maxPrice) {
            query.originalPrice = {};
            if (minPrice) query.originalPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.originalPrice.$lte = parseFloat(maxPrice);
        }
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully searched products with ${products.length} results`);
        res.json({
            success: true,
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
        const { 
            name, 
            description, 
            originalPrice, 
            salePrice, 
            stock, 
            categoryId, 
            brand, 
            mainImage, 
            subImages, 
            colors, 
            sizes, 
            tags, 
            isActive 
        } = req.body;

        // Kiểm tra danh mục tồn tại
        const category = await Category.findOne({ categoryId });
        if (!category) {
            logError(`[${requestId}] Category not found: ${categoryId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.CATEGORY_NOT_FOUND
            });
        }

        // Tạo slug từ tên sản phẩm
        const slug = name
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');

        // Tạo SKU duy nhất
        let sku;
        let isUniqueSKU = false;
        let attempts = 0;
        const maxAttempts = 10;

        while (!isUniqueSKU && attempts < maxAttempts) {
            sku = generateSKU();
            const existingProduct = await Product.findOne({ sku });
            if (!existingProduct) {
                isUniqueSKU = true;
            }
            attempts++;
        }

        if (!isUniqueSKU) {
            logError(`[${requestId}] Failed to generate unique SKU after ${maxAttempts} attempts`);
            return res.status(500).json({
                success: false,
                message: "Không thể tạo SKU duy nhất. Vui lòng thử lại."
            });
        }

        // Tạo sản phẩm mới
        const product = new Product({
            name,
            slug,
            description,
            originalPrice,
            salePrice,
            stock,
            category: categoryId,
            brand,
            mainImage,
            subImages: subImages || [],
            colors: colors || [],
            sizes: sizes || [],
            tags: tags || [],
            isActive: isActive !== undefined ? isActive : true,
            sku
        });

        // Lưu sản phẩm
        await product.save();

        // Log thành công
        logInfo(`[${requestId}] Product created successfully: ${product._id}`);

        // Trả về response
        return res.status(201).json({
            success: true,
            message: 'Product created successfully',
            data: product
        });
    } catch (error) {
        // Xử lý lỗi unique constraint
        if (error.code === 11000) {
            logError(`[${requestId}] Product already exists: ${req.body.name}`);
            return res.status(400).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_EXISTS
            });
        }

        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const updateProduct = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            name, 
            description, 
            originalPrice, 
            salePrice, 
            stock, 
            categoryId, 
            brand, 
            mainImage, 
            subImages, 
            colors, 
            sizes, 
            tags, 
            isActive 
        } = req.body;
        
        const productId = req.params.id;

        // Kiểm tra sản phẩm tồn tại
        const product = await Product.findById(productId);
        if (!product) {
            logError(`[${requestId}] Product not found: ${productId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        // Kiểm tra tên sản phẩm trùng lặp nếu có thay đổi
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

        // Kiểm tra danh mục tồn tại nếu có thay đổi
        if (categoryId && categoryId !== product.category) {
            const category = await Category.findOne({ categoryId });
            if (!category) {
                logError(`[${requestId}] Category not found: ${categoryId}`);
                return res.status(404).json({
                    success: false,
                    message: ERROR_MESSAGES.CATEGORY_NOT_FOUND
                });
            }
        }

        // Cập nhật thông tin sản phẩm
        if (name) {
            product.name = name;
            // Cập nhật slug nếu tên thay đổi
            product.slug = name
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');
        }
        if (description) product.description = description;
        if (originalPrice) product.originalPrice = originalPrice;
        if (salePrice !== undefined) product.salePrice = salePrice;
        if (stock !== undefined) product.stock = stock;
        if (categoryId) product.category = categoryId;
        if (brand) product.brand = brand;
        if (mainImage) product.mainImage = mainImage;
        if (subImages) product.subImages = subImages;
        if (colors) product.colors = colors;
        if (sizes) product.sizes = sizes;
        if (tags) product.tags = tags;
        if (isActive !== undefined) product.isActive = isActive;
        
        // Cập nhật thông tin người cập nhật
        if (req.user) product.updatedBy = req.user._id;

        const updatedProduct = await product.save();

        logInfo(`[${requestId}] Successfully updated product: ${updatedProduct.name}`);
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

export const updateProductStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { isActive } = req.body;
        const productId = req.params.id;

        // Kiểm tra sản phẩm tồn tại
        const product = await Product.findById(productId);
        if (!product) {
            logError(`[${requestId}] Product not found: ${productId}`);
            return res.status(404).json({
                success: false,
                message: ERROR_MESSAGES.PRODUCT_NOT_FOUND
            });
        }

        // Cập nhật trạng thái sản phẩm
        product.isActive = isActive;
        if (req.user) product.updatedBy = req.user._id;

        const updatedProduct = await product.save();

        logInfo(`[${requestId}] Successfully updated product status: ${updatedProduct.name}`);
        res.json({
            success: true,
            message: SUCCESS_MESSAGES.PRODUCT_STATUS_UPDATED,
            data: updatedProduct
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getBestSellingProducts = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { limit = 10 } = req.query;
        
        const products = await Product.find({ 
            isActive: true,
            isDeleted: false 
        })
        .sort({ soldCount: -1 })
        .limit(parseInt(limit))
        .populate({
            path: 'category',
            select: 'name slug',
            match: { isActive: true },
            model: 'Category'
        });
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} best selling products`);
        res.json({
            success: true,
            data: products
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getProductBySlug = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { slug } = req.params;
        
        const product = await Product.findOne({ 
            slug,
            isActive: true,
            isDeleted: false
        }).populate({
            path: 'category',
            select: 'name slug',
            match: { isActive: true },
            model: 'Category'
        });
        
        if (!product) {
            logWarn(`[${requestId}] Product not found with slug: ${slug}`);
            return res.status(404).json({
                success: false,
                message: 'Sản phẩm không tồn tại'
            });
        }
        
        logInfo(`[${requestId}] Successfully retrieved product with slug: ${slug}`);
        res.json({
            success: true,
            data: product
        });
    } catch (error) {
        const errorResponse = handleError(error, requestId);
        res.status(500).json(errorResponse);
    }
};

export const getProductsByBrand = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { brand } = req.params;
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            brand: { $regex: brand, $options: 'i' },
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products from brand: ${brand}`);
        res.json({
            success: true,
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

export const getProductsByTag = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { tag } = req.params;
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            tags: { $regex: tag, $options: 'i' },
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products with tag: ${tag}`);
        res.json({
            success: true,
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

export const getProductsByPriceRange = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            minPrice, 
            maxPrice,
            sortBy = 'originalPrice', 
            sortOrder = 'asc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false
        };
        
        // Thêm điều kiện giá
        if (minPrice || maxPrice) {
            query.originalPrice = {};
            if (minPrice) query.originalPrice.$gte = parseFloat(minPrice);
            if (maxPrice) query.originalPrice.$lte = parseFloat(maxPrice);
        }
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products in price range ${minPrice || 0} - ${maxPrice || 'unlimited'}`);
        res.json({
            success: true,
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

export const getProductsByDiscount = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            minDiscount = 0,
            maxDiscount = 100,
            sortBy = 'discountPercentage', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false,
            'discountPercentage': {
                $gte: parseFloat(minDiscount),
                $lte: parseFloat(maxDiscount)
            }
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products with discount between ${minDiscount}% and ${maxDiscount}%`);
        res.json({
            success: true,
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

export const getProductsByStock = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false,
            stock: { $gt: 0 }
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products in stock`);
        res.json({
            success: true,
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

export const getProductsByLowStockStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'stock', 
            sortOrder = 'asc',
            page = 1,
            limit = 10,
            threshold = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            stock: { $gt: 0, $lte: parseInt(threshold) },
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} low stock products`);
        res.json({
            success: true,
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

export const getProductsByHighStock = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            threshold = 100,
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false,
            stock: { $gte: parseInt(threshold) }
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products with high stock (threshold: ${threshold})`);
        res.json({
            success: true,
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

export const getProductsBySoldCount = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            threshold = 10,
            sortBy = 'soldCount', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false,
            soldCount: { $gte: parseInt(threshold) }
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products with high sold count (threshold: ${threshold})`);
        res.json({
            success: true,
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

export const getProductsByRating = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            minRating = 4,
            sortBy = 'rating', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false,
            rating: { $gte: parseFloat(minRating) }
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products with high rating (minRating: ${minRating})`);
        res.json({
            success: true,
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

export const getProductsByReviewCount = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            minReviews = 5,
            sortBy = 'reviewCount', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false,
            reviewCount: { $gte: parseInt(minReviews) }
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products with high review count (minReviews: ${minReviews})`);
        res.json({
            success: true,
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

export const getProductsByCreatedDate = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            startDate,
            endDate,
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false
        };
        
        // Thêm điều kiện ngày tạo
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products created between ${startDate || 'any'} and ${endDate || 'any'}`);
        res.json({
            success: true,
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

export const getProductsByUpdatedDate = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            startDate,
            endDate,
            sortBy = 'updatedAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false
        };
        
        // Thêm điều kiện ngày cập nhật
        if (startDate || endDate) {
            query.updatedAt = {};
            if (startDate) query.updatedAt.$gte = new Date(startDate);
            if (endDate) query.updatedAt.$lte = new Date(endDate);
        }
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products updated between ${startDate || 'any'} and ${endDate || 'any'}`);
        res.json({
            success: true,
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

export const getProductsByDeletedDate = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            startDate,
            endDate,
            sortBy = 'deletedAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isDeleted: true
        };
        
        // Thêm điều kiện ngày xóa
        if (startDate || endDate) {
            query.deletedAt = {};
            if (startDate) query.deletedAt.$gte = new Date(startDate);
            if (endDate) query.deletedAt.$lte = new Date(endDate);
        }
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products deleted between ${startDate || 'any'} and ${endDate || 'any'}`);
        res.json({
            success: true,
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

export const getProductsByStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            status,
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isDeleted: false
        };
        
        // Thêm điều kiện trạng thái
        if (status) {
            query.isActive = status === 'active';
        }
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} products with status: ${status || 'any'}`);
        res.json({
            success: true,
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

export const getProductsByDeletedStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'deletedAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isDeleted: true
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} deleted products`);
        res.json({
            success: true,
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

export const getProductsByNotDeletedStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} not deleted products`);
        res.json({
            success: true,
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

export const getProductsByActiveStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} active products`);
        res.json({
            success: true,
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

export const getProductsByInactiveStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isActive: false,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} inactive products`);
        res.json({
            success: true,
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

export const getProductsByFeaturedStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isFeatured: true,
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} featured products`);
        res.json({
            success: true,
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

export const getProductsByNewStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isNew: true,
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} new products`);
        res.json({
            success: true,
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

export const getProductsByBestSellerStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'soldCount', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isBestSeller: true,
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} best seller products`);
        res.json({
            success: true,
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

export const getProductsByOnSaleStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'discountPercentage', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            isOnSale: true,
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} on sale products`);
        res.json({
            success: true,
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

export const getProductsByOutOfStockStatus = async (req, res) => {
    const requestId = req.id || 'unknown';
    
    try {
        const { 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            page = 1,
            limit = 10
        } = req.query;
        
        // Xây dựng query
        const query = { 
            stock: 0,
            isActive: true,
            isDeleted: false
        };
        
        // Xây dựng options cho sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
        
        // Thực hiện query với pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .populate({
                path: 'category',
                select: 'name slug',
                match: { isActive: true },
                model: 'Category'
            });
            
        // Đếm tổng số sản phẩm
        const total = await Product.countDocuments(query);
        
        logInfo(`[${requestId}] Successfully retrieved ${products.length} out of stock products`);
        res.json({
            success: true,
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