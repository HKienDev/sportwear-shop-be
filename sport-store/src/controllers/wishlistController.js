import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { sendResponse } from '../utils/responseUtils.js';
import { logError, logInfo } from '../utils/logger.js';

// Lấy danh sách wishlist của user
export const getWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const wishlistItems = await Wishlist.find({ userId })
      .populate({
        path: 'productId',
        select: 'name sku mainImage originalPrice salePrice rating numReviews stock soldCount viewCount brand categoryId colors sizes description'
      })
      .sort({ addedAt: -1 });

    // Transform data để match với frontend
    const favorites = wishlistItems.map(item => ({
      _id: item._id,
      product: item.productId,
      addedAt: item.addedAt
    }));

    logInfo(`User ${userId} fetched wishlist with ${favorites.length} items`);
    
    sendResponse(res, 200, {
      success: true,
      message: 'Lấy danh sách yêu thích thành công',
      data: {
        favorites,
        total: favorites.length
      }
    });
  } catch (error) {
    logError('Error getting wishlist:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Không thể lấy danh sách yêu thích'
    });
  }
};

// Thêm sản phẩm vào wishlist
export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return sendResponse(res, 400, {
        success: false,
        message: 'ProductId là bắt buộc'
      });
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return sendResponse(res, 404, {
        success: false,
        message: 'Sản phẩm không tồn tại'
      });
    }

    // Kiểm tra đã có trong wishlist chưa
    const existingItem = await Wishlist.findOne({ userId, productId });
    if (existingItem) {
      return sendResponse(res, 400, {
        success: false,
        message: 'Sản phẩm đã có trong danh sách yêu thích'
      });
    }

    // Thêm vào wishlist
    const wishlistItem = new Wishlist({
      userId,
      productId
    });

    await wishlistItem.save();

    logInfo(`User ${userId} added product ${productId} to wishlist`);
    
    sendResponse(res, 201, {
      success: true,
      message: 'Đã thêm sản phẩm vào danh sách yêu thích',
      data: {
        wishlistItem: {
          _id: wishlistItem._id,
          productId: wishlistItem.productId,
          addedAt: wishlistItem.addedAt
        }
      }
    });
  } catch (error) {
    logError('Error adding to wishlist:', error);
    
    // Xử lý lỗi duplicate key
    if (error.code === 11000) {
      return sendResponse(res, 400, {
        success: false,
        message: 'Sản phẩm đã có trong danh sách yêu thích'
      });
    }

    sendResponse(res, 500, {
      success: false,
      message: 'Không thể thêm sản phẩm vào danh sách yêu thích'
    });
  }
};

// Xóa sản phẩm khỏi wishlist
export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.body;

    if (!productId) {
      return sendResponse(res, 400, {
        success: false,
        message: 'ProductId là bắt buộc'
      });
    }

    // Tìm và xóa item
    const wishlistItem = await Wishlist.findOneAndDelete({ userId, productId });
    
    if (!wishlistItem) {
      return sendResponse(res, 404, {
        success: false,
        message: 'Sản phẩm không có trong danh sách yêu thích'
      });
    }

    logInfo(`User ${userId} removed product ${productId} from wishlist`);
    
    sendResponse(res, 200, {
      success: true,
      message: 'Đã xóa sản phẩm khỏi danh sách yêu thích',
      data: {
        removedItem: {
          _id: wishlistItem._id,
          productId: wishlistItem.productId
        }
      }
    });
  } catch (error) {
    logError('Error removing from wishlist:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Không thể xóa sản phẩm khỏi danh sách yêu thích'
    });
  }
};

// Xóa toàn bộ wishlist
export const clearWishlist = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const result = await Wishlist.deleteMany({ userId });
    
    logInfo(`User ${userId} cleared wishlist, removed ${result.deletedCount} items`);
    
    sendResponse(res, 200, {
      success: true,
      message: 'Đã xóa toàn bộ danh sách yêu thích',
      data: {
        deletedCount: result.deletedCount
      }
    });
  } catch (error) {
    logError('Error clearing wishlist:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Không thể xóa danh sách yêu thích'
    });
  }
};

// Kiểm tra sản phẩm có trong wishlist không
export const checkWishlistStatus = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId } = req.params;

    if (!productId) {
      return sendResponse(res, 400, {
        success: false,
        message: 'ProductId là bắt buộc'
      });
    }

    const wishlistItem = await Wishlist.findOne({ userId, productId });
    
    sendResponse(res, 200, {
      success: true,
      message: 'Kiểm tra trạng thái thành công',
      data: {
        isInWishlist: !!wishlistItem
      }
    });
  } catch (error) {
    logError('Error checking wishlist status:', error);
    sendResponse(res, 500, {
      success: false,
      message: 'Không thể kiểm tra trạng thái'
    });
  }
};
