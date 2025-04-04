// Hàm tạo SKU cho sản phẩm
export const generateSKU = (name, brand) => {
  // Lấy 3 ký tự đầu của tên sản phẩm
  const namePrefix = name.substring(0, 3).toUpperCase();
  
  // Lấy 2 ký tự đầu của thương hiệu
  const brandPrefix = brand.substring(0, 2).toUpperCase();
  
  // Tạo timestamp
  const timestamp = Date.now().toString().slice(-6);
  
  // Tạo số ngẫu nhiên 3 chữ số
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // Kết hợp các phần để tạo SKU
  return `${namePrefix}-${brandPrefix}-${timestamp}-${random}`;
}; 