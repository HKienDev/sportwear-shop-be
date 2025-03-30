import Order from '../models/order.js';
import User from '../models/user.js';

export const getStats = async (req, res) => {
  try {
    // Lấy ngày hôm nay và tháng trước
    const today = new Date();
    today.setHours(7, 0, 0, 0); // Đặt múi giờ +7
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // 1. Tổng đơn hàng
    const totalOrders = await Order.countDocuments();

    // 2. Đơn đang giao
    const totalDeliveringOrders = await Order.countDocuments({ status: 'shipped' });

    // 3. Doanh thu hôm nay và so sánh với tháng trước
    const todayOrders = await Order.find({
      status: 'delivered',
      'statusHistory': {
        $elemMatch: {
          'status': 'delivered',
          'updatedAt': { $gte: today }
        }
      }
    });
    const todayRevenue = todayOrders.reduce((sum, order) => sum + order.totalPrice, 0);

    const lastMonthOrders = await Order.find({
      status: 'delivered',
      'statusHistory': {
        $elemMatch: {
          'status': 'delivered',
          'updatedAt': { $gte: lastMonth, $lt: today }
        }
      }
    });
    const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.totalPrice, 0);
    const revenueGrowth = lastMonthRevenue > 0 
      ? ((todayRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
      : 0;

    // 4. Khách hàng mới và so sánh với tháng trước
    const newCustomers = await User.countDocuments({
      createdAt: { $gte: today }
    });
    const lastMonthCustomers = await User.countDocuments({
      createdAt: { $gte: lastMonth, $lt: today }
    });
    const customerGrowth = lastMonthCustomers > 0
      ? ((newCustomers - lastMonthCustomers) / lastMonthCustomers * 100).toFixed(1)
      : 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        totalDeliveringOrders,
        todayRevenue,
        revenueGrowth: parseFloat(revenueGrowth),
        newCustomers,
        customerGrowth: parseFloat(customerGrowth)
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thống kê'
    });
  }
};

// Lấy dữ liệu doanh thu cho biểu đồ
export const getRevenue = async (req, res) => {
  try {
    const { timeRange = 'day' } = req.query;
    console.log('Time range:', timeRange);
    
    // Lấy thời gian hiện tại theo múi giờ Việt Nam
    const today = new Date();
    today.setHours(7, 0, 0, 0); // Đặt múi giờ +7
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let startDate = new Date(today);
    let groupBy = 'day';

    switch (timeRange) {
      case 'day':
        // Lấy đơn hàng của 7 ngày gần nhất
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 6); // Lấy 7 ngày (bao gồm cả hôm nay)
        groupBy = 'day';
        break;
      case 'month':
        // Lấy đơn hàng của 7 tháng gần nhất
        startDate = new Date(today);
        startDate.setMonth(startDate.getMonth() - 6); // Lấy 7 tháng (bao gồm cả tháng hiện tại)
        startDate.setDate(1); // Đặt về ngày đầu tiên của tháng
        startDate.setHours(7, 0, 0, 0); // Đặt múi giờ +7
        groupBy = 'month';
        break;
      case 'year':
        // Lấy đơn hàng của 7 năm gần nhất
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 6); // Lấy 7 năm (bao gồm cả năm hiện tại)
        startDate.setMonth(0); // Đặt về tháng 1
        startDate.setDate(1); // Đặt về ngày đầu tiên
        startDate.setHours(7, 0, 0, 0); // Đặt múi giờ +7
        groupBy = 'year';
        break;
      default:
        startDate = new Date(today);
        groupBy = 'day';
    }

    console.log('Start date:', startDate);
    console.log('Today:', today);
    console.log('Tomorrow:', tomorrow);

    // Lấy đơn hàng theo khoảng thời gian
    const orders = await Order.find({
      status: 'delivered',
      'statusHistory': {
        $elemMatch: {
          'status': 'delivered',
          'updatedAt': {
            $gte: startDate,
            $lt: timeRange === 'day' ? tomorrow : new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      }
    }).sort({ 'statusHistory.updatedAt': 1 });

    console.log('Found orders:', orders.length);

    // Nhóm đơn hàng theo khoảng thời gian
    const revenueByPeriod = orders.reduce((acc, order) => {
      // Tìm thời điểm đơn hàng được cập nhật sang trạng thái delivered
      const deliveredStatus = order.statusHistory.find(status => status.status === 'delivered');
      const date = new Date(deliveredStatus.updatedAt);
      // Không cần điều chỉnh múi giờ vì updatedAt đã ở múi giờ UTC
      let periodKey;

      switch (groupBy) {
        case 'day':
          // Format ngày tháng theo múi giờ Việt Nam
          periodKey = date.toLocaleString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
          break;
        case 'month':
          // Format tháng năm theo múi giờ Việt Nam
          const month = date.toLocaleString('vi-VN', { 
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
          const year = date.toLocaleString('vi-VN', { 
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
          periodKey = `${month}-${year}`;
          break;
        case 'year':
          // Format năm theo múi giờ Việt Nam
          periodKey = date.toLocaleString('vi-VN', { 
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
          break;
        default:
          periodKey = date.toLocaleString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
      }

      if (!acc[periodKey]) {
        acc[periodKey] = {
          revenue: 0,
          orders: 0,
          orderValues: []
        };
      }
      acc[periodKey].revenue += order.totalPrice;
      acc[periodKey].orders += 1;
      acc[periodKey].orderValues.push(order.totalPrice);
      return acc;
    }, {});

    // Nếu là chế độ xem theo ngày, thêm các ngày không có đơn hàng
    if (timeRange === 'day') {
      const currentDate = new Date(startDate);
      while (currentDate <= today) {
        const periodKey = currentDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        if (!revenueByPeriod[periodKey]) {
          revenueByPeriod[periodKey] = {
            revenue: 0,
            orders: 0,
            orderValues: []
          };
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else if (timeRange === 'month') {
      // Thêm các tháng không có đơn hàng
      const currentDate = new Date(startDate);
      while (currentDate <= today) {
        const month = currentDate.toLocaleDateString('vi-VN', { month: '2-digit' });
        const year = currentDate.toLocaleDateString('vi-VN', { year: 'numeric' });
        const periodKey = `${month}-${year}`;
        if (!revenueByPeriod[periodKey]) {
          revenueByPeriod[periodKey] = {
            revenue: 0,
            orders: 0,
            orderValues: []
          };
        }
        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    } else if (timeRange === 'year') {
      // Thêm các năm không có đơn hàng
      const currentDate = new Date(startDate);
      while (currentDate <= today) {
        const periodKey = currentDate.getFullYear().toString();
        if (!revenueByPeriod[periodKey]) {
          revenueByPeriod[periodKey] = {
            revenue: 0,
            orders: 0,
            orderValues: []
          };
        }
        currentDate.setFullYear(currentDate.getFullYear() + 1);
      }
    }

    console.log('Revenue by period:', revenueByPeriod);

    // Tạo mảng dữ liệu cho biểu đồ và sắp xếp theo thứ tự từ cũ đến mới
    const sortedPeriods = Object.entries(revenueByPeriod).sort(([keyA], [keyB]) => {
      if (timeRange === 'day') {
        const [dayA, monthA] = keyA.split('-').map(Number);
        const [dayB, monthB] = keyB.split('-').map(Number);
        // So sánh tháng trước
        if (monthA !== monthB) {
          return monthA - monthB; // Sắp xếp tăng dần
        }
        // Nếu cùng tháng thì so sánh ngày
        return dayA - dayB; // Sắp xếp tăng dần
      } else if (timeRange === 'month') {
        const [monthA, yearA] = keyA.split('-').map(Number);
        const [monthB, yearB] = keyB.split('-').map(Number);
        // So sánh năm trước
        if (yearA !== yearB) {
          return yearA - yearB; // Sắp xếp tăng dần theo năm
        }
        // Nếu cùng năm thì so sánh tháng
        return monthA - monthB; // Sắp xếp tăng dần theo tháng
      } else {
        // Với năm, chỉ cần so sánh số năm
        return parseInt(keyA) - parseInt(keyB); // Sắp xếp tăng dần theo năm
      }
    });

    // Không cần đảo ngược mảng nữa vì đã sắp xếp đúng thứ tự
    const labels = sortedPeriods.map(([key]) => key);
    const data = sortedPeriods.map(([_, value]) => value.revenue);
    const totalOrders = sortedPeriods.reduce((sum, [_, value]) => sum + value.orders, 0);

    // Tính tổng doanh thu của kỳ hiện tại (ngày/tháng/năm)
    const getCurrentPeriodKey = () => {
      const now = new Date();
      switch (timeRange) {
        case 'day':
          return now.toLocaleString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
        case 'month':
          return `${now.toLocaleString('vi-VN', { 
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' 
          })}-${now.toLocaleString('vi-VN', { 
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh' 
          })}`;
        case 'year':
          return now.toLocaleString('vi-VN', { 
            year: 'numeric',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
        default:
          return now.toLocaleString('vi-VN', { 
            day: '2-digit', 
            month: '2-digit',
            timeZone: 'Asia/Ho_Chi_Minh' 
          });
      }
    };

    const currentPeriodKey = getCurrentPeriodKey();
    const currentPeriodRevenue = revenueByPeriod[currentPeriodKey]?.revenue || 0;
    const currentPeriodMedian = (() => {
      const sortedValues = [...(revenueByPeriod[currentPeriodKey]?.orderValues || [])].sort((a, b) => a - b);
      if (sortedValues.length === 0) return 0;
      const middleIndex = Math.floor(sortedValues.length / 2);
      if (sortedValues.length % 2 === 0) {
        return Math.round((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2);
      } else {
        return sortedValues[middleIndex];
      }
    })();

    // Tính trung vị cho từng khoảng thời gian (cho biểu đồ)
    const medians = sortedPeriods.map(([_, value]) => {
      const sortedValues = [...value.orderValues].sort((a, b) => a - b);
      if (sortedValues.length === 0) {
        return 0;
      }
      const middleIndex = Math.floor(sortedValues.length / 2);
      if (sortedValues.length % 2 === 0) {
        return Math.round((sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2);
      } else {
        return sortedValues[middleIndex];
      }
    });

    console.log('Labels:', labels);
    console.log('Data:', data);
    console.log('Total orders:', totalOrders);
    console.log('Current period revenue:', currentPeriodRevenue);
    console.log('Current period median:', currentPeriodMedian);
    console.log('Medians:', medians);

    res.json({
      success: true,
      data: {
        labels,
        data,
        totalOrders: revenueByPeriod[currentPeriodKey]?.orders || 0,
        totalRevenue: currentPeriodRevenue,
        medians,
        currentMedian: currentPeriodMedian
      }
    });
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu doanh thu:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy dữ liệu doanh thu'
    });
  }
}; 