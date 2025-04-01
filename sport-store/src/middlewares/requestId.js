import { v4 as uuidv4 } from 'uuid';

export const requestId = (req, res, next) => {
  // Nếu request đã có ID thì giữ nguyên
  if (req.headers['x-request-id']) {
    req.id = req.headers['x-request-id'];
    return next();
  }

  // Tạo ID mới nếu chưa có
  req.id = uuidv4();
  res.setHeader('x-request-id', req.id);
  next();
}; 