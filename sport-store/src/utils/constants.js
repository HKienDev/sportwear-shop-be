export const ERROR_MESSAGES = {
    SERVER_ERROR: "Lỗi máy chủ nội bộ",
    USER_NOT_FOUND: "Không tìm thấy người dùng",
    EMAIL_EXISTS: "Email đã được sử dụng",
    INVALID_ID: "ID không hợp lệ",
    MISSING_FIELDS: "Thiếu thông tin bắt buộc",
    UNAUTHORIZED: "Bạn không có quyền thực hiện thao tác này",
    INVALID_PHONE: "Số điện thoại không hợp lệ",
    INVALID_PASSWORD: "Mật khẩu không chính xác",
    SAME_PASSWORD: "Mật khẩu mới không được trùng với mật khẩu cũ",
    ACCOUNT_BLOCKED: "Tài khoản đã bị khóa",
    ACCOUNT_INACTIVE: "Tài khoản đã bị vô hiệu hóa",
    ACCOUNT_NOT_VERIFIED: "Tài khoản chưa được xác thực",
    NO_REFRESH_TOKEN: "Không tìm thấy refresh token",
    SEND_OTP_FAILED: "Gửi OTP thất bại. Vui lòng thử lại!",
    OTP_INVALID: "OTP không hợp lệ hoặc đã hết hạn",
    OTP_INCORRECT: "OTP không chính xác!",
    // Auth specific error messages
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không chính xác",
    ACCOUNT_LOCKED: "Tài khoản của bạn đã bị khóa. Vui lòng thử lại sau 30 phút",
    GOOGLE_AUTH_FAILED: "Xác thực Google thất bại",
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
    // Upload specific error messages
    UPLOAD_FAILED: "Tải lên file thất bại",
    INVALID_FILE_TYPE: "Loại file không được hỗ trợ",
    FILE_TOO_LARGE: "File quá lớn",
    // Stats specific error messages
    STATS_NOT_FOUND: "Không tìm thấy thống kê",
    // User specific error messages
    USER_EXISTS: "Người dùng đã tồn tại",
    INVALID_USER_DATA: "Dữ liệu người dùng không hợp lệ",
    USER_UPDATE_FAILED: "Cập nhật thông tin người dùng thất bại",
    USER_DELETE_FAILED: "Xóa người dùng thất bại",
    USER_ROLE_INVALID: "Vai trò người dùng không hợp lệ",
    USER_STATUS_INVALID: "Trạng thái người dùng không hợp lệ",
    OTP_REQUIRED: "Mã OTP là bắt buộc",
    CURRENT_PASSWORD_REQUIRED: "Mật khẩu hiện tại là bắt buộc",
    NEW_PASSWORD_REQUIRED: "Mật khẩu mới là bắt buộc",
    PASSWORDS_MUST_DIFFER: "Mật khẩu mới phải khác mật khẩu hiện tại"
};

export const SUCCESS_MESSAGES = {
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
    // Auth specific success messages
    PASSWORD_RESET_SUCCESS: "Mật khẩu đã được cập nhật thành công",
    ROUTE_WORKING: "Route xác thực đang hoạt động!",
    USER_PROFILE: "User Profile",
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
    // Upload specific success messages
    UPLOAD_SUCCESS: "Tải lên file thành công",
    // User specific success messages
    USER_STATUS_UPDATED: "Cập nhật trạng thái người dùng thành công",
    USER_ROLE_UPDATED: "Cập nhật vai trò người dùng thành công",
    OTP_SENT: "Đã gửi mã OTP xác thực đổi mật khẩu",
    PASSWORD_CHANGED_WITH_OTP: "Đổi mật khẩu thành công",
    OTP_VERIFIED: "Xác thực OTP thành công"
};

export const TOKEN_CONFIG = {
    ACCESS_TOKEN_EXPIRY: "1h",
    REFRESH_TOKEN_EXPIRY: "7d",
    COOKIE_CONFIG: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
    }
};

// Category specific required fields
export const CATEGORY_REQUIRED_FIELDS = {
    name: "Tên danh mục là bắt buộc"
};

// Order specific constants
export const ORDER_STATUS = {
    PENDING: "pending",
    PROCESSING: "processing",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
    COMPLETED: "completed"
};

export const PAYMENT_METHODS = {
    COD: "COD",
    STRIPE: "Stripe"
};

// Product specific constants
export const PRODUCT_STATUS = {
    ACTIVE: "active",
    INACTIVE: "inactive",
    OUT_OF_STOCK: "out_of_stock"
};

// Upload specific constants
export const UPLOAD_CONFIG = {
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ["image/jpeg", "image/png", "image/webp"],
    MAX_FILES: 5
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