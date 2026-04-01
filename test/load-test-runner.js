/**
 * 负载测试运行器
 * 
 * 用途：模拟多用户并发场景，测试系统在高负载下的表现
 * 
 * 运行方式：
 * node test/load-test-runner.js
 */

const http = require('http');
const https = require('https');
const os = require('os');

// 配置参数
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  concurrentUsers: parseInt(process.env.CONCURRENT_USERS) || 50,
  rampUpTime: parseInt(process.env.RAMP_UP_TIME) || 10000, // 10 秒
  testDuration: parseInt(process.env.TEST_DURATION) || 60000, // 1 分钟
  endpoints: [
    { path: '/health', method: 'GET', weight: 10 },
    { path: '/customers?page=1&limit=10', method: 'GET', weight: 30 },
    { path: '/customers/statistics', method: 'GET', weight: 20 },
    { path: '/recommendations/stats', method: 'GET', weight: 20 },
    { path: '/customers/rfm/summary', method: 'GET', weight: 20 },
  ],
};

// 统计数据
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: {},
  startTime: null,
  endTime: null,
};

/**
 * 发送 HTTP 请求
 */
function makeRequest(endpoint) {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}${endpoint.path}`;
    const lib = url.startsWith('https') ? https : http;
    
    const options = {
      hostname: new URL(url).hostname,
      port: new URL(url).port || (url.startsWith('https') ? 443 : 80),
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'LoadTestRunner/1.0',
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * 加权随机选择端点
 */
function selectEndpoint() {
  const totalWeight = CONFIG.endpoints.reduce((sum, ep) => sum + ep.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const endpoint of CONFIG.endpoints) {
    if (random < endpoint.weight) {
      return endpoint;
    }
    random -= endpoint.weight;
  }
  
  return CONFIG.endpoints[0];
}

/**
 * 模拟用户行为
 */
async function simulateUser(userId) {
  while (stats.endTime === null) {
    const endpoint = selectEndpoint();
    
    try {
      const result = await makeRequest(endpoint);
      
      stats.totalRequests++;
      stats.responseTimes.push(result.responseTime);
      
      if (result.success) {
        stats.successfulRequests++;
      } else {
        stats.failedRequests++;
        const errorKey = `HTTP_${result.statusCode}`;
        stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
      }
    } catch (error) {
      stats.totalRequests++;
      stats.failedRequests++;
      const errorKey = error.message || 'UNKNOWN_ERROR';
      stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
    }
    
    // 随机延迟（100-500ms）
    await sleep(Math.random() * 400 + 100);
  }
}

/**
 * 等待函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 计算统计数据
 */
function calculateStatistics() {
  const sorted = [...stats.responseTimes].sort((a, b) => a - b);
  const totalTime = stats.endTime - stats.startTime;
  
  const percentiles = {
    p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
    p75: sorted[Math.floor(sorted.length * 0.75)] || 0,
    p90: sorted[Math.floor(sorted.length * 0.90)] || 0,
    p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
    p99: sorted[Math.floor(sorted.length * 0.99)] || 0,
  };
  
  const avgResponseTime = stats.responseTimes.length > 0
    ? stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
    : 0;
  
  const requestsPerSecond = stats.totalRequests / (totalTime / 1000);
  
  return {
    summary: {
      totalRequests: stats.totalRequests,
      successfulRequests: stats.successfulRequests,
      failedRequests: stats.failedRequests,
      successRate: ((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2) + '%',
      testDuration: totalTime + 'ms',
      requestsPerSecond: requestsPerSecond.toFixed(2),
    },
    responseTime: {
      average: avgResponseTime.toFixed(2) + 'ms',
      min: Math.min(...sorted) + 'ms',
      max: Math.max(...sorted) + 'ms',
      ...Object.fromEntries(
        Object.entries(percentiles).map(([k, v]) => [k, v.toFixed(2) + 'ms'])
      ),
    },
    errors: stats.errors,
    environment: {
      concurrentUsers: CONFIG.concurrentUsers,
      nodeVersion: process.version,
      platform: process.platform,
      cpus: os.cpus().length,
      memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
    },
  };
}

/**
 * 打印报告
 */
function printReport(report) {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           LOAD TEST RESULTS REPORT                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n📊 SUMMARY');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Total Requests:      ${report.summary.totalRequests}`);
  console.log(`  Successful:          ${report.summary.successfulRequests}`);
  console.log(`  Failed:              ${report.summary.failedRequests}`);
  console.log(`  Success Rate:        ${report.summary.successRate}`);
  console.log(`  Test Duration:       ${report.summary.testDuration}`);
  console.log(`  Requests/Second:     ${report.summary.requestsPerSecond}`);
  
  console.log('\n⏱️  RESPONSE TIME');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Average:             ${report.responseTime.average}`);
  console.log(`  Min:                 ${report.responseTime.min}`);
  console.log(`  Max:                 ${report.responseTime.max}`);
  console.log(`  P50:                 ${report.responseTime.p50}`);
  console.log(`  P75:                 ${report.responseTime.p75}`);
  console.log(`  P90:                 ${report.responseTime.p90}`);
  console.log(`  P95:                 ${report.responseTime.p95}`);
  console.log(`  P99:                 ${report.responseTime.p99}`);
  
  console.log('\n❌ ERRORS');
  console.log('─────────────────────────────────────────────────────────────');
  if (Object.keys(report.errors).length === 0) {
    console.log('  No errors occurred! 🎉');
  } else {
    Object.entries(report.errors).forEach(([error, count]) => {
      console.log(`  ${error}: ${count}`);
    });
  }
  
  console.log('\n🖥️  ENVIRONMENT');
  console.log('─────────────────────────────────────────────────────────────');
  console.log(`  Concurrent Users:    ${report.environment.concurrentUsers}`);
  console.log(`  Node Version:        ${report.environment.nodeVersion}`);
  console.log(`  Platform:            ${report.environment.platform}`);
  console.log(`  CPUs:                ${report.environment.cpus}`);
  console.log(`  Memory:              ${report.environment.memory}`);
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

/**
 * 主函数
 */
async function runLoadTest() {
  console.log('\n🚀 Starting Load Test...\n');
  console.log('Configuration:');
  console.log(`  Base URL:            ${CONFIG.baseUrl}`);
  console.log(`  Concurrent Users:    ${CONFIG.concurrentUsers}`);
  console.log(`  Ramp Up Time:        ${CONFIG.rampUpTime}ms`);
  console.log(`  Test Duration:       ${CONFIG.testDuration}ms`);
  console.log(`  Endpoints:           ${CONFIG.endpoints.length}`);
  console.log('\nStarting users gradually...\n');
  
  stats.startTime = Date.now();
  
  // 逐步启动用户（Ramp-up）
  const usersPerInterval = Math.ceil(CONFIG.concurrentUsers / (CONFIG.rampUpTime / 100));
  let startedUsers = 0;
  
  const userPromises = [];
  
  for (let i = 0; i < CONFIG.concurrentUsers; i++) {
    setTimeout(() => {
      userPromises.push(simulateUser(i));
      startedUsers++;
      
      if (startedUsers % 10 === 0 || startedUsers === CONFIG.concurrentUsers) {
        console.log(`✓ Started ${startedUsers}/${CONFIG.concurrentUsers} users`);
      }
    }, (i / CONFIG.concurrentUsers) * CONFIG.rampUpTime);
  }
  
  // 等待测试结束
  await sleep(CONFIG.testDuration);
  
  // 停止测试
  stats.endTime = Date.now();
  
  console.log('\n⏹️  Stopping load test...\n');
  
  // 等待所有用户完成当前请求
  await sleep(2000);
  
  // 计算并打印报告
  const report = calculateStatistics();
  printReport(report);
  
  // 保存报告到文件
  const fs = require('fs');
  const reportPath = './test/results/load-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${reportPath}\n`);
  
  // 判断是否成功
  const successRate = parseFloat(report.summary.successRate);
  if (successRate >= 99) {
    console.log('✅ Load Test PASSED - Success rate >= 99%');
    process.exit(0);
  } else if (successRate >= 95) {
    console.log('⚠️  Load Test WARNING - Success rate between 95-99%');
    process.exit(1);
  } else {
    console.log('❌ Load Test FAILED - Success rate < 95%');
    process.exit(2);
  }
}

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('\n❌ Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// 运行测试
runLoadTest().catch((err) => {
  console.error('\n❌ Load Test Error:', err.message);
  process.exit(1);
});
