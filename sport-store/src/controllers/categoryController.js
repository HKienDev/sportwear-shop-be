import Category from "../models/category.js";
import Product from "../models/product.js"; // Import model sản phẩm

// Lấy tất cả danh mục (cập nhật productCount thực tế)
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    // Tạo danh sách category mới có productCount chính xác
    const updatedCategories = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.countDocuments({ category: category._id });
        return { ...category.toObject(), productCount };
      })
    );

    res.status(200).json(updatedCategories);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh mục" });
  }
};

// Lấy chi tiết một danh mục (cập nhật số lượng sản phẩm thực tế)
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Danh mục không tồn tại" });

    // Đếm số lượng sản phẩm thực tế thuộc danh mục
    const productCount = await Product.countDocuments({ category: category._id });

    res.status(200).json({ ...category.toObject(), productCount }); // Cập nhật productCount
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh mục" });
  }
};

// Tạo danh mục mới
export const createCategory = async (req, res) => {
  try {
    const { name, description, parentCategory, image } = req.body;

    if (!name) return res.status(400).json({ error: "Tên danh mục là bắt buộc" });

    const newCategory = new Category({ name, description, parentCategory, image, productCount: 0 });
    await newCategory.save();
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi tạo danh mục" });
  }
};

// Cập nhật danh mục
export const updateCategory = async (req, res) => {
  try {
    const { name, description, parentCategory, image } = req.body;
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description, parentCategory, image },
      { new: true }
    );
    if (!category) return res.status(404).json({ error: "Danh mục không tồn tại" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi cập nhật danh mục" });
  }
};

// Xóa danh mục
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: "Danh mục không tồn tại" });

    // Xóa tất cả sản phẩm thuộc danh mục này (nếu cần)
    await Product.deleteMany({ category: category._id });

    res.status(200).json({ message: "Xóa danh mục thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xóa danh mục" });
  }
};