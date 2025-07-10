import Product from '../models/Product.js';
import Category from "../models/Category.js";
import { logInfo, logError } from "../utils/logger.js";
import { generateUniqueSKU } from "../utils/productUtils.js";
import { updateProductSchema, searchProductSchema } from '../schemas/productSchema.js';
import { sendErrorResponse, sendSuccessResponse } from '../utils/responseUtils.js';
import { generateRequestId } from '../utils/requestUtils.js';
import slugify from 'slugify';
import { clearDashboardCacheUtil } from './dashboardController.js';

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
        const query = { isActive: true };
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

// GET /api/products/featured - Lấy danh sách sản phẩm nổi bật
export const getFeaturedProducts = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { limit = 6 } = req.query;
        
        console.log(`[${requestId}] Getting featured products with limit: ${limit}`);
        
        const products = await Product.findFeatured(parseInt(limit));
        
        console.log(`[${requestId}] Found ${products.length} featured products`);
        
        // Transform products to match frontend expected format
        const transformedProducts = products.map(product => ({
            id: product._id.toString(),
            name: product.name,
            price: product.salePrice || product.originalPrice,
            originalPrice: product.originalPrice,
            sold: product.featuredConfig?.soldCount || product.soldCount || 0,
            total: (product.featuredConfig?.remainingStock || product.stock) + (product.featuredConfig?.soldCount || product.soldCount || 0),
            rating: product.rating || 0,
            image: product.mainImage,
            sku: product.sku,
            brand: product.brand,
            category: product.categoryId?.name || 'Unknown Category',
            featuredConfig: product.featuredConfig || null
        }));

        logInfo(`[${requestId}] Successfully retrieved ${transformedProducts.length} featured products`);
        
        return sendSuccessResponse(res, 200, 'Featured products retrieved successfully', {
            products: transformedProducts,
            count: transformedProducts.length
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error in getFeaturedProducts:`, error);
        logError(`[${requestId}] Error getting featured products:`, error.message || error);
        return sendErrorResponse(res, 500, 'Error getting featured products', error, requestId);
    }
};

// GET /api/products/category/slug/:slug - Lấy danh sách sản phẩm theo slug category
export const getProductsByCategorySlug = async (req, res) => {
    const requestId = generateRequestId();
    try {
        const { slug } = req.params;
        // Tìm category theo slug
        const category = await Category.findOne({ slug, isActive: true });
        if (!category) {
            return sendErrorResponse(res, 404, 'Category not found', {}, requestId);
        }
        // Lấy các tham số filter/pagination nếu cần
        const {
            sort = 'createdAt',
            order = 'desc',
            page = 1,
            limit = 100
        } = req.query;
        // Build query
        const query = {
            categoryId: category.categoryId,
            isActive: true
        };
        const skip = (Number(page) - 1) * Number(limit);
        const sortOptions = { [sort]: order === 'desc' ? -1 : 1 };
        const [products, total] = await Promise.all([
            Product.find(query)
                .sort(sortOptions)
                .skip(skip)
                .limit(Number(limit))
                .lean(),
            Product.countDocuments(query)
        ]);
        return sendSuccessResponse(res, 200, 'Lấy danh sách sản phẩm theo slug thành công', {
            products,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total,
                totalPages: Math.ceil(total / Number(limit))
            }
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error in getProductsByCategorySlug:`, error);
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

        // Xử lý specifications nếu có
        if (processedBody.specifications) {
            console.log(`[${requestId}] Processing specifications:`, JSON.stringify(processedBody.specifications, null, 2));
            
            // Đảm bảo specifications là một object
            if (typeof processedBody.specifications === 'object' && processedBody.specifications !== null) {
                // Xử lý từng trường trong specifications
                const specifications = {};
                const specFields = ['material', 'weight', 'stretch', 'absorbency', 'warranty', 'origin', 'fabricTechnology', 'careInstructions'];
                
                for (const field of specFields) {
                    if (processedBody.specifications[field] !== undefined && processedBody.specifications[field] !== null) {
                        // Trim và kiểm tra không rỗng
                        const value = String(processedBody.specifications[field]).trim();
                        if (value !== '') {
                            specifications[field] = value;
                        }
                    }
                }
                
                // Chỉ thêm specifications nếu có ít nhất một trường
                if (Object.keys(specifications).length > 0) {
                    processedBody.specifications = specifications;
                    console.log(`[${requestId}] Processed specifications:`, JSON.stringify(specifications, null, 2));
                } else {
                    // Nếu không có trường nào hợp lệ, xóa specifications
                    delete processedBody.specifications;
                    console.log(`[${requestId}] No valid specifications found, removing from request`);
                }
            } else {
                // Nếu specifications không phải object hợp lệ, xóa nó
                delete processedBody.specifications;
                console.log(`[${requestId}] Invalid specifications format, removing from request`);
            }
        }

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

        // Xóa cache dashboard
        await clearDashboardCacheUtil();

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
                specifications: savedProduct.specifications,
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

        // Xử lý cập nhật specifications nếu có
        if (updateData.specifications) {
            console.log(`[${requestId}] Processing specifications update:`, JSON.stringify(updateData.specifications, null, 2));
            
            // Đảm bảo specifications là một object
            if (typeof updateData.specifications === 'object' && updateData.specifications !== null) {
                // Xử lý từng trường trong specifications
                const specifications = {};
                const specFields = ['material', 'weight', 'stretch', 'absorbency', 'warranty', 'origin', 'fabricTechnology', 'careInstructions'];
                
                for (const field of specFields) {
                    if (updateData.specifications[field] !== undefined && updateData.specifications[field] !== null) {
                        // Trim và kiểm tra không rỗng
                        const value = String(updateData.specifications[field]).trim();
                        if (value !== '') {
                            specifications[field] = value;
                        }
                    }
                }
                
                // Chỉ thêm specifications nếu có ít nhất một trường
                if (Object.keys(specifications).length > 0) {
                    updateData.specifications = specifications;
                    console.log(`[${requestId}] Processed specifications update:`, JSON.stringify(specifications, null, 2));
                } else {
                    // Nếu không có trường nào hợp lệ, xóa specifications
                    delete updateData.specifications;
                    console.log(`[${requestId}] No valid specifications found, removing from update`);
                }
            } else {
                // Nếu specifications không phải object hợp lệ, xóa nó
                delete updateData.specifications;
                console.log(`[${requestId}] Invalid specifications format, removing from update`);
            }
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
            
            // Xóa cache dashboard
            await clearDashboardCacheUtil();
            
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
                    specifications: updatedProduct.specifications,
                    isActive: updatedProduct.isActive,
                    updatedAt: updatedProduct.updatedAt
                }
            }, requestId);
        } catch (error) {
            console.error(`[${requestId}] Error in updateProduct:`, error);
            return sendErrorResponse(res, 500, 'Error updating product', error, requestId);
        }
    } catch (error) {
        console.error(`[${requestId}] Error in updateProduct:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
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

        // Xóa cache dashboard
        await clearDashboardCacheUtil();

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
            console.log(`[${requestId}] Invalid request body: isActive must be a boolean`);
            return sendErrorResponse(res, 400, 'Invalid request body: isActive must be a boolean', {}, requestId);
        }

        // Check if product exists
        console.log(`[${requestId}] Checking if product exists with SKU: ${sku}`);
        const product = await Product.findOne({ sku });
        if (!product) {
            console.log(`[${requestId}] Product not found with SKU: ${sku}`);
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }

        // Update product status
        console.log(`[${requestId}] Updating product status`);
        const updatedProduct = await Product.findOneAndUpdate(
            { sku },
            { $set: { isActive: req.body.isActive } },
            { new: true }
        );

        console.log(`[${requestId}] Product updated successfully:`, updatedProduct._id);
        
        // Xóa cache dashboard
        await clearDashboardCacheUtil();
        
        // Log success
        logInfo(`[${requestId}] Product status updated successfully: ${updatedProduct?.name || 'Unknown'}`);
        
        // Return success response
        return sendSuccessResponse(res, 200, 'Product status updated successfully', { 
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
        console.error(`[${requestId}] Error in updateProductStatus:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
    }
};

// PATCH /api/products/:sku/featured - Đổi trạng thái nổi bật (featured/not featured)
export const updateProductFeaturedStatus = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request params and body
        console.log(`[${requestId}] Request params:`, JSON.stringify(req.params, null, 2));
        console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));

        const { sku } = req.params;
        
        // Kiểm tra dữ liệu đầu vào
        if (!req.body || typeof req.body.isFeatured !== 'boolean') {
            console.log(`[${requestId}] Invalid request body: isFeatured must be a boolean`);
            return sendErrorResponse(res, 400, 'Invalid request body: isFeatured must be a boolean', {}, requestId);
        }

        // Check if product exists
        console.log(`[${requestId}] Checking if product exists with SKU: ${sku}`);
        const product = await Product.findOne({ sku });
        if (!product) {
            console.log(`[${requestId}] Product not found with SKU: ${sku}`);
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }

        // Update product featured status
        console.log(`[${requestId}] Updating product featured status`);
        const updatedProduct = await Product.findOneAndUpdate(
            { sku },
            { $set: { isFeatured: req.body.isFeatured } },
            { new: true }
        );

        console.log(`[${requestId}] Product featured status updated successfully:`, updatedProduct._id);
        
        // Xóa cache dashboard
        await clearDashboardCacheUtil();
        
        // Log success
        logInfo(`[${requestId}] Product featured status updated successfully: ${updatedProduct?.name || 'Unknown'}`);
        
        // Return success response
        return sendSuccessResponse(res, 200, 'Product featured status updated successfully', { 
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
                isFeatured: updatedProduct.isFeatured,
                updatedAt: updatedProduct.updatedAt
            }
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error in updateProductFeaturedStatus:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
    }
};

// PATCH /api/products/:sku/featured-config - Setup countdown và thông tin bán hàng cho sản phẩm nổi bật
export const updateProductFeaturedConfig = async (req, res) => {
    const requestId = generateRequestId();
    try {
        // Debug: Log request params and body
        console.log(`[${requestId}] Request params:`, JSON.stringify(req.params, null, 2));
        console.log(`[${requestId}] Request body:`, JSON.stringify(req.body, null, 2));

        const { sku } = req.params;
        const { countdownEndDate, soldCount, remainingStock, isActive } = req.body;
        
        // Validate required fields
        if (!countdownEndDate) {
            return sendErrorResponse(res, 400, 'Thời gian kết thúc là bắt buộc', {}, requestId);
        }
        
        if (typeof soldCount !== 'number' || soldCount < 0) {
            return sendErrorResponse(res, 400, 'Số lượng đã bán không hợp lệ', {}, requestId);
        }
        
        if (typeof remainingStock !== 'number' || remainingStock < 0) {
            return sendErrorResponse(res, 400, 'Số lượng còn lại không hợp lệ', {}, requestId);
        }
        
        if (typeof isActive !== 'boolean') {
            return sendErrorResponse(res, 400, 'Trạng thái hiển thị không hợp lệ', {}, requestId);
        }

        // Check if product exists and is featured
        console.log(`[${requestId}] Checking if product exists with SKU: ${sku}`);
        const product = await Product.findOne({ sku });
        if (!product) {
            console.log(`[${requestId}] Product not found with SKU: ${sku}`);
            return sendErrorResponse(res, 404, 'Product not found', {}, requestId);
        }
        
        if (!product.isFeatured) {
            console.log(`[${requestId}] Product is not featured: ${sku}`);
            return sendErrorResponse(res, 400, 'Product must be featured to setup countdown', {}, requestId);
        }

        // Update product featured config
        console.log(`[${requestId}] Updating product featured config`);
        const updatedProduct = await Product.findOneAndUpdate(
            { sku },
            { 
                $set: { 
                    featuredConfig: {
                        countdownEndDate: new Date(countdownEndDate),
                        soldCount,
                        remainingStock,
                        isActive
                    }
                } 
            },
            { new: true }
        );

        console.log(`[${requestId}] Product featured config updated successfully:`, updatedProduct._id);
        
        // Xóa cache dashboard
        await clearDashboardCacheUtil();
        
        // Log success
        logInfo(`[${requestId}] Product featured config updated successfully: ${updatedProduct?.name || 'Unknown'}`);
        
        // Return success response
        return sendSuccessResponse(res, 200, 'Featured product config updated successfully', { 
            product: {
                _id: updatedProduct._id,
                sku: updatedProduct.sku,
                name: updatedProduct.name,
                featuredConfig: updatedProduct.featuredConfig
            }
        }, requestId);
    } catch (error) {
        console.error(`[${requestId}] Error in updateProductFeaturedConfig:`, error);
        return sendErrorResponse(res, 500, 'Internal server error', {}, requestId);
    }
};