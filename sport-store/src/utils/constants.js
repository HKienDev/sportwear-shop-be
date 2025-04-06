export const ERROR_MESSAGES = {
    // General errors
    SERVER_ERROR: "Lỗi máy chủ nội bộ",
    INTERNAL_SERVER_ERROR: "Lỗi máy chủ nội bộ",
    VALIDATION_ERROR: "Lỗi xác thực dữ liệu",
    DUPLICATE_ERROR: "Dữ liệu trùng lặp",
    NOT_FOUND: "Không tìm thấy tài nguyên",
    MISSING_FIELDS: "Thiếu thông tin bắt buộc",
    INVALID_ID: "ID không hợp lệ",
    
    // Authentication errors
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác",
    INVALID_TOKEN: "Token không hợp lệ",
    TOKEN_EXPIRED: "Token đã hết hạn",
    UNAUTHORIZED: "Bạn không có quyền thực hiện thao tác này",
    INVALID_PASSWORD: "Mật khẩu không chính xác",
    SAME_PASSWORD: "Mật khẩu mới không được trùng với mật khẩu cũ",
    ACCOUNT_BLOCKED: "Tài khoản đã bị khóa",
    ACCOUNT_INACTIVE: "Tài khoản đã bị vô hiệu hóa",
    ACCOUNT_NOT_VERIFIED: "Tài khoản chưa được xác thực",
    NO_REFRESH_TOKEN: "Không tìm thấy refresh token",
    SEND_OTP_FAILED: "Gửi OTP thất bại. Vui lòng thử lại!",
    OTP_INVALID: "OTP không hợp lệ hoặc đã hết hạn",
    OTP_INCORRECT: "OTP không chính xác!",
    ACCOUNT_LOCKED: "Tài khoản của bạn đã bị khóa. Vui lòng thử lại sau 30 phút",
    GOOGLE_AUTH_FAILED: "Xác thực Google thất bại",
    
    // User specific error messages
    USER_NOT_FOUND: "Không tìm thấy người dùng",
    USER_EXISTS: "Người dùng đã tồn tại",
    EMAIL_EXISTS: "Email đã được sử dụng",
    INVALID_USER_DATA: "Dữ liệu người dùng không hợp lệ",
    USER_UPDATE_FAILED: "Cập nhật thông tin người dùng thất bại",
    USER_DELETE_FAILED: "Xóa người dùng thất bại",
    USER_ROLE_INVALID: "Vai trò người dùng không hợp lệ",
    USER_STATUS_INVALID: "Trạng thái người dùng không hợp lệ",
    OTP_REQUIRED: "Mã OTP là bắt buộc",
    CURRENT_PASSWORD_REQUIRED: "Mật khẩu hiện tại là bắt buộc",
    NEW_PASSWORD_REQUIRED: "Mật khẩu mới là bắt buộc",
    PASSWORDS_MUST_DIFFER: "Mật khẩu mới phải khác mật khẩu hiện tại",
    INVALID_PHONE: "Số điện thoại không hợp lệ",
    
    // Category specific error messages
    CATEGORY_NOT_FOUND: "Danh mục không tồn tại",
    DUPLICATE_NAME: "Tên danh mục đã tồn tại",
    INVALID_PARENT: "Danh mục cha không tồn tại",
    
    // Order specific error messages
    ORDER_NOT_FOUND: "Đơn hàng không tồn tại",
    INVALID_PRODUCT: "Sản phẩm không tồn tại",
    INSUFFICIENT_STOCK: "Sản phẩm không đủ số lượng trong kho",
    INVALID_PAYMENT: "Phương thức thanh toán không hợp lệ",
    INVALID_SHIPPING: "Thông tin vận chuyển không hợp lệ",
    PRICE_MISMATCH: "Tổng tiền không khớp với dữ liệu từ server",
    
    // Product specific error messages
    PRODUCT_NOT_FOUND: "Sản phẩm không tồn tại",
    PRODUCT_EXISTS: "Sản phẩm đã tồn tại",
    INVALID_PRICE: "Giá sản phẩm không hợp lệ",
    INVALID_DISCOUNT: "Giá khuyến mãi không hợp lệ",
    INVALID_QUANTITY: "Số lượng sản phẩm không hợp lệ",
    INVALID_STOCK: "Số lượng tồn kho không hợp lệ",
    
    // Upload specific error messages
    UPLOAD_FAILED: "Tải lên file thất bại",
    INVALID_FILE_TYPE: "Loại file không được hỗ trợ",
    FILE_TOO_LARGE: "File quá lớn",
    
    // Stats specific error messages
    STATS_NOT_FOUND: "Không tìm thấy thống kê"
};

export const SUCCESS_MESSAGES = {
    // General success messages
    ROUTE_WORKING: "Route đang hoạt động!",
    
    // User specific success messages
    USER_CREATED: "Tạo người dùng thành công",
    USER_UPDATED: "Cập nhật thông tin người dùng thành công",
    USER_DELETED: "Xóa người dùng thành công",
    ADMIN_CREATED: "Tạo tài khoản admin thành công",
    PASSWORD_CHANGED: "Đổi mật khẩu thành công",
    PASSWORD_RESET: "Đặt lại mật khẩu thành công",
    PROFILE_UPDATED: "Cập nhật thông tin cá nhân thành công",
    MEMBERSHIP_UPDATED: "Cập nhật hạng thành viên thành công",
    REGISTER_SUCCESS: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận OTP.",
    VERIFY_SUCCESS: "Tài khoản đã được xác thực và tạo thành công!",
    LOGIN_SUCCESS: "Đăng nhập thành công",
    LOGOUT_SUCCESS: "Đăng xuất thành công",
    PASSWORD_RESET_SENT: "Mật khẩu mới đã được gửi đến email của bạn",
    PASSWORD_RESET_SUCCESS: "Mật khẩu đã được cập nhật thành công",
    USER_PROFILE: "User Profile",
    USER_STATUS_UPDATED: "Cập nhật trạng thái người dùng thành công",
    USER_ROLE_UPDATED: "Cập nhật vai trò người dùng thành công",
    OTP_SENT: "Đã gửi mã OTP xác thực đổi mật khẩu",
    PASSWORD_CHANGED_WITH_OTP: "Đổi mật khẩu thành công",
    OTP_VERIFIED: "Xác thực OTP thành công",
    
    // Category specific success messages
    CATEGORY_CREATED: "Tạo danh mục thành công",
    CATEGORY_UPDATED: "Cập nhật danh mục thành công",
    CATEGORY_DELETED: "Xóa danh mục thành công",
    
    // Order specific success messages
    ORDER_CREATED: "Đặt hàng thành công",
    ORDER_UPDATED: "Cập nhật đơn hàng thành công",
    ORDER_DELETED: "Xóa đơn hàng thành công",
    STATUS_UPDATED: "Cập nhật trạng thái đơn hàng thành công",
    
    // Product specific success messages
    PRODUCT_CREATED: "Tạo sản phẩm thành công",
    PRODUCT_UPDATED: "Cập nhật sản phẩm thành công",
    PRODUCT_DELETED: "Xóa sản phẩm thành công",
    PRODUCT_STATUS_UPDATED: "Cập nhật trạng thái sản phẩm thành công",
    
    // Upload specific success messages
    UPLOAD_SUCCESS: "Tải lên file thành công"
};

export const TOKEN_CONFIG = {
    ACCESS_TOKEN_EXPIRY: "1h",
    REFRESH_TOKEN_EXPIRY: "7d"
};

export const PRODUCT_STATUS = {
    ACTIVE: true,
    INACTIVE: false
};

export const SORT_OPTIONS = {
    PRICE_ASC: 'price_asc',
    PRICE_DESC: 'price_desc',
    NAME_ASC: 'name_asc',
    NAME_DESC: 'name_desc',
    RATING_DESC: 'rating_desc',
    NEWEST: 'newest'
};

export const UPLOAD_CONFIG = {
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    CLOUDINARY_FOLDER: 'sport-store'
};

// Category specific required fields
export const CATEGORY_REQUIRED_FIELDS = {
    name: "Tên danh mục là bắt buộc"
};

// Order specific constants
export const ORDER_STATUS = {
    PENDING: "pending", // Đang xử lý
    CONFIRMED: "confirmed", // Đã xác nhận
    SHIPPED: "shipped", // Đang giao
    DELIVERED: "delivered", // Giao thành công
    CANCELLED: "cancelled" // Đã hủy
};

export const PAYMENT_METHODS = {
    COD: "COD",
    STRIPE: "Stripe"
};

// Auth specific constants
export const AUTH_CONFIG = {
    OTP_EXPIRY: 60, // 60 seconds
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION: 30 * 60 * 1000, // 30 minutes in milliseconds
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_REGEX: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
};

// User specific constants
export const USER_ROLES = {
    ADMIN: "admin",
    USER: "user",
    STAFF: "staff"
};

export const USER_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    BLOCKED: "blocked",
    PENDING: "pending"
};

export const USER_CONFIG = {
    DEFAULT_ROLE: "user",
    DEFAULT_STATUS: "pending",
    PAGINATION_LIMIT: 10,
    SORT_OPTIONS: {
        CREATED_AT: "createdAt",
        UPDATED_AT: "updatedAt",
        NAME: "name",
        EMAIL: "email"
    }
};

export const SHIPPING_METHODS = {
    STANDARD: "standard",
    EXPRESS: "express",
    SAME_DAY: "same_day"
};

export const SHIPPING_FEES = {
    [SHIPPING_METHODS.STANDARD]: 30000,
    [SHIPPING_METHODS.EXPRESS]: 45000,
    [SHIPPING_METHODS.SAME_DAY]: 60000
}; 