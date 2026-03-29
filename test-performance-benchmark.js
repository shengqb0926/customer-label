/**
 * 性能基准测试脚本
 * 测试优化前后的性能差异
 * 
 * 使用方法:
 * node test-performance-benchmark.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
const TEST_CUSTOMER_ID = 1; // 使用客户 ID 1 进行测试

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP 请求封装（带计时）
function timedRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        try {
          resolve({
            statusCode: res.statusCode,
            data: data ? JSON.parse(data) : null,
            duration,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            duration,
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { // 30 秒超时
      req.destroy();
      reject(new Error(`Request timeout after ${Date.now() - startTime}ms`));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// 性能测试主函数
async function runPerformanceTests() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║         性能基准测试 - P1 优化验证                        ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');
  
  const results = {
    ruleEngine: [],
    clusteringEngine: [],
    associationEngine: [],
    acceptRecommendation: [],
    rejectRecommendation: [],
  };

  // 测试 1: 规则引擎触发（默认模式，最快）
  log('\n📊 测试 1: 规则引擎触发 (mode=rule)', 'cyan');
  for (let i = 0; i < 3; i++) {
    try {
      const res = await timedRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/generate/${TEST_CUSTOMER_ID}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, { mode: 'rule', useCache: false });
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        results.ruleEngine.push(res.duration);
        log(`  第${i + 1}次：✅ ${res.duration}ms - 生成 ${res.data.count} 条推荐`, 'green');
      } else {
        log(`  第${i + 1}次：❌ 状态码 ${res.statusCode}`, 'red');
      }
    } catch (error) {
      log(`  第${i + 1}次：❌ ${error.message}`, 'red');
    }
  }

  // 测试 2: 聚合引擎触发
  log('\n📊 测试 2: 聚合引擎触发 (mode=clustering)', 'cyan');
  for (let i = 0; i < 3; i++) {
    try {
      const res = await timedRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/generate/${TEST_CUSTOMER_ID}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, { mode: 'clustering', useCache: false });
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        results.clusteringEngine.push(res.duration);
        log(`  第${i + 1}次：✅ ${res.duration}ms - 生成 ${res.data.count} 条推荐`, 'green');
      } else {
        log(`  第${i + 1}次：❌ 状态码 ${res.statusCode}`, 'red');
      }
    } catch (error) {
      log(`  第${i + 1}次：❌ ${error.message}`, 'red');
    }
  }

  // 测试 3: 关联引擎触发
  log('\n📊 测试 3: 关联引擎触发 (mode=association)', 'cyan');
  for (let i = 0; i < 3; i++) {
    try {
      const res = await timedRequest({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/generate/${TEST_CUSTOMER_ID}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, { mode: 'association', useCache: false });
      
      if (res.statusCode === 201 || res.statusCode === 200) {
        results.associationEngine.push(res.duration);
        log(`  第${i + 1}次：✅ ${res.duration}ms - 生成 ${res.data.count} 条推荐`, 'green');
      } else {
        log(`  第${i + 1}次：❌ 状态码 ${res.statusCode}`, 'red');
      }
    } catch (error) {
      log(`  第${i + 1}次：❌ ${error.message}`, 'red');
    }
  }

  // 获取推荐列表用于测试接受/拒绝
  log('\n📊 获取推荐列表用于后续测试...', 'cyan');
  let testRecommendationId = null;
  try {
    const recsRes = await timedRequest({
      hostname: 'localhost',
      port: 3000,
      path: `/api/v1/recommendations?status=pending&limit=5`,
      method: 'GET',
    });
    
    if (recsRes.data && recsRes.data.data && recsRes.data.data.length > 0) {
      testRecommendationId = recsRes.data.data[0].id;
      log(`  ✅ 找到测试推荐 ID: ${testRecommendationId}`, 'green');
    } else {
      log(`  ⚠️  未找到待处理的推荐，跳过接受/拒绝测试`, 'yellow');
    }
  } catch (error) {
    log(`  ❌ 获取推荐列表失败：${error.message}`, 'red');
  }

  // 测试 4: 接受推荐
  if (testRecommendationId) {
    log('\n📊 测试 4: 接受推荐', 'cyan');
    for (let i = 0; i < 3; i++) {
      try {
        const res = await timedRequest({
          hostname: 'localhost',
          port: 3000,
          path: `/api/v1/recommendations/${testRecommendationId}/accept`,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }, {});
        
        if (res.statusCode === 200) {
          results.acceptRecommendation.push(res.duration);
          log(`  第${i + 1}次：✅ ${res.duration}ms`, 'green');
        } else {
          log(`  第${i + 1}次：❌ 状态码 ${res.statusCode}`, 'red');
        }
      } catch (error) {
        log(`  第${i + 1}次：❌ ${error.message}`, 'red');
      }
    }
  }

  // 计算统计信息
  log('\n\n' + '=' .repeat(70), 'blue');
  log('📊 性能测试结果统计', 'blue');
  log('=' .repeat(70), 'blue');

  function calculateStats(times, name) {
    if (times.length === 0) {
      log(`${name}: ⚠️  无有效数据`, 'yellow');
      return;
    }
    
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    const successRate = (times.length / 3 * 100).toFixed(1);
    
    let status = '✅';
    if (avg > 10000) status = '⚠️  慢';
    if (avg > 20000) status = '❌  超时';
    
    log(`${status} ${name}:`, 'green');
    log(`   平均：${avg.toFixed(0)}ms | 最快：${min}ms | 最慢：${max}ms | 成功率：${successRate}%`, 'cyan');
    
    return avg;
  }

  const stats = {
    rule: calculateStats(results.ruleEngine, '规则引擎'),
    clustering: calculateStats(results.clusteringEngine, '聚合引擎'),
    association: calculateStats(results.associationEngine, '关联引擎'),
    accept: calculateStats(results.acceptRecommendation, '接受推荐'),
  };

  // 总体评价
  log('\n' + '=' .repeat(70), 'blue');
  log('🎯 性能评价', 'blue');
  log('=' .repeat(70), 'blue');

  const overallAvg = (
    (stats.rule || 0) + 
    (stats.clustering || 0) + 
    (stats.association || 0) + 
    (stats.accept || 0)
  ) / 4;

  if (overallAvg < 3000) {
    log('🎉 性能优秀！所有操作平均耗时 < 3 秒', 'green');
  } else if (overallAvg < 5000) {
    log('✅ 性能良好！所有操作平均耗时 < 5 秒', 'green');
  } else if (overallAvg < 10000) {
    log('⚠️  性能一般！部分操作较慢，建议继续优化', 'yellow');
  } else {
    log('❌ 性能较差！存在严重超时问题，需要紧急优化', 'red');
  }

  log('\n💡 优化建议:', 'cyan');
  if ((stats.rule || 0) > 5000 || (stats.clustering || 0) > 5000 || (stats.association || 0) > 5000) {
    log('  1. 检查数据库索引是否生效', 'yellow');
    log('  2. 考虑启用 Redis 缓存', 'yellow');
    log('  3. 优化引擎算法或改为异步执行', 'yellow');
  }
  
  if ((stats.accept || 0) > 2000) {
    log('  4. 检查事务锁等待问题', 'yellow');
    log('  5. 优化缓存失效策略', 'yellow');
  }

  log('=' .repeat(70) + '\n', 'blue');
}

// 运行测试
runPerformanceTests().catch(error => {
  log('\n💥 测试执行失败:', 'red');
  log(error.stack, 'red');
  process.exit(1);
});
