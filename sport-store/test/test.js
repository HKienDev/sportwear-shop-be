// Hàm tạo mã đơn hàng
const generateOrderId = () => {
    return `VJUSPORT${nanoid(7).toUpperCase()}`;
  };
  
  // Admin đặt hàng
  export const createOrder = async (req, res) => {
    try {
      const { 
        items, 
        shippingAddress, 
        paymentMethod, 
        phone,
        shippingMethod,
        totalPrice: clientTotalPrice
      } = req.body;
  
      // Validation đầu vào
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "Danh sách sản phẩm không hợp lệ" });
      }
  
      if (!shippingAddress || typeof shippingAddress !== "object") {
        return res.status(400).json({ message: "Thông tin địa chỉ giao hàng không hợp lệ" });
      }
  
      // Validate các trường bắt buộc của shippingAddress
      const requiredFields = [
        'fullName', 
        'address', 
        'city', 
        'district',
        'ward',
        'postalCode'
      ];
      
      for (const field of requiredFields) {
        if (!shippingAddress[field]) {
          return res.status(400).json({ 
            message: `Thông tin ${field} không được để trống trong địa chỉ giao hàng` 
          });
        }
      }
  
      if (!paymentMethod || !["COD", "Stripe"].includes(paymentMethod)) {
        return res.status(400).json({ message: "Phương thức thanh toán không hợp lệ" });
      }
  
      if (!phone) {
        return res.status(400).json({ message: "Số điện thoại không được cung cấp" });
      }
  
      if (!shippingMethod || typeof shippingMethod !== "object") {
        return res.status(400).json({ message: "Thông tin phương thức vận chuyển không hợp lệ" });
      }
  
      // Validate các trường bắt buộc của shippingMethod
      const requiredShippingFields = ['method', 'expectedDate', 'courier', 'trackingId'];
      for (const field of requiredShippingFields) {
        if (!shippingMethod[field]) {
          return res.status(400).json({ 
            message: `Thông tin ${field} không được để trống trong phương thức vận chuyển` 
          });
        }
      }
  
      // Chuẩn hóa số điện thoại
      const normalizedPhone = phone.replace(/\s+/g, "").trim();
      
      // Validate format số điện thoại
      if (!normalizedPhone.match(/^0[0-9]{9}$/)) {
        return res.status(400).json({ message: "Số điện thoại không đúng định dạng" });
      }
  
      let userId = null; // Mặc định khách vãng lai
  
      // Kiểm tra số điện thoại có tồn tại trong DB không
      const existingUser = await User.findOne({ phone: normalizedPhone });
      if (existingUser) {
        userId = existingUser._id;
      }
  
      // Lấy danh sách ID sản phẩm từ items
      const productIds = items.map(item => {
        try {
          return new mongoose.Types.ObjectId(item.product);
        } catch (error) {
          throw new Error(`ID sản phẩm không hợp lệ: ${item.product}`);
        }
      });
  
      // Tìm tất cả sản phẩm trong DB
      const products = await Product.find({ _id: { $in: productIds } });
  
      // Kiểm tra sự tồn tại của sản phẩm
      const productMap = new Map(products.map(product => [product._id.toString(), product]));
      for (const item of items) {
        if (!productMap.has(item.product)) {
          return res.status(404).json({ message: `Sản phẩm với ID ${item.product} không tồn tại` });
        }
        
        // Kiểm tra số lượng
        const product = productMap.get(item.product);
        if (item.quantity > product.quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm ${product.name} chỉ còn ${product.quantity} trong kho` 
          });
        }
      }
  
      // Tính tổng giá trị đơn hàng và tạo danh sách items
      let totalPrice = 0;
      const orderItems = items.map(item => {
        const product = productMap.get(item.product);
        const itemPrice = product.discountPrice || product.price;
        const itemTotal = itemPrice * item.quantity;
        totalPrice += itemTotal;
  
        return {
          product: product._id,
          quantity: item.quantity,
          price: itemPrice,
        };
      });
  
      // Kiểm tra tổng tiền từ client có khớp không
      if (Math.abs(totalPrice - clientTotalPrice) > 1) {
        console.log("Tổng tiền từ client:", clientTotalPrice);
        console.log("Tổng tiền tính được:", totalPrice);
        return res.status(400).json({ 
          message: "Tổng tiền không khớp với dữ liệu từ server" 
        });
      }
  
      // Tạo đơn hàng mới
      const newOrder = new Order({
        shortId: generateOrderId(),
        user: userId,
        items: orderItems,
        totalPrice,
        paymentMethod,
        paymentStatus: "pending",
        status: "pending",
        shippingMethod,
        shippingAddress: {
          fullName: shippingAddress.fullName,
          phone: normalizedPhone,
          address: shippingAddress.address,
          city: shippingAddress.city,
          district: shippingAddress.district,
          ward: shippingAddress.ward,
          postalCode: shippingAddress.postalCode
        }
      });
  
      // Lưu đơn hàng vào DB
      await newOrder.save();
  
      // Trừ stock sản phẩm ngay khi tạo đơn
      for (const item of items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { quantity: -item.quantity } }
        );
      }
  
      res.status(201).json({ 
        message: "Đặt hàng thành công", 
        order: newOrder 
      });
  
    } catch (error) {
      console.error("Lỗi khi đặt hàng:", error);
      res.status(500).json({ 
        message: "Lỗi khi đặt hàng", 
        error: error.message 
      });
    }
  };
  
  // Admin cập nhật trạng thái đơn hàng
  export const updateOrderStatus = async (req, res) => {
    try {
      const { status } = req.body;
      const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
  
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Trạng thái không hợp lệ" });
      }
  
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });
  
      // Nếu chuyển từ "pending" sang "processing" (xác nhận đơn)
      if (order.status === "pending" && status === "processing") {
        // Trừ stock sản phẩm
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { quantity: -item.quantity } }
          );
        }
      }
  
      // Nếu chuyển sang trạng thái "cancelled"
      if (status === "cancelled") {
        // Hoàn lại stock sản phẩm
        for (const item of order.items) {
          await Product.updateOne(
            { _id: item.product },
            { $inc: { quantity: item.quantity } }
          );
        }
      }
  
      order.status = status;
      await order.save();
  
      res.json({ message: "Cập nhật trạng thái đơn hàng thành công", order });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi cập nhật đơn hàng", error: error.message });
    }
  };
  
  // Hủy đơn hàng
  export const deleteOrder = async (req, res) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) return res.status(404).json({ message: "Đơn hàng không tồn tại" });
  
      // Chỉ user của đơn hàng hoặc admin mới có quyền hủy
      if (order.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Bạn không có quyền hủy đơn hàng này" });
      }
  
      // Chỉ cho phép hủy đơn từ trạng thái "Đã xác nhận" trở đi
      if (order.status === "pending") {
        return res.status(400).json({ 
          message: "Chỉ có thể hủy đơn từ trạng thái 'Đã xác nhận' trở đi" 
        });
      }
  
      // Hoàn lại stock sản phẩm
      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product },
          { $inc: { quantity: item.quantity } }
        );
      }
  
      // Cập nhật trạng thái đơn hàng thành "cancelled" thay vì xóa
      order.status = "cancelled";
      await order.save();
  
      res.json({ message: "Hủy đơn hàng thành công", order });
    } catch (error) {
      res.status(500).json({ message: "Lỗi khi hủy đơn hàng", error: error.message });
    }
  };