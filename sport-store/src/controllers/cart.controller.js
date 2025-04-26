import Cart from '../models/cart.js';
import Product from '../models/product.js';
import { sendSuccessResponse, sendErrorResponse } from '../utils/responseUtils.js';
import { handleError } from '../utils/errorHandler.js';

// Lấy giỏ hàng của user
export const getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ userId });
    
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    return sendSuccessResponse(res, 200, "Lấy giỏ hàng thành công", cart);
  } catch (error) {
    const errorResponse = handleError(error, req.requestId);
    return sendErrorResponse(res, errorResponse.statusCode, errorResponse.message, error, req.requestId);
  }
};

// Thêm sản phẩm vào giỏ hàng
export const addToCart = async (req, res) => {
  try {
    const { sku, color = "Mặc Định", size, quantity = 1 } = req.body;
    const userId = req.user._id;

    // Kiểm tra sản phẩm tồn tại
    const product = await Product.findOne({ sku });
    if (!product) {
      return sendErrorResponse(res, 404, "Không tìm thấy sản phẩm", null, req.requestId);
    }

    // Kiểm tra màu sắc hợp lệ
    if (!product.colors.includes(color)) {
      return sendErrorResponse(res, 400, "Màu sắc không hợp lệ", null, req.requestId);
    }

    // Kiểm tra kích thước hợp lệ
    if (!product.sizes.includes(size)) {
      return sendErrorResponse(res, 400, "Kích thước không hợp lệ", null, req.requestId);
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

    return sendSuccessResponse(res, 200, "Đã thêm sản phẩm vào giỏ hàng");
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

    return sendSuccessResponse(res, 200, "Đã cập nhật số lượng sản phẩm");
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

    return sendSuccessResponse(res, 200, "Đã xóa sản phẩm khỏi giỏ hàng");
  } catch (error) {
    const errorResponse = handleError(error, req.requestId);
    return sendErrorResponse(res, errorResponse.statusCode, errorResponse.message, error, req.requestId);
  }
}; 