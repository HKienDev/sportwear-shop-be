import Product from "../models/product.js";
import { verifyUser, verifyAdmin } from "../middlewares/authMiddleware.js";

// 📌 Lấy danh sách sản phẩm (có phân trang, chỉ hiển thị sản phẩm đang bật)
export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const products = await Product.find({ isActive: true }) // Chỉ lấy sản phẩm đang bật
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Lấy chi tiết sản phẩm theo ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Thêm sản phẩm mới (Admin)
export const createProduct = async (req, res) => {
  try {
    console.log("Headers:", req.headers);
    console.log("Data nhận được từ request body:", req.body);

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

    // Kiểm tra thông tin bắt buộc
    if (!name || !description || !brand || !price || !stock || !category || !images?.main || !sku) {
      return res.status(400).json({ message: "Vui lòng nhập đầy đủ thông tin sản phẩm" });
    }

    // Kiểm tra SKU có bị trùng không
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({ message: "SKU đã tồn tại, vui lòng chọn SKU khác" });
    }

    const newProduct = new Product({
      name,
      description,
      brand,
      price,
      discountPrice: discountPrice || price, // Nếu không có discountPrice, dùng giá gốc
      stock,
      category,
      isActive: isActive ?? true, // Mặc định sản phẩm sẽ được bật
      images: {
        main: images.main,
        sub: images.sub || [],
      },
      color: color || [],
      size: size || [],
      sku,
      tags: tags || [],
      ratings: { average: 0, count: 0 }, // Mặc định đánh giá = 0
    });

    await newProduct.save();

    res.status(201).json({ message: "Tạo sản phẩm thành công", product: newProduct });
  } catch (error) {
    console.error("Lỗi khi tạo sản phẩm:", error);
    res.status(500).json({ message: error.message });
  }
};

// 📌 Cập nhật sản phẩm (Admin)
export const updateProduct = async (req, res) => {
  try {
    const { sku } = req.body;

    // Kiểm tra nếu SKU bị trùng (trừ chính sản phẩm đang cập nhật)
    if (sku) {
      const existingProduct = await Product.findOne({ sku, _id: { $ne: req.params.id } });
      if (existingProduct) {
        return res.status(400).json({ message: "SKU đã tồn tại, vui lòng chọn SKU khác" });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 📌 Xóa sản phẩm (Admin)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Không tìm thấy sản phẩm" });
    res.status(200).json({ message: "Sản phẩm đã được xóa thành công" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};