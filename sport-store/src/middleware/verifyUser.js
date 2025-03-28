import jwt from 'jsonwebtoken';
import env from '../config/env.js';

const verifyUser = (req, res, next) => {
  try {
    // Lấy token từ header hoặc cookie
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : req.cookies.token;

    console.log('🔹 Authorization Header:', authHeader);
    console.log('🔹 [Middleware] Authorization Header:', authHeader);

    if (!token) {
      console.log('❌ [Middleware] Lỗi xác thực Token: Thiếu hoặc sai định dạng Access Token');
      return res.status(401).json({ 
        error: 'Unauthorized',
        details: 'Thiếu hoặc sai định dạng Access Token'
      });
    }

    // Verify token với ACCESS_TOKEN_SECRET thay vì JWT_SECRET
    const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);
    console.log('🔹 [Middleware] Decoded Token:', decoded);

    // Kiểm tra role
    if (decoded.role !== 'admin') {
      console.log('❌ [Middleware] Lỗi xác thực Token: Không có quyền Admin');
      return res.status(403).json({ 
        error: 'Forbidden',
        details: 'Bạn không có quyền thực hiện thao tác này'
      });
    }

    // Thêm thông tin user vào request
    req.user = decoded;
    next();
  } catch (error) {
    console.log('❌ [Middleware] Lỗi xác thực Token:', error.message);
    console.log('❌ Lỗi verifyUser:', error.message);
    return res.status(401).json({ 
      error: 'Unauthorized',
      details: error.message
    });
  }
};

export default verifyUser;