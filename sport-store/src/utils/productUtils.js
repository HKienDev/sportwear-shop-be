// Hàm tạo SKU cho sản phẩm
export const generateSKU = (name, brand) => {
  // Tạo 4 ký tự ngẫu nhiên (chữ hoặc số)
  const generateRandomChars = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Tạo SKU theo định dạng VJUSPORTPRO-XXXX
  return `VJUSPORTPRO-${generateRandomChars()}`;
}; 