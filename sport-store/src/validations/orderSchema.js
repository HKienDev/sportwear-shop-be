import { z } from 'zod';

// Schema cho item trong đơn hàng
const orderItemSchema = z.object({
  productId: z.string().min(1, 'Vui lòng chọn sản phẩm'),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0'),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0')
});

// Schema cho thông tin giao hàng
const shippingInfoSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: z.string().regex(/^[0-9]{10}$/, 'Số điện thoại không hợp lệ'),
  address: z.string().min(5, 'Địa chỉ phải có ít nhất 5 ký tự'),
  city: z.string().min(1, 'Vui lòng chọn thành phố'),
  district: z.string().min(1, 'Vui lòng chọn quận/huyện'),
  ward: z.string().min(1, 'Vui lòng chọn phường/xã'),
  note: z.string().optional()
});

// Schema cho tạo đơn hàng mới
export const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Vui lòng thêm ít nhất 1 sản phẩm'),
  shippingInfo: shippingInfoSchema,
  paymentMethod: z.enum(['cod', 'banking', 'momo'], {
    errorMap: () => ({ message: 'Phương thức thanh toán không hợp lệ' })
  }),
  note: z.string().optional()
});

// Schema cho cập nhật trạng thái đơn hàng
export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'processing', 'shipping', 'delivered', 'cancelled'], {
    errorMap: () => ({ message: 'Trạng thái đơn hàng không hợp lệ' })
  })
});

// Schema cho tìm kiếm đơn hàng
export const searchOrderSchema = z.object({
  keyword: z.string().optional(),
  status: z.enum(['pending', 'processing', 'shipping', 'delivered', 'cancelled']).optional(),
  paymentMethod: z.enum(['cod', 'banking', 'momo']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional()
}); 