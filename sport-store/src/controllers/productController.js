import Product from "../models/product.js";
import Category from "../models/category.js"; // Import model danh mục

// Lấy danh sách sản phẩm (có phân trang, chỉ hiển thị sản phẩm đang bật)
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.status(200).json({
      success: true,
      products
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Lấy chi tiết sản phẩm theo ID
import mongoose from "mongoose";

export const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    // Kiểm tra định dạng ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(404).json({ 
        success: false,
        message: "Sản phẩm không tồn tại!" 
      });
    }

    const product = await Product.findById(productId)
      .populate('category', 'name');

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Sản phẩm không tồn tại!" 
      });
    }

    res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Lỗi server: " + error.message 
    });
  }
};

// Thêm sản phẩm mới (Admin)
export const createProduct = async (req, res) => {
  try {
    console.log('🔍 Headers:', req.headers);
    console.log('🔍 Content-Type:', req.headers['content-type']);
    console.log('🔍 Raw body:', req.rawBody);

    const {
      name,
      description,
      brand,
      price,
      discountPrice,
      stock,
      category,
      isActive,
      images,
      color,
      size,
      sku,
      tags,
    } = req.body;

    // Log chi tiết request body
    console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 Chi tiết các trường:');
    console.log('- name:', name, typeof name);
    console.log('- description:', description, typeof description);
    console.log('- brand:', brand, typeof brand);
    console.log('- price:', price, typeof price);
    console.log('- stock:', stock, typeof stock);
    console.log('- category:', category, typeof category);
    console.log('- images:', images);
    console.log('- sku:', sku, typeof sku);

    // Kiểm tra thông tin bắt buộc
    if (!name || !description || !brand || !price || !stock || !category || !images?.main || !sku) {
      const missingFields = {
        name: !name,
        description: !description,
        brand: !brand,
        price: !price,
        stock: !stock,
        category: !category,
        'images.main': !images?.main,
        sku: !sku
      };

      console.log('❌ Thiếu các trường:', Object.keys(missingFields).filter(key => missingFields[key]));
      
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: "Vui lòng nhập đầy đủ thông tin sản phẩm",
        details: {
          name: !name ? 'Tên sản phẩm là bắt buộc' : null,
          description: !description ? 'Mô tả sản phẩm là bắt buộc' : null,
          brand: !brand ? 'Thương hiệu là bắt buộc' : null,
          price: !price ? 'Giá là bắt buộc' : null,
          stock: !stock ? 'Số lượng tồn kho là bắt buộc' : null,
          category: !category ? 'Danh mục là bắt buộc' : null,
          images: !images?.main ? 'Ảnh chính là bắt buộc' : null,
          sku: !sku ? 'SKU là bắt buộc' : null
        }
      });
    }

    // Kiểm tra SKU có bị trùng không
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      console.log('❌ Duplicate SKU:', sku);
      return res.status(400).json({ 
        success: false,
        error: 'Bad Request',
        message: "SKU đã tồn tại, vui lòng chọn SKU khác"
      });
    }

    // Tạo sản phẩm mới
    const newProduct = new Product({
      name,
      description,
      brand,
      price,
      discountPrice: discountPrice || price,
      stock,
      category,
      isActive: isActive ?? true,
      images: {
        main: images.main,
        sub: images.sub || [],
      },
      color: color || [],
      size: size || [],
      sku,
      tags: tags || [],
      ratings: { average: 0, count: 0 },
    });

    console.log('🔹 Creating new product:', newProduct);

    await newProduct.save();

    // Cập nhật productCount trong danh mục
    await Category.findByIdAndUpdate(category, { $inc: { productCount: 1 } });

    // Populate category trước khi trả về
    const populatedProduct = await Product.findById(newProduct._id)
      .populate('category', 'name');

    console.log('✅ Product created successfully');
    res.status(201).json({ 
      success: true,
      message: "Tạo sản phẩm thành công", 
      product: populatedProduct 
    });
  } catch (error) {
    console.error('❌ Error creating product:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal Server Error',
      message: "Lỗi khi tạo sản phẩm",
      details: error.message 
    });
  }
};

// Cập nhật sản phẩm (Admin)
export const updateProduct = async (req, res) => {
  try {
    const { sku } = req.body;

    // Kiểm tra nếu SKU bị trùng (trừ chính sản phẩm đang cập nhật)
    if (sku) {
      const existingProduct = await Product.findOne({ sku, _id: { $ne: req.params.id } });
      if (existingProduct) {
        return res.status(400).json({ 
          success: false,
          message: "SKU đã tồn tại, vui lòng chọn SKU khác" 
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('category', 'name');

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy sản phẩm" 
      });
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật sản phẩm thành công",
      product
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Xóa sản phẩm (Admin)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Không tìm thấy sản phẩm" 
      });
    }

    // Giảm productCount trong danh mục
    await Category.findByIdAndUpdate(product.category, { $inc: { productCount: -1 } });

    res.status(200).json({ 
      success: true,
      message: "Sản phẩm đã được xóa thành công" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// Cập nhật trạng thái sản phẩm (Admin)
export const toggleProductStatus = async (req, res) => {
  try {
    const productId = req.params.id;

    // Kiểm tra định dạng ObjectId
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(404).json({ 
        success: false,
        message: "Sản phẩm không tồn tại!" 
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Sản phẩm không tồn tại!" 
      });
    }

    // Đảo ngược trạng thái isActive
    product.isActive = !product.isActive;
    await product.save();

    res.status(200).json({
      success: true,
      message: product.isActive ? "Sản phẩm đã được kích hoạt" : "Sản phẩm đã được ngừng bán",
      product
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Lỗi server: " + error.message 
    });
  }
};