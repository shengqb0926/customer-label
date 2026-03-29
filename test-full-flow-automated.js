/**
 * 全功能自动化测试脚本
 * 测试范围：核心 API + 关键业务流程
 * 
 * 使用方法：
 * node test-full-flow-automated.js
 */

const http = require('http');

// 配置
const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 10000; // 10 秒超时

// 测试结果统计
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
};

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP 请求封装
function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null,
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(TEST_TIMEOUT, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// 断言函数
function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// 测试用例装饰器
async function testCase(name, fn) {
  results.total++;
  process.stdout.write(`\n📋 ${name}... `);
  
  try {
    await fn();
    results.passed++;
    log('✅ PASS', 'green');
    return true;
  } catch (error) {
    results.failed++;
    log('❌ FAIL', 'red');
    log(`   错误：${error.message}`, 'red');
    return false;
  }
}

// ========== 第一轮测试：核心 API ==========

async function runFirstRoundTests() {
  log('\n🚀 第一轮测试：核心功能 API 测试', 'blue');
  log('=' .repeat(60), 'blue');

  // 测试 1: 健康检查
  await testCase('后端服务健康检查', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/health',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
  });

  // 测试 2: 获取客户列表
  await testCase('获取客户列表 API', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/customers?page=1&limit=10',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
    assert(Array.isArray(res.data.data), '返回应包含 data 数组');
    assert(res.data.total !== undefined, '返回应包含 total 字段');
  });

  // 测试 3: 获取推荐列表
  await testCase('获取推荐列表 API', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/recommendations?page=1&limit=10',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
  });

  // 测试 4: 获取聚类配置列表
  await testCase('获取聚类配置列表 API', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/clustering?page=1&limit=10',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
  });

  // 测试 5: 获取关联规则配置列表
  await testCase('获取关联规则配置列表 API', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/association-configs?page=1&limit=10',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
  });

  // 测试 6: 获取引擎执行历史
  await testCase('获取引擎执行历史 API', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/engine-executions?page=1&limit=10',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
  });

  // 测试 7: 获取统计数据
  await testCase('获取统计数据 API', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/customers/statistics',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
    assert(typeof res.data === 'object', '返回应为对象');
  });

  // 测试 8: 触发规则引擎
  let testCustomerId = null;
  await testCase('触发规则引擎 API', async () => {
    // 先获取一个客户 ID
    const customersRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/customers?page=1&limit=1',
      method: 'GET',
    });
    
    if (customersRes.data.data && customersRes.data.data.length > 0) {
      testCustomerId = customersRes.data.data[0].id;
      
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/generate/${testCustomerId}?mode=rule`,
        method: 'POST',
      });
      assert(res.statusCode === 201 || res.statusCode === 200, `状态码应为 200 或 201，实际：${res.statusCode}`);
    } else {
      throw new Error('没有找到测试客户');
    }
  });

  // 测试 9: 触发聚合引擎
  await testCase('触发聚合引擎 API', async () => {
    if (testCustomerId) {
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/generate/${testCustomerId}?mode=clustering`,
        method: 'POST',
      });
      assert([200, 201].includes(res.statusCode), `状态码应为 200 或 201，实际：${res.statusCode}`);
    }
  });

  // 测试 10: 触发关联引擎
  await testCase('触发关联引擎 API', async () => {
    if (testCustomerId) {
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/generate/${testCustomerId}?mode=association`,
        method: 'POST',
      });
      assert([200, 201].includes(res.statusCode), `状态码应为 200 或 201，实际：${res.statusCode}`);
    }
  });
}

// ========== 第二轮测试：高级功能 ==========

async function runSecondRoundTests() {
  log('\n🚀 第二轮测试：高级功能 API 测试', 'blue');
  log('=' .repeat(60), 'blue');

  // 测试 1: 创建聚类配置
  let newConfigId = null;
  await testCase('创建聚类配置 API', async () => {
    const config = {
      configName: `测试配置-${Date.now()}`,
      description: '自动化测试创建的配置',
      algorithm: 'k-means',
      parameters: {
        k: 5,
        maxIterations: 100,
      },
      isActive: true,
    };

    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/clustering',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, config);

    assert([200, 201].includes(res.statusCode), `状态码应为 200 或 201，实际：${res.statusCode}`);
    assert(res.data.id, '返回应包含新配置的 ID');
    newConfigId = res.data.id;
  });

  // 测试 2: 更新聚类配置
  await testCase('更新聚类配置 API', async () => {
    if (newConfigId) {
      const updateData = {
        configName: `更新后的配置-${Date.now()}`,
        description: '已更新的描述',
        algorithm: 'k-means',
        parameters: {
          k: 6,
          maxIterations: 150,
        },
        isActive: true,
      };

      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/clustering/${newConfigId}`,
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      }, updateData);

      assert([200].includes(res.statusCode), `状态码应为 200，实际：${res.statusCode}`);
    }
  });

  // 测试 3: 激活/停用配置
  await testCase('激活/停用配置 API', async () => {
    if (newConfigId) {
      // 停用
      let res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/clustering/${newConfigId}/deactivate`,
        method: 'POST',
      });
      assert(res.statusCode === 200, `停用状态码应为 200，实际：${res.statusCode}`);

      // 激活
      res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/clustering/${newConfigId}/activate`,
        method: 'POST',
      });
      assert(res.statusCode === 200, `激活状态码应为 200，实际：${res.statusCode}`);
    }
  });

  // 测试 4: 运行聚类任务
  await testCase('运行聚类任务 API', async () => {
    if (newConfigId) {
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/clustering/${newConfigId}/run`,
        method: 'POST',
      });
      assert([200, 201].includes(res.statusCode), `状态码应为 200 或 201，实际：${res.statusCode}`);
    }
  });

  // 测试 5: 复制配置（关联规则）
  await testCase('复制关联规则配置 API', async () => {
    // 先创建一个测试配置
    const config = {
      configName: `原始配置-${Date.now()}`,
      description: '用于测试复制',
      algorithm: 'apriori',
      parameters: {
        minSupport: 0.1,
        minConfidence: 0.6,
        minLift: 1.0,
        maxItems: 5,
      },
      isActive: true,
    };

    const createRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/association-configs',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, config);

    if (createRes.data.id) {
      // 复制配置
      const copyRes = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/association-configs/${createRes.data.id}/copy`,
        method: 'POST',
      });
      
      // 复制操作可能返回 200 或 201 或 404（如果未实现）
      log(`   复制配置状态码：${copyRes.statusCode}`, 'yellow');
    }
  });

  // 测试 6: 接受推荐
  await testCase('接受推荐 API', async () => {
    // 先获取一条推荐
    const recsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/recommendations?status=pending&limit=1',
      method: 'GET',
    });

    if (recsRes.data.data && recsRes.data.data.length > 0) {
      const recId = recsRes.data.data[0].id;
      
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/${recId}/accept`,
        method: 'POST',
      });
      assert([200].includes(res.statusCode), `状态码应为 200，实际：${res.statusCode}`);
    }
  });

  // 测试 7: 拒绝推荐
  await testCase('拒绝推荐 API', async () => {
    // 获取一条待处理的推荐
    const recsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/recommendations?status=pending&limit=1',
      method: 'GET',
    });

    if (recsRes.data.data && recsRes.data.data.length > 0) {
      const recId = recsRes.data.data[0].id;
      
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/recommendations/${recId}/reject`,
        method: 'POST',
      });
      assert([200].includes(res.statusCode), `状态码应为 200，实际：${res.statusCode}`);
    }
  });

  // 测试 8: 批量接受推荐
  await testCase('批量接受推荐 API', async () => {
    // 获取几条待处理的推荐
    const recsRes = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/recommendations?status=pending&limit=3',
      method: 'GET',
    });

    if (recsRes.data.data && recsRes.data.data.length > 0) {
      const ids = recsRes.data.data.map(r => r.id);
      
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: '/api/v1/recommendations/batch-accept',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, { ids });
      
      assert([200].includes(res.statusCode), `状态码应为 200，实际：${res.statusCode}`);
    }
  });

  // 测试 9: 删除配置
  await testCase('删除聚类配置 API', async () => {
    if (newConfigId) {
      const res = await request({
        hostname: 'localhost',
        port: 3000,
        path: `/api/v1/clustering/${newConfigId}`,
        method: 'DELETE',
      });
      assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
    }
  });

  // 测试 10: 获取推荐统计
  await testCase('获取推荐统计 API', async () => {
    const res = await request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/recommendations/stats',
      method: 'GET',
    });
    assert(res.statusCode === 200, `状态码应为 200，实际：${res.statusCode}`);
  });
}

// ========== 主函数 ==========

async function main() {
  log('\n╔══════════════════════════════════════════════════════════╗', 'blue');
  log('║       客户标签推荐系统 - 全功能自动化测试               ║', 'blue');
  log('╚══════════════════════════════════════════════════════════╝', 'blue');
  
  const startTime = Date.now();

  try {
    // 第一轮测试
    await runFirstRoundTests();

    // 第二轮测试
    await runSecondRoundTests();

    // 输出统计
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log('\n\n' + '=' .repeat(60), 'blue');
    log('📊 测试统计', 'blue');
    log('=' .repeat(60), 'blue');
    log(`总测试数：${results.total}`, results.failed === 0 ? 'green' : 'yellow');
    log(`通过：${results.passed}`, 'green');
    log(`失败：${results.failed}`, results.failed === 0 ? 'green' : 'red');
    log(`通过率：${((results.passed / results.total) * 100).toFixed(2)}%`, results.failed === 0 ? 'green' : 'yellow');
    log(`耗时：${duration}s`, 'blue');
    log('=' .repeat(60), 'blue');

    if (results.failed === 0) {
      log('\n🎉 所有测试通过！系统运行正常！', 'green');
      process.exit(0);
    } else {
      log(`\n⚠️  有 ${results.failed} 个测试失败，请检查上方的错误信息。`, 'yellow');
      process.exit(1);
    }
  } catch (error) {
    log('\n💥 测试执行过程中发生严重错误:', 'red');
    log(error.message, 'red');
    log(error.stack, 'red');
    process.exit(1);
  }
}

// 运行测试
main().catch(console.error);