import Joi from 'joi';

// Schema cho đăng ký
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu là bắt buộc'
  }),
  username: Joi.string().min(3).max(30).required().messages({
    'string.min': 'Tên đăng nhập phải có ít nhất 3 ký tự',
    'string.max': 'Tên đăng nhập không được vượt quá 30 ký tự',
    'any.required': 'Tên đăng nhập là bắt buộc'
  }),
  fullname: Joi.string().min(2).required().messages({
    'string.min': 'Họ tên phải có ít nhất 2 ký tự',
    'any.required': 'Họ tên là bắt buộc'
  }),
  phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
    'string.pattern.base': 'Số điện thoại không hợp lệ',
    'any.required': 'Số điện thoại là bắt buộc'
  })
});

// Schema cho đăng nhập
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc'
  }),
  password: Joi.string().required().messages({
    'any.required': 'Vui lòng nhập mật khẩu'
  })
});

// Schema cho quên mật khẩu
export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc'
  })
});

// Schema cho đặt lại mật khẩu
export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc'
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'Mã OTP phải có 6 ký tự',
    'any.required': 'Mã OTP là bắt buộc'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu mới là bắt buộc'
  })
});

// Schema cho đổi mật khẩu
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'any.required': 'Vui lòng nhập mật khẩu hiện tại'
  }),
  newPassword: Joi.string().min(6).required().messages({
    'string.min': 'Mật khẩu mới phải có ít nhất 6 ký tự',
    'any.required': 'Mật khẩu mới là bắt buộc'
  })
});

// Schema cho yêu cầu cập nhật thông tin người dùng
export const updateProfileRequestSchema = Joi.object({
  email: Joi.string().email().messages({
    'string.email': 'Email không hợp lệ',
    'string.empty': 'Email không được để trống',
    'any.required': 'Email là bắt buộc'
  }),
  phone: Joi.string().pattern(/^[0-9]{10}$/).messages({
    'string.pattern.base': 'Số điện thoại phải có 10 chữ số',
    'string.empty': 'Số điện thoại không được để trống',
    'any.required': 'Số điện thoại là bắt buộc'
  }),
  fullname: Joi.string().min(2).max(50).messages({
    'string.min': 'Họ tên phải có ít nhất 2 ký tự',
    'string.max': 'Họ tên không được vượt quá 50 ký tự',
    'string.empty': 'Họ tên không được để trống',
    'any.required': 'Họ tên là bắt buộc'
  }),
  address: Joi.object({
    province: Joi.string().required().messages({
      'string.empty': 'Tỉnh/Thành không được để trống',
      'any.required': 'Tỉnh/Thành là bắt buộc'
    }),
    district: Joi.string().required().messages({
      'string.empty': 'Quận/Huyện không được để trống',
      'any.required': 'Quận/Huyện là bắt buộc'
    }),
    ward: Joi.string().required().messages({
      'string.empty': 'Phường/Xã không được để trống',
      'any.required': 'Phường/Xã là bắt buộc'
    }),
    street: Joi.string().required().messages({
      'string.empty': 'Đường không được để trống',
      'any.required': 'Đường là bắt buộc'
    })
  }),
  dob: Joi.date().iso().messages({
    'date.base': 'Ngày sinh không hợp lệ',
    'date.format': 'Ngày sinh phải ở định dạng ISO',
    'any.required': 'Ngày sinh là bắt buộc'
  }),
  gender: Joi.string().valid('male', 'female', 'other').messages({
    'any.only': 'Giới tính không hợp lệ',
    'any.required': 'Giới tính là bắt buộc'
  })
}).min(1).messages({
  'object.min': 'Phải cập nhật ít nhất một thông tin'
});

// Schema cho xác nhận cập nhật thông tin người dùng
export const updateProfileSchema = Joi.object({
  otp: Joi.string().length(6).required().messages({
    'string.length': 'Mã OTP phải có 6 ký tự',
    'any.required': 'Mã OTP là bắt buộc'
  }),
  updateData: updateProfileRequestSchema
}).required().messages({
  'object.base': 'Dữ liệu không hợp lệ',
  'any.required': 'Dữ liệu là bắt buộc'
});

// Schema cho xác thực OTP
export const verifyOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc'
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'Mã OTP phải có 6 ký tự',
    'any.required': 'Mã OTP là bắt buộc'
  })
});

// Schema cho gửi lại OTP
export const resendOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email không hợp lệ',
    'any.required': 'Email là bắt buộc'
  }),
  purpose: Joi.string().valid('register', 'reset-password').required().messages({
    'any.only': 'Mục đích không hợp lệ',
    'any.required': 'Mục đích là bắt buộc'
  })
}); 