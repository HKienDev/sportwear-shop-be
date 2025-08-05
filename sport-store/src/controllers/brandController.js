import Brand from '../models/Brand.js';
import cloudinary from '../config/cloudinary.js';
import { sendSuccessResponse, sendErrorResponse, sendValidationErrorResponse } from '../utils/responseUtils.js';
import { logger } from '../utils/logger.js';

// Admin Controllers
const adminBrandController = {
  // Get all brands with filters and pagination
  async getBrands(req, res) {
    try {
      const {
        search,
        status,
        featured,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        page = 1,
        limit = 10
      } = req.query;

      // Build filter object
      const filter = {};
      
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (status) filter.status = status;
      if (featured !== undefined) filter.featured = featured === 'true';

      // Build sort object
      const sort = {};
      sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

      // Calculate skip
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Execute query
      const [brands, total] = await Promise.all([
        Brand.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit))
          .lean(),
        Brand.countDocuments(filter)
      ]);

      const totalPages = Math.ceil(total / parseInt(limit));

      return sendSuccessResponse(res, 200, 'Lấy danh sách thương hiệu thành công', {
        brands,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages
        }
      });

    } catch (error) {
      logger.error('Error in getBrands:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy danh sách thương hiệu');
    }
  },

  // Get single brand
  async getBrand(req, res) {
    try {
      const { id } = req.params;
      
      const brand = await Brand.findById(id).lean();
      
      if (!brand) {
        return sendErrorResponse(res, 404, 'Không tìm thấy thương hiệu');
      }

      return sendSuccessResponse(res, 200, 'Lấy thông tin thương hiệu thành công', { brand });

    } catch (error) {
      logger.error('Error in getBrand:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy thông tin thương hiệu');
    }
  },

  // Create new brand
  async createBrand(req, res) {
    try {
      const brandData = req.body;

      // Check if brand name already exists
      const existingBrand = await Brand.findOne({ name: brandData.name });
      if (existingBrand) {
        return sendErrorResponse(res, 400, 'Tên thương hiệu đã tồn tại');
      }

      const brand = new Brand(brandData);
      await brand.save();

      return sendSuccessResponse(res, 201, 'Tạo thương hiệu thành công', { brand });

    } catch (error) {
      logger.error('Error in createBrand:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return sendValidationErrorResponse(res, errors);
      }
      return sendErrorResponse(res, 500, 'Lỗi server khi tạo thương hiệu');
    }
  },

  // Update brand
  async updateBrand(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const brand = await Brand.findById(id);
      if (!brand) {
        return sendErrorResponse(res, 404, 'Không tìm thấy thương hiệu');
      }

      // Check if name is being updated and if it already exists
      if (updateData.name && updateData.name !== brand.name) {
        const existingBrand = await Brand.findOne({ name: updateData.name, _id: { $ne: id } });
        if (existingBrand) {
          return sendErrorResponse(res, 400, 'Tên thương hiệu đã tồn tại');
        }
      }

      Object.assign(brand, updateData);
      await brand.save();

      return sendSuccessResponse(res, 200, 'Cập nhật thương hiệu thành công', { brand });

    } catch (error) {
      logger.error('Error in updateBrand:', error);
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return sendValidationErrorResponse(res, errors);
      }
      return sendErrorResponse(res, 500, 'Lỗi server khi cập nhật thương hiệu');
    }
  },

  // Delete brand
  async deleteBrand(req, res) {
    try {
      const { id } = req.params;

      const brand = await Brand.findByIdAndDelete(id);
      if (!brand) {
        return sendErrorResponse(res, 404, 'Không tìm thấy thương hiệu');
      }

      return sendSuccessResponse(res, 200, 'Xóa thương hiệu thành công');

    } catch (error) {
      logger.error('Error in deleteBrand:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi xóa thương hiệu');
    }
  },

  // Bulk delete brands
  async deleteMultipleBrands(req, res) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return sendErrorResponse(res, 400, 'Danh sách ID không hợp lệ');
      }

      const result = await Brand.deleteMany({ _id: { $in: ids } });

      return sendSuccessResponse(res, 200, `Xóa ${result.deletedCount} thương hiệu thành công`, {
        deletedCount: result.deletedCount
      });

    } catch (error) {
      logger.error('Error in deleteMultipleBrands:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi xóa thương hiệu');
    }
  },

  // Toggle brand status
  async toggleBrandStatus(req, res) {
    try {
      const { id } = req.params;

      const brand = await Brand.findById(id);
      if (!brand) {
        return sendErrorResponse(res, 404, 'Không tìm thấy thương hiệu');
      }

      await brand.toggleStatus();

      return sendSuccessResponse(res, 200, 'Cập nhật trạng thái thương hiệu thành công', { brand });

    } catch (error) {
      logger.error('Error in toggleBrandStatus:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi cập nhật trạng thái thương hiệu');
    }
  },

  // Upload brand logo
  async uploadBrandLogo(req, res) {
    try {
      if (!req.file) {
        return sendErrorResponse(res, 400, 'Vui lòng chọn file logo');
      }

      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'brands',
        resource_type: 'auto'
      });

      return sendSuccessResponse(res, 200, 'Upload logo thành công', {
        url: result.secure_url
      });

    } catch (error) {
      logger.error('Error in uploadBrandLogo:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi upload logo');
    }
  },

  // Get brand stats
  async getBrandStats(req, res) {
    try {
      const stats = await Brand.getStats();

      return sendSuccessResponse(res, 200, 'Lấy thống kê thương hiệu thành công', stats);

    } catch (error) {
      logger.error('Error in getBrandStats:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy thống kê thương hiệu');
    }
  },


};

// User Controllers
const userBrandController = {
  // Get all active brands
  async getBrands(req, res) {
    try {
      const brands = await Brand.find({ status: 'active' })
        .sort({ featured: -1, createdAt: -1 })
        .lean();

      return sendSuccessResponse(res, 200, 'Lấy danh sách thương hiệu thành công', { brands });

    } catch (error) {
      logger.error('Error in user getBrands:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy danh sách thương hiệu');
    }
  },

  // Get single brand
  async getBrand(req, res) {
    try {
      const { id } = req.params;
      
      const brand = await Brand.findOne({ _id: id, status: 'active' }).lean();
      
      if (!brand) {
        return sendErrorResponse(res, 404, 'Không tìm thấy thương hiệu');
      }

      return sendSuccessResponse(res, 200, 'Lấy thông tin thương hiệu thành công', { brand });

    } catch (error) {
      logger.error('Error in user getBrand:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy thông tin thương hiệu');
    }
  },



  // Get featured brands
  async getFeaturedBrands(req, res) {
    try {
      const brands = await Brand.find({ 
        featured: true, 
        status: 'active' 
      })
        .sort({ createdAt: -1 })
        .lean();

      return sendSuccessResponse(res, 200, 'Lấy thương hiệu nổi bật thành công', { brands });

    } catch (error) {
      logger.error('Error in getFeaturedBrands:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy thương hiệu nổi bật');
    }
  },

  // Get trending brands
  async getTrendingBrands(req, res) {
    try {
      const brands = await Brand.find({ 
        isTrending: true, 
        status: 'active' 
      })
        .sort({ createdAt: -1 })
        .lean();

      return sendSuccessResponse(res, 200, 'Lấy thương hiệu trending thành công', { brands });

    } catch (error) {
      logger.error('Error in getTrendingBrands:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy thương hiệu trending');
    }
  },

  // Get premium brands
  async getPremiumBrands(req, res) {
    try {
      const brands = await Brand.find({ 
        isPremium: true, 
        status: 'active' 
      })
        .sort({ createdAt: -1 })
        .lean();

      return sendSuccessResponse(res, 200, 'Lấy thương hiệu premium thành công', { brands });

    } catch (error) {
      logger.error('Error in getPremiumBrands:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy thương hiệu premium');
    }
  },

  // Search brands
  async searchBrands(req, res) {
    try {
      const { q } = req.query;

      if (!q) {
        return sendErrorResponse(res, 400, 'Từ khóa tìm kiếm là bắt buộc');
      }

      const brands = await Brand.find({
        $and: [
          { status: 'active' },
          {
            $or: [
              { name: { $regex: q, $options: 'i' } },
              { description: { $regex: q, $options: 'i' } },
              { category: { $regex: q, $options: 'i' } }
            ]
          }
        ]
      })
        .sort({ featured: -1, createdAt: -1 })
        .lean();

      return sendSuccessResponse(res, 200, 'Tìm kiếm thương hiệu thành công', { brands });

    } catch (error) {
      logger.error('Error in searchBrands:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi tìm kiếm thương hiệu');
    }
  },

  // Get brand stats for user
  async getBrandStats(req, res) {
    try {
      const stats = await Brand.aggregate([
        { $match: { status: 'active' } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            totalProducts: { $sum: '$productsCount' },
            totalFollowers: { $sum: '$followers' }
          }
        }
      ]);

      const result = stats[0] || { total: 0, totalProducts: 0, totalFollowers: 0 };

      return sendSuccessResponse(res, 200, 'Lấy thống kê thương hiệu thành công', result);

    } catch (error) {
      logger.error('Error in user getBrandStats:', error);
      return sendErrorResponse(res, 500, 'Lỗi server khi lấy thống kê thương hiệu');
    }
  }
};

export {
  adminBrandController,
  userBrandController
}; 