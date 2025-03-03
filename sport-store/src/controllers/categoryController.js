const Category = require("../models/category");

// Lấy tất cả categories
const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh mục" });
  }
};

// Lấy chi tiết 1 category
const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ error: "Danh mục không tồn tại" });
    res.status(200).json(category);
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi lấy danh mục" });
  }
};

// Tạo category mới
const createCategory = async (req, res) => {
    try {
      const { name, description, parentCategory, image } = req.body;
  
      if (!name) return res.status(400).json({ error: "Tên danh mục là bắt buộc" });
  
      const newCategory = new Category({ name, description, parentCategory, image });
      await newCategory.save();
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(500).json({ error: "Lỗi khi tạo danh mục" });
    }
  };

// Cập nhật category
const updateCategory = async (req, res) => {
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

// Xóa category
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ error: "Danh mục không tồn tại" });
    res.status(200).json({ message: "Xóa danh mục thành công" });
  } catch (error) {
    res.status(500).json({ error: "Lỗi khi xóa danh mục" });
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};