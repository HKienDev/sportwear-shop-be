const https = require('https');
const http = require('http');
const { performance } = require('perf_hooks');

class NetworkTester {
  constructor() {
    this.results = [];
    this.testUrls = [
      'https://www.google.com',
      'https://www.cloudflare.com',
      'https://www.github.com'
    ];
  }

  async testConnection(url, timeout = 5000) {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const req = https.get(url, { timeout }, (res) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          url,
          status: res.statusCode,
          responseTime: Math.round(responseTime),
          success: true,
          timestamp: new Date().toISOString()
        });
      });

      req.on('error', (error) => {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        resolve({
          url,
          error: error.message,
          responseTime: Math.round(responseTime),
          success: false,
          timestamp: new Date().toISOString()
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          url,
          error: 'Request timeout',
          responseTime: timeout,
          success: false,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  async runTest(iterations = 5, interval = 2000) {
    console.log(`🔍 Bắt đầu kiểm tra kết nối mạng...`);
    console.log(`📊 Sẽ thực hiện ${iterations} lần test, mỗi lần cách nhau ${interval/1000} giây\n`);

    for (let i = 1; i <= iterations; i++) {
      console.log(`\n🔄 Test lần ${i}/${iterations}:`);
      
      const promises = this.testUrls.map(url => this.testConnection(url));
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        const status = result.success ? '✅' : '❌';
        const time = result.responseTime;
        console.log(`  ${status} ${result.url}: ${time}ms ${result.success ? '' : `(${result.error})`}`);
      });
      
      this.results.push(...results);
      
      if (i < iterations) {
        console.log(`\n⏳ Chờ ${interval/1000} giây trước test tiếp theo...`);
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }

    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(50));
    console.log('📈 BÁO CÁO KẾT QUẢ KIỂM TRA MẠNG');
    console.log('='.repeat(50));

    const successfulTests = this.results.filter(r => r.success);
    const failedTests = this.results.filter(r => !r.success);
    
    console.log(`\n📊 Tổng quan:`);
    console.log(`  • Tổng số test: ${this.results.length}`);
    console.log(`  • Thành công: ${successfulTests.length} (${((successfulTests.length/this.results.length)*100).toFixed(1)}%)`);
    console.log(`  • Thất bại: ${failedTests.length} (${((failedTests.length/this.results.length)*100).toFixed(1)}%)`);

    if (successfulTests.length > 0) {
      const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
      const minResponseTime = Math.min(...successfulTests.map(r => r.responseTime));
      const maxResponseTime = Math.max(...successfulTests.map(r => r.responseTime));
      
      console.log(`\n⏱️  Thời gian phản hồi (chỉ tính các test thành công):`);
      console.log(`  • Trung bình: ${Math.round(avgResponseTime)}ms`);
      console.log(`  • Nhanh nhất: ${minResponseTime}ms`);
      console.log(`  • Chậm nhất: ${maxResponseTime}ms`);
    }

    if (failedTests.length > 0) {
      console.log(`\n❌ Các lỗi gặp phải:`);
      const errorCounts = {};
      failedTests.forEach(test => {
        errorCounts[test.error] = (errorCounts[test.error] || 0) + 1;
      });
      
      Object.entries(errorCounts).forEach(([error, count]) => {
        console.log(`  • ${error}: ${count} lần`);
      });
    }

    // Đánh giá chất lượng kết nối
    const successRate = (successfulTests.length / this.results.length) * 100;
    let qualityRating = '';
    
    if (successRate >= 95) {
      qualityRating = '🟢 Tuyệt vời - Kết nối ổn định';
    } else if (successRate >= 80) {
      qualityRating = '🟡 Tốt - Kết nối khá ổn định';
    } else if (successRate >= 60) {
      qualityRating = '🟠 Trung bình - Kết nối không ổn định';
    } else {
      qualityRating = '🔴 Kém - Kết nối có vấn đề';
    }

    console.log(`\n🎯 Đánh giá chất lượng: ${qualityRating}`);
  }
}

// Chạy test
async function main() {
  const tester = new NetworkTester();
  await tester.runTest(5, 2000); // 5 lần test, cách nhau 2 giây
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = NetworkTester; 