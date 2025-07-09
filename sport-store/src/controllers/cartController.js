import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseUtils.js';
import { handleError } from '../utils/errorHandler.js';
import mongoose from 'mongoose';

// Lấy giỏ hàng của user
export const getCart = async (req, res) => {
  try {
    const userId = req.user?._id || null;

    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Debug logs
    console.log('Backend getCart - Raw cart:', cart);
    console.log('Backend getCart - Cart items:', cart.items);
    console.log('Backend getCart - Items type:', typeof cart.items);
    console.log('Backend getCart - Items is array:', Array.isArray(cart.items));
    console.log('Backend getCart - Items length:', cart.items?.length || 0);

    // Debug từng item
    if (cart.items && cart.items.length > 0) {
      cart.items.forEach((item, index) => {
        console.log(`Backend getCart - Item ${index}:`, {
          _id: item._id,
          quantity: item.quantity,
          quantityType: typeof item.quantity,
          color: item.color,
          size: item.size,
          product: item.product
        });
      });
    }

    // Sử dụng toObject() với options để đảm bảo dữ liệu đúng format
    const cartWithIds = cart.toObject({
      transform: (doc, ret) => {
        console.log('Backend getCart - Transform function called with:', ret);
        // Đảm bảo mỗi item có _id
        if (ret.items && Array.isArray(ret.items)) {
          ret.items = ret.items.map(item => {
            console.log('Backend getCart - Transforming item:', item);
            return {
              ...item,
              _id: item._id || new mongoose.Types.ObjectId()
            };
          });
        }
        console.log('Backend getCart - Transformed result:', ret);
        return ret;
      }
    });

    console.log('Backend getCart - Cart with IDs:', cartWithIds);
    console.log('Backend getCart - Items with IDs:', cartWithIds.items);
    console.log('Backend getCart - Items with IDs type:', typeof cartWithIds.items);
    console.log('Backend getCart - Items with IDs is array:', Array.isArray(cartWithIds.items));

    // Debug từng item sau khi map
    if (cartWithIds.items && cartWithIds.items.length > 0) {
      cartWithIds.items.forEach((item, index) => {
        console.log(`Backend getCart - Mapped Item ${index}:`, {
          _id: item._id,
          quantity: item.quantity,
          quantityType: typeof item.quantity,
          color: item.color,
          size: item.size,
          product: item.product
        });
      });
    }

    return sendSuccessResponse(res, 200, "Lấy giỏ hàng thành công", cartWithIds);
  } catch (error) {
    const errorResponse = handleError(error, req.requestId);
    return sendErrorResponse(res, errorResponse.statusCode, errorResponse.message, error, req.requestId);
  }
};

// Thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
  try {
    let { sku, color, size, quantity = 1 } = req.body;
    const userId = req.user?._id || null;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findOne({ sku });
    if (!product) {
      return sendErrorResponse(res, 404, "Không tìm thấy sản phẩm", null, req.requestId);
    }

    // Kiểm tra màu sắc hợp lệ (nếu sản phẩm có colors)
    if (product.colors && product.colors.length > 0) {
      // Nếu frontend không gửi color, lấy color đầu tiên
      if (!color) {
        color = product.colors[0];
      } else if (!product.colors.includes(color)) {
        return sendErrorResponse(res, 400, "Màu sắc không hợp lệ", null, req.requestId);
      }
    } else {
      // Nếu sản phẩm không có colors, sử dụng màu mặc định
      color = "Mặc Định";
    }

    // Kiểm tra kích thước hợp lệ (nếu sản phẩm có sizes)
    if (product.sizes && product.sizes.length > 0) {
      // Nếu frontend không gửi size, lấy size đầu tiên
      if (!size) {
        size = product.sizes[0];
      } else if (!product.sizes.includes(size)) {
        return sendErrorResponse(res, 400, "Kích thước không hợp lệ", null, req.requestId);
      }
    } else {
      // Nếu sản phẩm không có sizes, sử dụng size mặc định
      size = "Mặc Định";
    }

    // Kiểm tra số lượng tồn kho
    if (quantity > product.stock) {
      return sendErrorResponse(res, 400, "Số lượng sản phẩm trong kho không đủ", null, req.requestId);
    }

    // Tìm hoặc tạo giỏ hàng mới
    let cart = await Cart.findOne({ userId });
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Kiểm tra sản phẩm đã có trong giỏ hàng chưa
    const existingItemIndex = cart.items.findIndex(
      item => item.product.sku === sku && item.color === color && item.size === size
    );

    if (existingItemIndex > -1) {
      // Cập nhật số lượng nếu sản phẩm đã tồn tại
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      if (newQuantity > product.stock) {
        return sendErrorResponse(res, 400, "Số lượng sản phẩm trong kho không đủ", null, req.requestId);
      }
      cart.items[existingItemIndex].quantity = newQuantity;
      cart.items[existingItemIndex].totalPrice = newQuantity * product.salePrice;
    } else {
      // Thêm sản phẩm mới vào giỏ hàng
      cart.items.push({
        product: {
          sku: product.sku,
          name: product.name,
          slug: product.slug,
          brand: product.brand,
          mainImage: product.mainImage,
          originalPrice: product.originalPrice,
          salePrice: product.salePrice
        },
        quantity,
        color,
        size,
        totalPrice: quantity * product.salePrice
      });
    }

    await cart.save();

    // Đảm bảo trả về cart với _id cho từng item
    const cartWithIds = cart.toObject();
    if (cartWithIds.items) {
      cartWithIds.items = cartWithIds.items.map(item => ({
        ...item,
        _id: item._id || new mongoose.Types.ObjectId()
      }));
    }

    return sendSuccessResponse(res, 200, "Đã thêm sản phẩm vào giỏ hàng", cartWithIds);
  } catch (error) {
    const errorResponse = handleError(error, req.requestId);
    return sendErrorResponse(res, errorResponse.statusCode, errorResponse.message, error, req.requestId);
  }
};

// Cập nhật số lượng sản phẩm trong giỏ hàng
export const updateCartItemQuantity = async (req, res) => {
  try {
    const { sku, color, size, quantity } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return sendErrorResponse(res, 404, "Không tìm thấy giỏ hàng", null, req.requestId);
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.sku === sku && item.color === color && item.size === size
    );

    if (itemIndex === -1) {
      return sendErrorResponse(res, 404, "Không tìm thấy sản phẩm trong giỏ hàng", null, req.requestId);
    }

    // Kiểm tra số lượng tồn kho
    const product = await Product.findOne({ sku });
    if (quantity > product.stock) {
      return sendErrorResponse(res, 400, "Số lượng sản phẩm trong kho không đủ", null, req.requestId);
    }

    // Cập nhật số lượng và tổng giá
    cart.items[itemIndex].quantity = quantity;
    cart.items[itemIndex].totalPrice = quantity * product.salePrice;

    await cart.save();

    // Đảm bảo trả về cart với _id cho từng item
    const cartWithIds = cart.toObject();
    if (cartWithIds.items) {
      cartWithIds.items = cartWithIds.items.map(item => ({
        ...item,
        _id: item._id || new mongoose.Types.ObjectId()
      }));
    }

    return sendSuccessResponse(res, 200, "Đã cập nhật số lượng sản phẩm", cartWithIds);
  } catch (error) {
    const errorResponse = handleError(error, req.requestId);
    return sendErrorResponse(res, errorResponse.statusCode, errorResponse.message, error, req.requestId);
  }
};

// Xóa sản phẩm khỏi giỏ hàng
export const removeFromCart = async (req, res) => {
  try {
    const { sku, color, size } = req.body;
    const userId = req.user._id;

    const cart = await Cart.findOne({ userId });
    if (!cart) {
      return sendErrorResponse(res, 404, "Không tìm thấy giỏ hàng", null, req.requestId);
    }

    cart.items = cart.items.filter(
      item => !(item.product.sku === sku && item.color === color && item.size === size)
    );

    await cart.save();

    // Đảm bảo trả về cart với _id cho từng item
    const cartWithIds = cart.toObject();
    if (cartWithIds.items) {
      cartWithIds.items = cartWithIds.items.map(item => ({
        ...item,
        _id: item._id || new mongoose.Types.ObjectId()
      }));
    }

    return sendSuccessResponse(res, 200, "Đã xóa sản phẩm khỏi giỏ hàng", cartWithIds);
  } catch (error) {
    const errorResponse = handleError(error, req.requestId);
    return sendErrorResponse(res, errorResponse.statusCode, errorResponse.message, error, req.requestId);
  }
};

// Xóa toàn bộ giỏ hàng
export const clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    // Tìm và xóa giỏ hàng của user
    const cart = await Cart.findOneAndDelete({ userId });

    if (!cart) {
      return sendErrorResponse(res, 404, "Không tìm thấy giỏ hàng", null, req.requestId);
    }

    return sendSuccessResponse(res, 200, "Đã xóa giỏ hàng thành công");

  } catch (error) {
    const errorResponse = handleError(error, req.requestId);
    return sendErrorResponse(res, errorResponse.statusCode, errorResponse.message, error, req.requestId);
  }
}; 