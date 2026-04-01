/**
 * 性能基准测试快速验证脚本
 * 
 * 用途：快速验证性能测试系统是否正常工作
 * 
 * 运行方式：
 * node test/quick-performance-check.js
 */

const http = require('http');

console.log('\n🚀 Quick Performance Check\n');
console.log('=' .repeat(60));

// 配置
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  iterations: 5,
};

// 测试端点
const endpoints = [
  { name: 'Health Check', path: '/health' },
  { name: 'Version Info', path: '/version' },
  { name: 'API Docs', path: '/api-json' },
];

// 统计数据
const stats = {};

/**
 * 发送 HTTP 请求
 */
function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}${path}`;
    const lib = url.startsWith('https') ? require('https') : require('http');
    
    const options = {
      hostname: new URL(url).hostname,
      port: new URL(url).port || (url.startsWith('https') ? 443 : 80),
      path: path,
      method: 'GET',
      timeout: 5000,
    };

    const req = lib.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => { data += chunk; });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

/**
 * 运行单个端点测试
 */
async function testEndpoint(endpoint) {
  console.log(`\n📊 Testing: ${endpoint.name}`);
  console.log(`   URL: ${endpoint.path}`);
  
  const times = [];
  let successCount = 0;
  
  for (let i = 0; i < CONFIG.iterations; i++) {
    const startTime = Date.now();
    
    try {
      const result = await makeRequest(endpoint.path);
      const endTime = Date.now();
      
      times.push(endTime - startTime);
      
      if (result.success) {
        successCount++;
        console.log(`   ✓ Request ${i + 1}: ${times[times.length - 1]}ms`);
      } else {
        console.log(`   ✗ Request ${i + 1}: HTTP ${result.statusCode}`);
      }
    } catch (error) {
      const endTime = Date.now();
      times.push(endTime - startTime);
      console.log(`   ✗ Request ${i + 1}: ${error.message}`);
    }
  }
  
  // 计算统计
  const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const successRate = (successCount / CONFIG.iterations) * 100;
  
  stats[endpoint.name] = {
    avgTime: avgTime.toFixed(2),
    minTime,
    maxTime,
    successRate: successRate.toFixed(2),
  };
  
  console.log(`\n   📈 Results:`);
  console.log(`      Average: ${avgTime.toFixed(2)}ms`);
  console.log(`      Min: ${minTime}ms`);
  console.log(`      Max: ${maxTime}ms`);
  console.log(`      Success Rate: ${successRate.toFixed(2)}%`);
}

/**
 * 主函数
 */
async function runQuickCheck() {
  console.log(`Configuration:`);
  console.log(`  Base URL: ${CONFIG.baseUrl}`);
  console.log(`  Iterations: ${CONFIG.iterations}`);
  console.log('=' .repeat(60));
  
  // 测试所有端点
  for (const endpoint of endpoints) {
    await testEndpoint(endpoint);
  }
  
  // 打印总结
  console.log('\n' + '=' .repeat(60));
  console.log('📊 SUMMARY');
  console.log('=' .repeat(60));
  
  Object.entries(stats).forEach(([name, data]) => {
    console.log(`\n${name}:`);
    console.log(`  Avg Response Time: ${data.avgTime}ms`);
    console.log(`  Success Rate: ${data.successRate}%`);
  });
  
  console.log('\n' + '=' .repeat(60));
  
  // 判断整体是否成功
  const allSuccess = Object.values(stats).every(s => parseFloat(s.successRate) >= 80);
  
  if (allSuccess) {
    console.log('✅ Quick Performance Check PASSED\n');
    process.exit(0);
  } else {
    console.log('❌ Quick Performance Check FAILED\n');
    process.exit(1);
  }
}

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('\n❌ Error:', err.message);
  console.error('\nMake sure the application is running on', CONFIG.baseUrl);
  process.exit(1);
});

// 运行检查
runQuickCheck().catch((err) => {
  console.error('\n❌ Quick Check Error:', err.message);
  console.error('\nTroubleshooting:');
  console.error('1. Check if application is running: ps aux | grep main.js');
  console.error('2. Check if port 3000 is listening: netstat -an | grep 3000');
  console.error('3. Start application: npm start');
  process.exit(1);
});
