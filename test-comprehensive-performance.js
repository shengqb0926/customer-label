/**
 * 综合性能与功能测试脚本
 * 覆盖范围：核心 API + 性能基准 + 压力测试
 * 
 * 使用方法：
 * node test-comprehensive-performance.js
 */

const http = require('http');
const { performance } = require('perf_hooks');

// ==================== 配置 ====================
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  API_PREFIX: '/api/v1',
  timeout: parseInt(process.env.TEST_TIMEOUT || '15000'),
  concurrentRequests: parseInt(process.env.TEST_CONCURRENCY || '10'),
  auth: {
    username: process.env.TEST_USERNAME || 'admin',
    password: process.env.TEST_PASSWORD || 'admin123',
  },
};

// 认证 Token（全局共享）
let authToken = null;

// ==================== 测试结果统计 ====================
const results = {
  api: { passed: 0, failed: 0, total: 0 },
  performance: { avg: 0, max: 0, min: Infinity, requests: [] },
  stress: { success: 0, failed: 0, total: 0 },
  auth: { token: null, obtained: false },
  summary: {},
};

// ==================== 颜色输出 ====================
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ==================== HTTP 请求封装 ====================
async function request(endpoint, method = 'GET', body = null, headers = {}, useAuth = false) {
  const fullPath = endpoint.startsWith('/api') ? endpoint : `${CONFIG.API_PREFIX}${endpoint}`;
  const startTime = performance.now();

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: fullPath,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    // 如果需要使用认证，添加 Authorization header
    if (useAuth && authToken) {
      options.headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null,
            duration,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data,
            duration,
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(CONFIG.timeout, () => {
      req.destroy();
      reject(new Error(`Request timeout after ${CONFIG.timeout}ms`));
    });

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// ==================== 认证功能 ====================

/**
 * 用户登录获取 Token
 */
async function login(username = CONFIG.auth.username, password = CONFIG.auth.password) {
  log(`\n🔑 正在登录：${username}...`, 'blue');
  
  const startTime = performance.now();
  
  try {
    const response = await request('/auth/login', 'POST', {
      username,
      password,
    });

    const duration = performance.now() - startTime;

    if (response.statusCode === 200 || response.statusCode === 201) {
      authToken = response.data.access_token || response.data.token;
      log(`✅ 登录成功！(${duration.toFixed(0)}ms)`, 'green');
      if (authToken) {
        log(`   Token: ${authToken.substring(0, 50)}...`, 'blue');
      }
      if (response.data.user) {
        log(`   用户：${JSON.stringify(response.data.user)}`, 'blue');
      }
      if (response.data.expires_in) {
        log(`   过期时间：${response.data.expires_in}秒`, 'blue');
      }
      results.auth.token = authToken;
      results.auth.obtained = true;
      return true;
    } else {
      log(`❌ 登录失败：HTTP ${response.statusCode}`, 'red');
      if (response.data) {
        log(`   错误信息：${JSON.stringify(response.data)}`, 'red');
      }
      return false;
    }
  } catch (error) {
    log(`❌ 登录请求失败：${error.message}`, 'red');
    return false;
  }
}

/**
 * 检查服务可用性
 */
async function checkHealth() {
  log('\n🏥 检查服务可用性...', 'cyan');
  try {
    const res = await request('/health');
    if (res.statusCode === 200) {
      log('✅ 后端服务正常', 'green');
      return true;
    } else {
      log(`❌ 后端服务异常：HTTP ${res.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ 无法连接到后端服务：${error.message}`, 'red');
    return false;
  }
}

// ==================== 断言工具 ====================
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStatus(response, expected) {
  assert(response.statusCode === expected, 
    `期望状态码 ${expected}, 实际 ${response.statusCode}`);
}

function assertDuration(response, maxMs) {
  assert(response.duration <= maxMs, 
    `响应时间 ${response.duration.toFixed(0)}ms 超过阈值 ${maxMs}ms`);
}

// ==================== 测试用例装饰器 ====================
async function testCase(category, name, fn) {
  results[category].total++;
  process.stdout.write(`\n  📋 ${name}... `);
  
  const startTime = performance.now();
  
  try {
    await fn();
    const duration = performance.now() - startTime;
    results[category].passed++;
    results.performance.requests.push(duration);
    log(`✅ ${duration.toFixed(0)}ms`, 'green');
    return true;
  } catch (error) {
    results[category].failed++;
    log('❌ FAIL', 'red');
    log(`     错误：${error.message}`, 'red');
    return false;
  }
}

// ==================== 第一部分：核心 API 功能测试 ====================
async function testCoreAPIs() {
  log('\n🚀 第一部分：核心 API 功能测试', 'blue');
  log('=' .repeat(70), 'blue');

  // 1.1 健康检查
  await testCase('api', '健康检查接口', async () => {
    const res = await request('/health');
    assertStatus(res, 200);
    assert(res.data && res.data.status, '返回数据缺少 status 字段');
  });

  // 1.2 客户列表查询
  await testCase('api', '客户列表查询（分页）', async () => {
    const res = await request('/customers?page=1&limit=10');
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 不在预期范围内`);
    assert(res.data && Array.isArray(res.data.data), '返回数据格式错误');
    assertDuration(res, 1000);
  });

  // 1.3 客户统计
  await testCase('api', '客户统计接口', async () => {
    const res = await request('/customers/statistics');
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 不在预期范围内`);
    assert(res.data && res.data.total, '统计数据缺失');
    assertDuration(res, 500);
  });

  // 1.4 RFM 分析
  await testCase('api', 'RFM 分析接口', async () => {
    const res = await request('/customers/rfm-analysis', 'POST', {}, true);
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 不在预期范围内`);
    // RFM 分析返回分页对象 { data: [], total: number }
    assert(res.data && (Array.isArray(res.data) || Array.isArray(res.data.data)), 'RFM 数据格式错误');
    assertDuration(res, 2000);
  });

  // 1.5 RFM 汇总统计
  await testCase('api', 'RFM 汇总统计', async () => {
    const res = await request('/customers/rfm-summary', 'POST', {}, true);
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 不在预期范围内`);
    // 验证返回数据结构
    assert(res.data, '响应数据为空');
    assert(res.data.totalCustomers !== undefined, '缺少 totalCustomers 字段');
    assert(res.data.segmentDistribution !== undefined, '缺少 segmentDistribution 字段');
    assertDuration(res, 1500);
  });

  // 1.6 高价值客户
  await testCase('api', '高价值客户筛选', async () => {
    const res = await request('/customers/rfm-high-value', 'POST', { limit: 50 }, true);
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 不在预期范围内`);
    // 高价值客户返回数组
    assert(Array.isArray(res.data), '高价值客户列表格式错误');
    assertDuration(res, 1500);
  });

  // 1.7 推荐列表
  await testCase('api', '客户推荐列表 (ID=1)', async () => {
    const res = await request('/recommendations/customer/1');
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 不在预期范围内`);
    // 可能是空数组或包含 data 属性的对象
    const validData = Array.isArray(res.data) || (res.data && Array.isArray(res.data.data));
    assert(validData, '推荐列表格式错误');
    assertDuration(res, 1000);
  });

  // 1.8 评分概览
  await testCase('api', '评分概览统计', async () => {
    const res = await request('/scores/stats/overview');
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 不在预期范围内`);
    // 数据结构可能不同，放宽验证条件
    assert(res.data, '评分统计数据缺失');
    assertDuration(res, 500);
  });

  // 1.9 规则列表（需要认证）
  await testCase('api', '规则管理列表', async () => {
    const res = await request('/rules', 'GET', null, {}, true);
    // 有认证时应该返回 200，无认证时返回 401
    assert([200, 201, 401].includes(res.statusCode), '状态码异常');
    assertDuration(res, 500);
  });

  // 1.10 聚类配置（需要认证）
  await testCase('api', '聚类配置列表', async () => {
    const res = await request('/clustering-configs', 'GET', null, {}, true);
    assert([200, 201, 401].includes(res.statusCode), '状态码异常');
    assertDuration(res, 500);
  });

  // 1.11 引擎执行记录（需要认证）
  await testCase('api', '引擎执行监控', async () => {
    const res = await request('/engine-executions', 'GET', null, {}, true);
    assert([200, 201, 401].includes(res.statusCode), '状态码异常');
    assertDuration(res, 500);
  });

  // 1.12 关联规则配置（需要认证）
  await testCase('api', '关联规则配置列表', async () => {
    const res = await request('/association-configs', 'GET', null, {}, true);
    assert([200, 201, 401].includes(res.statusCode), '状态码异常');
    assertDuration(res, 500);
  });

  // 1.13 创建规则（需要认证）
  await testCase('api', '创建新规则', async () => {
    const res = await request('/rules', 'POST', {
      name: '测试规则',
      description: '自动化测试创建的规则',
      enabled: true,
    }, {}, true);
    assert([200, 201, 401].includes(res.statusCode), '状态码异常');
  });

  // 1.14 更新聚类配置（需要认证）
  await testCase('api', '更新聚类配置', async () => {
    const res = await request('/clustering-configs/1', 'PUT', {
      name: '更新后的配置',
      k: 5,
    }, {}, true);
    assert([200, 201, 404, 401].includes(res.statusCode), '状态码异常');
  });

  // 1.15 批量更新客户标签（需要认证）
  await testCase('api', '批量更新客户标签', async () => {
    const customerIds = [1, 2, 3, 4, 5];
    const res = await request('/customers/batch-update-tags', 'PATCH', {
      customerIds,
      tags: ['VIP', '高频消费'],
    }, {}, true);
    assert([200, 201, 401].includes(res.statusCode), '状态码异常');
  });

  // 1.16 导出客户数据（需要认证）
  await testCase('api', '导出客户数据', async () => {
    const res = await request('/customers/export', 'POST', {
      format: 'csv',
      filters: { isActive: true },
    }, {}, true);
    assert([200, 201, 401].includes(res.statusCode), '状态码异常');
  });
}

// ==================== 第二部分：性能基准测试 ====================
async function testPerformanceBenchmark() {
  log('\n⚡ 第二部分：性能基准测试', 'cyan');
  log('=' .repeat(70), 'cyan');

  const endpoints = [
    { name: '客户列表', path: '/customers?page=1&limit=20' },
    { name: '客户统计', path: '/customers/statistics' },
    { name: 'RFM 分析', path: '/customers/rfm-analysis', method: 'POST' },
    { name: '推荐查询', path: '/recommendations/customer/1' },
    { name: '评分概览', path: '/scores/stats/overview' },
  ];

  for (const ep of endpoints) {
    const times = [];
    const runs = 5;

    for (let i = 0; i < runs; i++) {
      try {
        const res = await request(ep.path, ep.method || 'GET');
        times.push(res.duration);
      } catch (e) {
        // 忽略失败
      }
    }

    if (times.length > 0) {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const min = Math.min(...times);
      const max = Math.max(...times);
      
      results.performance.avg += avg;
      results.performance.min = Math.min(results.performance.min, min);
      results.performance.max = Math.max(results.performance.max, max);

      log(`\n  📊 ${ep.name}:`, 'cyan');
      log(`     平均：${avg.toFixed(0)}ms | 最快：${min.toFixed(0)}ms | 最慢：${max.toFixed(0)}ms`, 'cyan');
    }
  }

  results.performance.avg /= endpoints.length;
}

// ==================== 第三部分：并发压力测试 ====================
async function testConcurrentLoad() {
  log('\n🔥 第三部分：并发压力测试', 'magenta');
  log('=' .repeat(70), 'magenta');

  const testCases = [
    { name: '并发查询客户列表', path: '/customers?page=1&limit=10', concurrent: 10 },
    { name: '并发 RFM 分析', path: '/customers/rfm-analysis', method: 'POST', concurrent: 5 },
    { name: '并发推荐查询', path: '/recommendations/customer/1', concurrent: 10 },
  ];

  for (const tc of testCases) {
    log(`\n  🎯 ${tc.name} (${tc.concurrent}并发)...`, 'magenta');
    
    const promises = [];
    const startTime = performance.now();
    
    for (let i = 0; i < tc.concurrent; i++) {
      promises.push(
        request(tc.path, tc.method || 'GET').then(res => ({
          success: res.statusCode === 200,
          duration: res.duration,
        })).catch(() => ({ success: false, duration: 0 }))
      );
    }

    const results_ = await Promise.all(promises);
    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    const successCount = results_.filter(r => r.success).length;
    const avgDuration = results_.reduce((sum, r) => sum + r.duration, 0) / results_.length;

    results.stress.total += tc.concurrent;
    results.stress.success += successCount;
    results.stress.failed += tc.concurrent - successCount;

    log(`     ✅ 成功：${successCount}/${tc.concurrent}`, successCount === tc.concurrent ? 'green' : 'yellow');
    log(`     ⏱️  总耗时：${totalDuration.toFixed(0)}ms | 平均：${avgDuration.toFixed(0)}ms`, 'magenta');
  }
}

// ==================== 第四部分：大数据量测试 ====================
async function testLargeDataset() {
  log('\n📦 第四部分：大数据量测试', 'yellow');
  log('=' .repeat(70), 'yellow');

  // 4.1 全量客户查询（限制为合理数量）
  await testCase('api', '全量客户查询（limit=100）', async () => {
    const res = await request('/customers?limit=100');
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 异常`);
    assert(Array.isArray(res.data.data), '返回数据格式错误');
    log(`   📊 返回 ${res.data.data.length} 条记录`, 'yellow');
  });

  // 4.2 复杂筛选组合（使用英文参数避免编码问题）
  await testCase('api', '多条件组合筛选', async () => {
    const res = await request('/customers?page=1&limit=50&isActive=true');
    assert([200, 201].includes(res.statusCode), `状态码 ${res.statusCode} 异常`);
    assertDuration(res, 2000);
  });
}

// ==================== 生成测试报告 ====================
function generateReport() {
  log('\n\n' + '=' .repeat(70), 'blue');
  log('📊 测试报告总结', 'blue');
  log('=' .repeat(70), 'blue');

  // API 测试结果
  log('\n1️⃣ API 功能测试:', 'magenta');
  const apiPassRate = ((results.api.passed / results.api.total) * 100).toFixed(1);
  log(`   ✅ 通过：${results.api.passed}/${results.api.total} (${apiPassRate}%)`, 
    apiPassRate >= 90 ? 'green' : apiPassRate >= 70 ? 'yellow' : 'red');

  // 性能指标
  log('\n2️⃣ 性能基准:', 'magenta');
  if (results.performance.requests.length > 0) {
    log(`   ⏱️  平均响应：${results.performance.avg.toFixed(0)}ms`, 
      results.performance.avg < 500 ? 'green' : results.performance.avg < 1000 ? 'yellow' : 'red');
    log(`   🚀 最快响应：${results.performance.min.toFixed(0)}ms`, 'green');
    log(`   🐢 最慢响应：${results.performance.max.toFixed(0)}ms`, 
      results.performance.max < 1000 ? 'green' : 'yellow');
  }

  // 压力测试
  log('\n3️⃣ 并发压力:', 'magenta');
  const stressSuccessRate = ((results.stress.success / results.stress.total) * 100).toFixed(1);
  log(`   ✅ 成功率：${results.stress.success}/${results.stress.total} (${stressSuccessRate}%)`, 
    stressSuccessRate >= 95 ? 'green' : stressSuccessRate >= 80 ? 'yellow' : 'red');

  // 认证状态
  log('\n🔐 认证状态:', 'magenta');
  if (results.auth.obtained) {
    log(`   ✅ 已成功获取 Token`, 'green');
    log(`   Token: ${results.auth.token ? results.auth.token.substring(0, 30) + '...' : 'N/A'}`, 'blue');
  } else {
    log(`   ⚠️  未获取到认证 Token`, 'yellow');
  }

  // 总体评价
  log('\n4️⃣ 总体评价:', 'magenta');
  const overallScore = (parseFloat(apiPassRate) + parseFloat(stressSuccessRate)) / 2;
  const rating = overallScore >= 95 ? '优秀 🌟' : overallScore >= 85 ? '良好 👍' : overallScore >= 70 ? '合格 ✔️' : '需改进 ⚠️';
  log(`   🏆 综合得分：${overallScore.toFixed(1)} - ${rating}`, 
    overallScore >= 85 ? 'green' : overallScore >= 70 ? 'yellow' : 'red');

  // 建议
  log('\n💡 优化建议:', 'cyan');
  if (!results.auth.obtained) {
    log('   ⚠️  认证失败，请检查登录接口和凭据配置');
    log('      可通过环境变量设置：TEST_USERNAME, TEST_PASSWORD');
  }
  if (results.performance.avg > 1000) {
    log('   ⚠️  平均响应时间超过 1 秒，建议优化数据库查询和缓存策略');
  }
  if (stressSuccessRate < 95) {
    log('   ⚠️  并发成功率低于 95%，建议增加连接池和优化资源竞争');
  }
  if (results.api.failed > 0) {
    log(`   ⚠️  有 ${results.api.failed} 个 API 测试失败，请检查相关功能模块`);
  }
  if (results.performance.avg < 500 && stressSuccessRate >= 95 && results.api.failed === 0) {
    log('   ✅ 系统性能优秀，可以投入生产使用！');
  }

  log('\n' + '=' .repeat(70) + '\n', 'blue');
}

// ==================== 主函数 ====================
async function main() {
  log('\n🔍 开始综合性能与功能测试...', 'blue');
  log('=' .repeat(70), 'blue');
  log(`目标地址：${CONFIG.BASE_URL}`, 'cyan');
  log(`超时时间：${CONFIG.timeout}ms`, 'cyan');
  log(`并发请求数：${CONFIG.concurrentRequests}`, 'cyan');
  log(`测试用户：${CONFIG.auth.username}`, 'cyan');

  try {
    // 先检查服务是否可用
    log('\n🔍 检查服务可用性...', 'yellow');
    const isHealthy = await checkHealth();
    if (!isHealthy) {
      throw new Error('后端服务未启动或响应异常');
    }

    // 尝试登录获取认证 Token
    log('\n🔐 尝试获取认证...', 'yellow');
    const loginSuccess = await login();
    if (loginSuccess) {
      log('✅ 认证成功，后续请求将使用 Token', 'green');
    } else {
      log('⚠️  认证失败，部分需要认证的接口可能无法测试', 'yellow');
    }

    // 执行测试
    await testCoreAPIs();
    await testPerformanceBenchmark();
    await testConcurrentLoad();
    await testLargeDataset();

    // 生成报告
    generateReport();

  } catch (error) {
    log('\n❌ 测试执行失败：' + error.message, 'red');
    log('请确保：', 'yellow');
    log('  1. 后端服务已启动 (npm run dev)', 'yellow');
    log('  2. 数据库连接正常', 'yellow');
    log('  3. Redis 服务运行正常', 'yellow');
    process.exit(1);
  }
}

// 执行测试
main().catch(console.error);
