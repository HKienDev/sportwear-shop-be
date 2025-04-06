import mongoose from "mongoose";
import Product from "../models/product.js";
import Category from "../models/category.js";
import { logInfo, logError, logWarn } from "../utils/logger.js";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../utils/constants.js";
import { handleError } from "../utils/helpers.js";
import { generateSKU, generateUniqueSKU } from "../utils/productUtils.js";
import cloudinary from "../config/cloudinary.js";
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { createProductSchema, updateProductSchema, searchProductSchema, productStatusSchema, updateSizeStatusSchema } from '../schemas/productSchema.js';
import { sendErrorResponse, sendSuccessResponse } from '../utils/responseUtils.js';
import { generateRequestId } from '../utils/requestUtils.js';
import slugify from 'slugify';

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

// Utility functions for pagination and response
const getPaginationOptions = (page = 1, limit = 5) => {
  const skip = (parseInt(page) - 1) * parseInt(limit);
  return { skip, limit: parseInt(limit) };
};

const getSortOptions = (sortBy = 'createdAt', sortOrder = 'desc') => {
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;
  return sortOptions;
};

const getCategoryPopulateOptions = () => ({
    path: 'categoryId',
    select: 'name slug categoryId',
    match: { isActive: true },
    model: 'Category'
});

const sendNotFoundResponse = (res, message, requestId) => {
  logWarn(`[${requestId}] ${message}`);
  return res.status(404).json({
    success: false,
    message
  });
};

// Hàm tiện ích chung để xử lý truy vấn sản phẩm
const executeProductQuery = async (query, options = {}) => {
    const { 
        sortBy = 'createdAt', 
        sortOrder = 'desc',
        page = 1,
        limit = 10,
        requestId = 'unknown',
        logMessage = ''
    } = options;
    
    const sortOptions = getSortOptions(sortBy, sortOrder);
    const { skip, limit: limitValue } = getPaginationOptions(page, limit);
    
    // Thực hiện query với pagination
    const products = await Product.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitValue)
        .populate({
            path: 'categoryId',
            select: 'name slug categoryId',
            match: { isActive: true }
        });
        
    // Đếm tổng số sản phẩm
    const total = await Product.countDocuments(query);
    
    if (logMessage) {
        logInfo(`[${requestId}] ${logMessage}`);
    }
    
    return {
        products,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

// API PUBLIC (cho người dùng)
// GET /api/products - Lấy danh sách sản phẩm (có phân trang, filter, sort)
export const getProducts = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request query
        console.log(`[${requestId}] Request query:`, JSON.stringify(req.query, null, 2));

        // Lấy các tham số từ query
        const {
            keyword,
            categoryId,
            brand,
            minPrice,
            maxPrice,
            sort = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 5
        } = req.query;

        // Build query
        const query = {};
        if (keyword) {
            query.$text = { $search: keyword };
        }
        if (categoryId) {
            // Sử dụng categoryId thay vì _id để tìm kiếm
            query.categoryId = categoryId;
        }
        if (brand) {
            query.brand = brand;
        }
        if (minPrice !== undefined || maxPrice !== undefined) {
            query.salePrice = {};
            if (minPrice !== undefined) {
                query.salePrice.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined) {
                query.salePrice.$lte = Number(maxPrice);
            }
        }

        console.log(`[${requestId}] Query:`, JSON.stringify(query, null, 2));

        // Execute query with pagination
        const skip = (Number(page) - 1) * Number(limit);
        const sortOptions = { [sort]: order === 'desc' ? -1 : 1 };
        
        const [products, total] = await Promise.all([
            Product.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit))
                .populate({
                    path: 'categoryId',
                    select: 'name slug categoryId',
                    match: { isActive: true }
                })
                .lean(),
            Product.countDocuments(query)
        ]);

        console.log(`[${requestId}] Query result:`, JSON.stringify({
            total,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(total / Number(limit))
        }, null, 2));

        // Log success
        logInfo(`[${requestId}] Lấy danh sách sản phẩm thành công`);
        
        // Return success response
        return sendSuccessResponse(res, 200, 'Lấy danh sách sản phẩm thành công', {
            products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error in getProducts:`, error);
        logError(`[${requestId}] Lỗi khi lấy danh sách sản phẩm:`, error.message || error);
        return sendErrorResponse(res, 500, 'Lỗi khi lấy danh sách sản phẩm', error, requestId);
    }
};

// GET /api/products/:sku - Lấy chi tiết 1 sản phẩm bằng sku
export const getProductBySku = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { sku } = req.params;
        const product = await Product.findOne({ sku });

        if (!product) {
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }

        return sendSuccessResponse(res, 200, 'Product retrieved successfully', { product });
    } catch (error) {
        console.error(`[${requestId}] Error in getProductBySku:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
    }
};

// GET /api/products/category/:categoryId - Lấy danh sách sản phẩm theo danh mục
export const getProductsByCategory = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { categoryId } = req.params;
        const { error, value } = searchProductSchema.safeParse(req.query);
        if (error) {
            return sendErrorResponse(res, 400, 'Invalid query parameters', error.errors, requestId);
        }

        const {
            sort = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 5
        } = value;

        // Build query
        const query = { 
            categoryId,
            isActive: true,
        };

        // Execute query with pagination
        const skip = (page - 1) * limit;
        const sortOptions = { [sort]: order === 'desc' ? -1 : 1 };
        
        const [products, total] = await Promise.all([
            Product.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(limit)
                .populate({
                    path: 'categoryId',
                    select: 'name slug categoryId',
                    match: { isActive: true }
                })
                .lean(),
            Product.countDocuments(query)
        ]);

        return sendSuccessResponse(res, 200, 'Products retrieved successfully', {
            products,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error(`[${requestId}] Error in getProductsByCategory:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
    }
};

// Hàm tạo slug từ tên sản phẩm
const generateSlug = (name) => {
    return slugify(name, {
        lower: true,
        strict: true,
        locale: 'vi'
    });
};

// API ADMIN (quản lý sản phẩm)
// POST /api/products - Tạo sản phẩm mới
export const createProduct = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request body
        console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));

        // Kiểm tra dữ liệu đầu vào
        if (!req.body || Object.keys(req.body).length === 0) {
            console.log(`[${requestId}] Request body is empty`);
            return sendErrorResponse(res, 400, 'Request body is empty', {}, requestId);
        }

        // Chuyển đổi các trường số từ chuỗi sang số
        const processedBody = {
            ...req.body,
            originalPrice: typeof req.body.originalPrice === 'string' ? parseFloat(req.body.originalPrice) : req.body.originalPrice,
            salePrice: typeof req.body.salePrice === 'string' ? parseFloat(req.body.salePrice) : req.body.salePrice,
            stock: typeof req.body.stock === 'string' ? parseInt(req.body.stock) : req.body.stock
        };

        console.log(`[${requestId}] Processed body:`, JSON.stringify(processedBody, null, 2));

        // Kiểm tra các trường bắt buộc
        const requiredFields = ['name', 'description', 'originalPrice', 'stock', 'categoryId', 'brand', 'mainImage'];
        const missingFields = {};
        
        for (const field of requiredFields) {
            if (!processedBody[field]) {
                missingFields[field] = `${field} là bắt buộc`;
                console.log(`[${requestId}] Missing required field: ${field}`);
            }
        }
        
        if (Object.keys(missingFields).length > 0) {
            console.log(`[${requestId}] Missing fields:`, JSON.stringify(missingFields, null, 2));
            return sendErrorResponse(res, 400, 'Missing required fields', missingFields, requestId);
        }

        // Kiểm tra categoryId có tồn tại
        console.log(`[${requestId}] Checking categoryId: ${processedBody.categoryId}`);
        const category = await Category.findOne({ categoryId: processedBody.categoryId });
        if (!category) {
            console.log(`[${requestId}] Category not found: ${processedBody.categoryId}`);
            return sendErrorResponse(
                res,
                404,
                'Category not found',
                { categoryId: 'Danh mục không tồn tại' },
                requestId
            );
        }

        // Check if product name already exists
        console.log(`[${requestId}] Checking product name: ${processedBody.name}`);
        const existingProduct = await Product.findOne({ name: processedBody.name });
        if (existingProduct) {
            console.log(`[${requestId}] Product name already exists: ${processedBody.name}`);
            return sendErrorResponse(res, 400, 'Tên sản phẩm đã tồn tại', {}, requestId);
        }

        // Generate unique SKU
        console.log(`[${requestId}] Generating unique SKU`);
        let sku;
        try {
            sku = await generateUniqueSKU(Product);
            console.log(`[${requestId}] Generated SKU: ${sku}`);
        } catch (error) {
            console.log(`[${requestId}] Error generating SKU:`, error);
            return sendErrorResponse(res, 500, 'Could not generate unique SKU', {}, requestId);
        }

        // Generate slug from name
        console.log(`[${requestId}] Generating slug from name: ${processedBody.name}`);
        const slug = generateSlug(processedBody.name);
        console.log(`[${requestId}] Generated slug: ${slug}`);

        // Tạo sản phẩm với dữ liệu đã được xử lý
        console.log(`[${requestId}] Creating product with data:`, JSON.stringify(processedBody, null, 2));
        const productData = {
            ...processedBody,
            sku,
            slug,
            createdBy: req.user?._id
        };

        const product = new Product(productData);
        
        // Lưu sản phẩm vào database
        console.log(`[${requestId}] Saving product to database`);
        const savedProduct = await product.save();
        console.log(`[${requestId}] Product saved successfully:`, savedProduct._id);

        // Log success
        logInfo(`[${requestId}] Product created successfully: ${savedProduct?.name || 'Unknown'}`);
        
        // Return success response
        return sendSuccessResponse(res, 201, 'Product created successfully', { 
            product: {
                _id: savedProduct._id,
                sku: savedProduct.sku,
                name: savedProduct.name,
                slug: savedProduct.slug,
                categoryId: savedProduct.categoryId,
                brand: savedProduct.brand,
                originalPrice: savedProduct.originalPrice,
                salePrice: savedProduct.salePrice,
                stock: savedProduct.stock,
                mainImage: savedProduct.mainImage,
                subImages: savedProduct.subImages,
                colors: savedProduct.colors,
                sizes: savedProduct.sizes,
                tags: savedProduct.tags,
                isActive: savedProduct.isActive,
                createdAt: savedProduct.createdAt
            }
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error creating product:`, error);
        logError(`[${requestId}] Error creating product:`, error.message || error);
        return sendErrorResponse(res, 500, 'Error creating product', error, requestId);
    }
};

// PUT /api/products/:sku - Cập nhật sản phẩm
export const updateProduct = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request params and body
        console.log(`[${requestId}] Request params:`, JSON.stringify(req.params, null, 2));
        console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));

        const { sku } = req.params;
        
        // Kiểm tra dữ liệu đầu vào
        if (!req.body || Object.keys(req.body).length === 0) {
            console.log(`[${requestId}] Request body is empty`);
            return sendErrorResponse(res, 400, 'Request body is empty', {}, requestId);
        }

        // Chuyển đổi các trường số từ chuỗi sang số
        const processedBody = {
            ...req.body,
            originalPrice: typeof req.body.originalPrice === 'string' ? parseFloat(req.body.originalPrice) : req.body.originalPrice,
            salePrice: typeof req.body.salePrice === 'string' ? parseFloat(req.body.salePrice) : req.body.salePrice,
            stock: typeof req.body.stock === 'string' ? parseInt(req.body.stock) : req.body.stock
        };

        console.log(`[${requestId}] Processed body:`, JSON.stringify(processedBody, null, 2));

        // Validate request data
        const { error, value } = updateProductSchema.safeParse(processedBody);
        if (error) {
            // Debug: Log validation errors
            console.log(`[${requestId}] Validation errors:`, JSON.stringify(error.errors, null, 2));
            return sendErrorResponse(res, 400, 'Invalid product data', error.errors, requestId);
        }

        // Debug: Log parsed value
        console.log(`[${requestId}] Parsed value:`, JSON.stringify(value, null, 2));

        // Nếu value là undefined, sử dụng processedBody
        const updateData = value || processedBody;

        // Check if product exists
        console.log(`[${requestId}] Checking if product exists with SKU: ${sku}`);
        const product = await Product.findOne({ sku });
        if (!product) {
            console.log(`[${requestId}] Product not found with SKU: ${sku}`);
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }

        // Check if category exists if categoryId is provided
        if (updateData.categoryId) {
            console.log(`[${requestId}] Checking if category exists: ${updateData.categoryId}`);
            const category = await Category.findOne({ categoryId: updateData.categoryId });
            if (!category) {
                console.log(`[${requestId}] Category not found: ${updateData.categoryId}`);
                return sendErrorResponse(res, 404, 'Category not found', {}, requestId);
            }
        }

        // Check if product name already exists (if name is being updated)
        if (updateData.name && updateData.name !== product.name) {
            console.log(`[${requestId}] Checking if product name already exists: ${updateData.name}`);
            const existingProduct = await Product.findOne({ name: updateData.name, sku: { $ne: sku } });
            if (existingProduct) {
                console.log(`[${requestId}] Product name already exists: ${updateData.name}`);
                return sendErrorResponse(res, 400, 'Tên sản phẩm đã tồn tại', {}, requestId);
            }
        }

        // Generate slug from name if name is being updated
        if (updateData.name && updateData.name !== product.name) {
            console.log(`[${requestId}] Generating slug from name: ${updateData.name}`);
            updateData.slug = generateSlug(updateData.name);
            console.log(`[${requestId}] Generated slug: ${updateData.slug}`);
        }

        // Xử lý cập nhật sizes nếu có
        if (updateData.sizes && Array.isArray(updateData.sizes)) {
            console.log(`[${requestId}] Processing sizes update`);
            
            // Nếu sizes là một mảng các đối tượng với thuộc tính size
            if (updateData.sizes.length > 0 && typeof updateData.sizes[0] === 'object' && 'size' in updateData.sizes[0]) {
                console.log(`[${requestId}] Sizes is an array of objects with size property`);
                
                // Lọc bỏ các size không hợp lệ và chuyển đổi thành mảng các chuỗi
                updateData.sizes = updateData.sizes
                    .filter(sizeObj => 
                        sizeObj && typeof sizeObj === 'object' && 
                        'size' in sizeObj && 
                        typeof sizeObj.size === 'string' && 
                        sizeObj.size.trim() !== ''
                    )
                    .map(sizeObj => sizeObj.size);
                
                console.log(`[${requestId}] Converted sizes to strings:`, JSON.stringify(updateData.sizes, null, 2));
            } 
            // Nếu sizes là một mảng các chuỗi
            else if (updateData.sizes.every(size => typeof size === 'string')) {
                console.log(`[${requestId}] Sizes is an array of strings`);
                
                // Lọc bỏ các chuỗi không hợp lệ
                updateData.sizes = updateData.sizes.filter(size => 
                    typeof size === 'string' && size.trim() !== ''
                );
                
                console.log(`[${requestId}] Filtered sizes:`, JSON.stringify(updateData.sizes, null, 2));
            }
        }

        // Xử lý cập nhật colors nếu có
        if (updateData.colors && Array.isArray(updateData.colors)) {
            console.log(`[${requestId}] Processing colors update`);
            
            // Lọc bỏ các màu không hợp lệ
            updateData.colors = updateData.colors.filter(color => 
                typeof color === 'string' && color.trim() !== ''
            );
            
            console.log(`[${requestId}] Filtered colors:`, JSON.stringify(updateData.colors, null, 2));
        }

        // Xử lý cập nhật tags nếu có
        if (updateData.tags && Array.isArray(updateData.tags)) {
            console.log(`[${requestId}] Processing tags update`);
            
            // Lọc bỏ các tag không hợp lệ
            updateData.tags = updateData.tags.filter(tag => 
                typeof tag === 'string' && tag.trim() !== ''
            );
            
            console.log(`[${requestId}] Filtered tags:`, JSON.stringify(updateData.tags, null, 2));
        }

        // Xử lý cập nhật subImages nếu có
        if (updateData.subImages && Array.isArray(updateData.subImages)) {
            console.log(`[${requestId}] Processing subImages update`);
            
            // Lọc bỏ các URL không hợp lệ
            updateData.subImages = updateData.subImages.filter(url => 
                typeof url === 'string' && url.trim() !== ''
            );
            
            console.log(`[${requestId}] Filtered subImages:`, JSON.stringify(updateData.subImages, null, 2));
        }

        // Update product
        console.log(`[${requestId}] Updating product with data:`, JSON.stringify(updateData, null, 2));
        
        // Xử lý trường hợp salePrice là 0
        if (updateData.salePrice === 0) {
            // Nếu chỉ cập nhật salePrice mà không cập nhật originalPrice
            if (!updateData.originalPrice) {
                // Lấy originalPrice từ sản phẩm hiện tại
                updateData.originalPrice = product.originalPrice;
            }
        }
        
        // Xử lý trường hợp cập nhật name
        if (updateData.name) {
            // Kiểm tra xem tên sản phẩm đã tồn tại chưa
            const existingProduct = await Product.findOne({ 
                name: updateData.name, 
                sku: { $ne: sku } 
            });
            
            if (existingProduct) {
                console.log(`[${requestId}] Product name already exists: ${updateData.name}`);
                return sendErrorResponse(res, 400, 'Tên sản phẩm đã tồn tại', {}, requestId);
            }
        }
        
        // Xử lý trường hợp originalPrice là 0
        if (updateData.originalPrice === 0) {
            console.log(`[${requestId}] Original price is 0, setting isActive to false`);
            updateData.isActive = false;
        }
        
        // Cập nhật sản phẩm
        try {
            // Sử dụng findOneAndUpdate với runValidators: false để tránh lỗi validation
            const updatedProduct = await Product.findOneAndUpdate(
                { sku },
                { $set: updateData },
                { new: true, runValidators: false }
            ).populate({
                path: 'categoryId',
                select: 'name slug categoryId',
                match: { isActive: true }
            });
            
            console.log(`[${requestId}] Product updated successfully:`, updatedProduct._id);
            
            // Log success
            logInfo(`[${requestId}] Product updated successfully: ${updatedProduct?.name || 'Unknown'}`);
            
            // Return success response
            return sendSuccessResponse(res, 200, 'Product updated successfully', { 
                product: {
                    _id: updatedProduct._id,
                    sku: updatedProduct.sku,
                    name: updatedProduct.name,
                    slug: updatedProduct.slug,
                    categoryId: updatedProduct.categoryId,
                    brand: updatedProduct.brand,
                    originalPrice: updatedProduct.originalPrice,
                    salePrice: updatedProduct.salePrice,
                    stock: updatedProduct.stock,
                    mainImage: updatedProduct.mainImage,
                    subImages: updatedProduct.subImages,
                    colors: updatedProduct.colors,
                    sizes: updatedProduct.sizes,
                    tags: updatedProduct.tags,
                    isActive: updatedProduct.isActive,
                    updatedAt: updatedProduct.updatedAt
                }
            }, requestId);
        } catch (error) {
            console.error(`[${requestId}] Error in updateProduct:`, error);
            logError(`[${requestId}] Error updating product:`, error.message || error);
            return sendErrorResponse(res, 500, 'Error updating product', error, requestId);
        }
    } catch (error) {
        console.error(`[${requestId}] Error in updateProduct:`, error);
        logError(`[${requestId}] Error updating product:`, error.message || error);
        return sendErrorResponse(res, 500, 'Error updating product', error, requestId);
    }
};

// DELETE /api/products/:sku - Xoá sản phẩm
export const deleteProduct = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { sku } = req.params;
        console.log(`Deleting product with SKU: ${sku}`);
        
        const product = await Product.findOne({ sku });
        if (!product) {
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }

        // Xóa triệt để sản phẩm khỏi database
        await Product.deleteOne({ sku });

        return sendSuccessResponse(res, 200, 'Product deleted successfully');
    } catch (error) {
        console.error(`[${requestId}] Error in deleteProduct:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
    }
};

// PATCH /api/products/:sku/status - Đổi trạng thái hiển thị (active/inactive)
export const updateProductStatus = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request params and body
        console.log(`[${requestId}] Request params:`, JSON.stringify(req.params, null, 2));
        console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));

        const { sku } = req.params;
        
        // Kiểm tra dữ liệu đầu vào
        if (!req.body || typeof req.body.isActive !== 'boolean') {
            console.log(`[${requestId}] Invalid request body:`, req.body);
            return sendErrorResponse(res, 400, 'Invalid request body. isActive must be a boolean', {}, requestId);
        }

        // Check if product exists
        console.log(`[${requestId}] Checking if product exists with SKU: ${sku}`);
        const product = await Product.findOne({ sku });
        if (!product) {
            console.log(`[${requestId}] Product not found with SKU: ${sku}`);
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }

        // Log để debug
        console.log(`[${requestId}] Updating product status:`, {
            productSku: sku,
            currentStatus: product.isActive,
            newStatus: req.body.isActive,
            requestBody: req.body
        });

        // Update product status
        console.log(`[${requestId}] Updating product status to:`, req.body.isActive);
        const updatedProduct = await Product.findOneAndUpdate(
            { sku },
            { $set: { isActive: req.body.isActive } },
            { new: true, runValidators: true }
        ).populate('categoryId', 'name slug');

        // Log success
        console.log(`[${requestId}] Product status updated successfully:`, {
            productId: updatedProduct._id,
            productSku: updatedProduct.sku,
            newStatus: updatedProduct.isActive
        });

        return sendSuccessResponse(res, 200, 'Product status updated successfully', { 
            product: {
                _id: updatedProduct._id,
                sku: updatedProduct.sku,
                name: updatedProduct.name,
                isActive: updatedProduct.isActive
            }
        });
    } catch (error) {
        console.error(`[${requestId}] Error in updateProductStatus:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
    }
};

// PATCH /api/products/:sku/size-status - Cập nhật trạng thái của một size
export const updateSizeStatus = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request params and body
        console.log(`[${requestId}] Request params:`, JSON.stringify(req.params, null, 2));
        console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));

        const { sku } = req.params;
        const { error, value } = updateSizeStatusSchema.safeParse(req.body);
        if (error) {
            console.log(`[${requestId}] Validation error:`, error.errors);
            return sendErrorResponse(res, 400, 'Invalid size status data', error.errors, requestId);
        }

        const { size, isAvailable } = value;

        // Check if product exists
        console.log(`[${requestId}] Checking if product exists with SKU: ${sku}`);
        const product = await Product.findOne({ sku });
        if (!product) {
            console.log(`[${requestId}] Product not found with SKU: ${sku}`);
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }

        // Check if size exists in product
        console.log(`[${requestId}] Checking if size exists in product: ${size}`);
        const sizeIndex = product.sizes.findIndex(s => 
            (typeof s === 'string' && s === size) || 
            (typeof s === 'object' && s.size === size)
        );

        if (sizeIndex === -1) {
            console.log(`[${requestId}] Size not found in product: ${size}`);
            return sendErrorResponse(res, 404, 'Size not found in product', {}, requestId);
        }

        // Update size status
        console.log(`[${requestId}] Updating size status: ${size} to ${isAvailable}`);
        
        // Nếu sizes là mảng các chuỗi, chuyển đổi thành mảng các đối tượng
        if (typeof product.sizes[0] === 'string') {
            product.sizes = product.sizes.map(s => ({
                size: s,
                isAvailable: s === size ? isAvailable : true
            }));
        } else {
            // Nếu sizes đã là mảng các đối tượng, cập nhật trạng thái
            product.sizes[sizeIndex].isAvailable = isAvailable;
        }

        // Lưu sản phẩm
        console.log(`[${requestId}] Saving product with updated sizes`);
        const updatedProduct = await product.save();
        console.log(`[${requestId}] Product saved successfully:`, updatedProduct._id);

        // Log success
        logInfo(`[${requestId}] Size status updated successfully: ${size} to ${isAvailable}`);
        
        // Return success response
        return sendSuccessResponse(res, 200, 'Size status updated successfully', { 
            product: {
                _id: updatedProduct._id,
                sku: updatedProduct.sku,
                name: updatedProduct.name,
                sizes: updatedProduct.sizes
            }
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error in updateSizeStatus:`, error);
        logError(`[${requestId}] Error updating size status:`, error.message || error);
        return sendErrorResponse(res, 500, 'Error updating size status', error, requestId);
    }
};

// GET /api/products/admin - Lấy danh sách sản phẩm cho admin (bao gồm cả sản phẩm không active)
export const getAdminProducts = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request query
        console.log(`[${requestId}] Request query:`, JSON.stringify(req.query, null, 2));

        const { 
            page = 1, 
            limit = 10, 
            sortBy = 'createdAt', 
            sortOrder = 'desc',
            search,
            categoryId,
            brand,
            minPrice,
            maxPrice,
            isActive
        } = req.query;

        // Build query
        const query = {};

        // Chỉ thêm categoryId vào query nếu nó không rỗng
        if (categoryId && categoryId.trim() !== '') {
            // Sử dụng categoryId thay vì _id để tìm kiếm
            query.categoryId = categoryId;
        }

        // Thêm điều kiện tìm kiếm theo từ khóa
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } },  // Thêm tìm kiếm theo SKU
                { description: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
            console.log(`[${requestId}] Search query:`, search);
            console.log(`[${requestId}] Search regex:`, { $regex: search, $options: 'i' });
        }

        // Thêm điều kiện tìm kiếm theo thương hiệu
        if (brand) {
            query.brand = { $regex: brand, $options: 'i' };
        }

        // Thêm điều kiện tìm kiếm theo giá
        if (minPrice || maxPrice) {
            query.salePrice = {};
            if (minPrice) query.salePrice.$gte = Number(minPrice);
            if (maxPrice) query.salePrice.$lte = Number(maxPrice);
        }

        // Thêm điều kiện trạng thái hiển thị
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
            console.log(`[${requestId}] Active status filter:`, isActive);
        }

        console.log(`[${requestId}] Final query:`, JSON.stringify(query, null, 2));

        // Thực hiện query với populate và phân trang
        const result = await executeProductQuery(
            query,
            { 
                sortBy, 
                sortOrder,
                page: Number(page), 
                limit: Number(limit),
                requestId
            }
        );

        console.log(`[${requestId}] Query result:`, JSON.stringify({
            total: result.pagination.total,
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages
        }, null, 2));

        // Log success
        logInfo(`[${requestId}] Lấy danh sách sản phẩm thành công`);
        
        // Return success response
        return sendSuccessResponse(res, 200, 'Lấy danh sách sản phẩm thành công', {
            products: result.products,
            pagination: result.pagination
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error in getAdminProducts:`, error);
        logError(`[${requestId}] Lỗi khi lấy danh sách sản phẩm:`, error.message || error);
        return sendErrorResponse(res, 500, 'Lỗi khi lấy danh sách sản phẩm', error, requestId);
    }
};

// Trong product.controller.js
const searchProducts = async (req, res) => {
  try {
    const { search, page = 1, limit = 10 } = req.query;
    
    // Tạo query tìm kiếm
    let query = {};
    if (search) {
      // Tìm kiếm không phân biệt hoa thường và tìm kiếm một phần của SKU hoặc tên
      const searchRegex = new RegExp(search, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { sku: searchRegex },  // Thêm tìm kiếm theo SKU
          { description: searchRegex },
          { brand: searchRegex },
          { tags: searchRegex }
        ]
      };
    }

    // Thêm log để debug
    console.log('Search query:', search);
    console.log('MongoDB query:', JSON.stringify(query));

    // Thực hiện tìm kiếm với phân trang
    const products = await Product.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Đếm tổng số sản phẩm thỏa mãn điều kiện
    const total = await Product.countDocuments(query);

    console.log('Search results:', products);

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
    console.error('Error searching products:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi tìm kiếm sản phẩm'
    });
  }
};