/**
 * 压力测试运行器
 * 
 * 用途：逐步增加负载直到系统崩溃，找出系统瓶颈和极限
 * 
 * 运行方式：
 * node test/stress-test-runner.js
 */

const http = require('http');
const os = require('os');

// 配置参数
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  startUsers: parseInt(process.env.START_USERS) || 10,
  maxUsers: parseInt(process.env.MAX_USERS) || 500,
  stepIncrease: parseInt(process.env.STEP_INCREASE) || 20,
  stepDuration: parseInt(process.env.STEP_DURATION) || 30000, // 30 秒
  failureThreshold: parseFloat(process.env.FAILURE_THRESHOLD) || 0.05, // 5% 失败率
  endpoint: process.env.ENDPOINT || '/customers?page=1&limit=10',
};

// 统计数据
let currentStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
};

/**
 * 发送 HTTP 请求
 */
function makeRequest() {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.baseUrl}${CONFIG.endpoint}`;
    const lib = url.startsWith('https') ? require('https') : require('http');
    
    const options = {
      hostname: new URL(url).hostname,
      port: new URL(url).port || (url.startsWith('https') ? 443 : 80),
      path: CONFIG.endpoint,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'StressTestRunner/1.0',
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const endTime = Date.now();
        resolve({
          statusCode: res.statusCode,
          responseTime: endTime - startTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
    req.end();
  });
}

/**
 * 等待函数
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 运行一轮测试
 */
async function runStep(userCount) {
  console.log(`\n📊 Testing with ${userCount} concurrent users...`);
  
  const stats = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    responseTimes: [],
    errors: {},
  };
  
  const userPromises = [];
  let running = true;
  
  // 启动用户
  for (let i = 0; i < userCount; i++) {
    userPromises.push(
      (async () => {
        while (running) {
          try {
            const result = await makeRequest();
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
            const errorKey = error.message || 'ERROR';
            stats.errors[errorKey] = (stats.errors[errorKey] || 0) + 1;
          }
          
          // 短暂延迟
          await sleep(Math.random() * 200 + 50);
        }
      })()
    );
  }
  
  // 等待指定时长
  await sleep(CONFIG.stepDuration);
  running = false;
  
  // 等待所有用户完成
  await Promise.all(userPromises);
  
  return stats;
}

/**
 * 计算统计数据
 */
function calculateMetrics(stats) {
  const sorted = [...stats.responseTimes].sort((a, b) => a - b);
  const avgResponseTime = sorted.length > 0
    ? sorted.reduce((a, b) => a + b, 0) / sorted.length
    : 0;
  
  const failureRate = stats.totalRequests > 0
    ? stats.failedRequests / stats.totalRequests
    : 0;
  
  const throughput = stats.totalRequests / (CONFIG.stepDuration / 1000);
  
  return {
    totalRequests: stats.totalRequests,
    successfulRequests: stats.successfulRequests,
    failedRequests: stats.failedRequests,
    failureRate: (failureRate * 100).toFixed(2) + '%',
    throughput: throughput.toFixed(2) + ' req/s',
    avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
    p95ResponseTime: (sorted[Math.floor(sorted.length * 0.95)] || 0).toFixed(2) + 'ms',
    p99ResponseTime: (sorted[Math.floor(sorted.length * 0.99)] || 0).toFixed(2) + 'ms',
    errors: stats.errors,
  };
}

/**
 * 打印结果
 */
function printResults(results) {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           STRESS TEST RESULTS                            ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  
  console.log('\n📈 PERFORMANCE METRICS BY USER COUNT\n');
  console.log('─'.repeat(120));
  
  const headers = ['Users', 'Total Req', 'Success', 'Failed', 'Fail Rate', 'Throughput', 'Avg RT', 'P95 RT', 'P99 RT'];
  console.log(headers.join('\t\t'));
  console.log('─'.repeat(120));
  
  results.forEach(result => {
    const metrics = calculateMetrics(result.stats);
    console.log([
      result.users,
      metrics.totalRequests,
      metrics.successfulRequests,
      metrics.failedRequests,
      metrics.failureRate,
      metrics.throughput,
      metrics.avgResponseTime,
      metrics.p95ResponseTime,
      metrics.p99ResponseTime,
    ].join('\t\t'));
  });
  
  console.log('─'.repeat(120));
  
  // 找出瓶颈点
  console.log('\n🔍 BOTTLENECK ANALYSIS\n');
  
  let breakingPoint = null;
  for (let i = 1; i < results.length; i++) {
    const prevMetrics = calculateMetrics(results[i - 1].stats);
    const currMetrics = calculateMetrics(results[i].stats);
    
    const prevFailureRate = parseFloat(prevMetrics.failureRate);
    const currFailureRate = parseFloat(currMetrics.failureRate);
    
    // 失败率突然上升或吞吐量下降
    if (currFailureRate > CONFIG.failureThreshold * 100 || 
        parseFloat(currMetrics.throughput) < parseFloat(prevMetrics.throughput) * 0.8) {
      breakingPoint = results[i].users;
      console.log(`⚠️  Breaking Point Detected: ${breakingPoint} concurrent users`);
      console.log(`   Failure Rate: ${currMetrics.failureRate}`);
      console.log(`   Throughput: ${currMetrics.throughput}`);
      console.log(`   Avg Response Time: ${currMetrics.avgResponseTime}\n`);
      break;
    }
  }
  
  if (!breakingPoint) {
    console.log('✅ No breaking point detected up to', results[results.length - 1].users, 'users');
  }
  
  // 推荐最大并发数
  const recommendedMax = breakingPoint ? Math.floor(breakingPoint * 0.7) : results[results.length - 1].users;
  console.log('\n💡 RECOMMENDATIONS');
  console.log('─'.repeat(60));
  console.log(`Recommended Maximum Concurrent Users: ${recommendedMax}`);
  console.log(`Safety Margin: ${breakingPoint ? '30%' : 'N/A'}`);
  
  if (breakingPoint && breakingPoint < 100) {
    console.log('\n⚠️  WARNING: System breaks at low concurrency. Consider optimization:');
    console.log('   - Database connection pooling');
    console.log('   - Caching layer (Redis)');
    console.log('   - Load balancing');
    console.log('   - Horizontal scaling');
  }
  
  console.log('\n═══════════════════════════════════════════════════════════\n');
}

/**
 * 主函数
 */
async function runStressTest() {
  console.log('\n🔥 Starting Stress Test...\n');
  console.log('Configuration:');
  console.log(`  Base URL:            ${CONFIG.baseUrl}`);
  console.log(`  Start Users:         ${CONFIG.startUsers}`);
  console.log(`  Max Users:           ${CONFIG.maxUsers}`);
  console.log(`  Step Increase:       ${CONFIG.stepIncrease}`);
  console.log(`  Step Duration:       ${CONFIG.stepDuration}ms`);
  console.log(`  Failure Threshold:   ${(CONFIG.failureThreshold * 100)}%`);
  console.log(`  Endpoint:            ${CONFIG.endpoint}`);
  console.log('\nStarting stress test...\n');
  
  const results = [];
  let currentUsers = CONFIG.startUsers;
  
  while (currentUsers <= CONFIG.maxUsers) {
    const stats = await runStep(currentUsers);
    results.push({ users: currentUsers, stats });
    
    const metrics = calculateMetrics(stats);
    const failureRate = parseFloat(metrics.failureRate);
    
    console.log(`✓ Completed ${currentUsers} users - Fail Rate: ${metrics.failureRate}, Throughput: ${metrics.throughput}`);
    
    // 如果失败率超过阈值，停止测试
    if (failureRate > CONFIG.failureThreshold * 100) {
      console.log(`\n⚠️  Stopping test: Failure rate exceeded threshold (${failureRate.toFixed(2)}% > ${(CONFIG.failureThreshold * 100)}%)`);
      break;
    }
    
    currentUsers += CONFIG.stepIncrease;
  }
  
  // 打印完整报告
  printResults(results);
  
  // 保存报告
  const fs = require('fs');
  const reportPath = './test/results/stress-test-report.json';
  const report = {
    timestamp: new Date().toISOString(),
    configuration: CONFIG,
    results: results.map(r => ({
      users: r.users,
      metrics: calculateMetrics(r.stats),
    })),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      cpus: os.cpus().length,
      memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
    },
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Report saved to: ${reportPath}\n`);
}

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('\n❌ Uncaught Exception:', err.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// 运行测试
runStressTest().catch((err) => {
  console.error('\n❌ Stress Test Error:', err.message);
  process.exit(1);
});
