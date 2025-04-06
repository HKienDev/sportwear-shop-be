// Hàm tạo SKU cho sản phẩm
export const generateSKU = () => {
  // Tạo 4 ký tự ngẫu nhiên (chữ hoặc số)
  const generateRandomChars = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  
  // Tạo SKU theo định dạng VJUSPORTPRODUCT-XXXX
  return `VJUSPORTPRODUCT-${generateRandomChars()}`;
};

/**
 * Kiểm tra SKU có tồn tại chưa
 * @param {string} sku - Mã SKU cần kiểm tra
 * @param {Object} Product - Model Product
 * @returns {Promise<boolean>} true nếu SKU đã tồn tại
 */
export const isSKUExists = async (sku, Product) => {
  const existingProduct = await Product.findOne({ sku });
  return !!existingProduct;
};

/**
 * Tạo SKU duy nhất
 * @param {Object} Product - Model Product
 * @returns {Promise<string>} Mã SKU duy nhất
 */
export const generateUniqueSKU = async (Product) => {
  let sku;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    sku = generateSKU();
    const exists = await isSKUExists(sku, Product);
    if (!exists) {
      isUnique = true;
    }
    attempts++;
  }

  if (!isUnique) {
    throw new Error('Không thể tạo SKU duy nhất sau nhiều lần thử');
  }

  return sku;
}; 