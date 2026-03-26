#!/usr/bin/env node

/**
 * 系统功能快速验证脚本
 * 
 * 使用方法:
 *   node quick-verify.cjs
 * 
 * 前提条件:
 *   - 应用服务器已启动 (http://localhost:3000)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';
let accessToken = '';

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

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// HTTP GET 请求
function getRequest(url, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    }).on('error', reject);
  });
}

// HTTP POST 请求
function postRequest(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    const options = {
      hostname: new URL(url).hostname,
      port: new URL(url).port || 80,
      path: new URL(url).pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTests() {
  log('\n========================================', 'cyan');
  log('  客户标签智能推荐系统 - 功能验证', 'cyan');
  log('========================================\n', 'cyan');

  let passed = 0;
  let failed = 0;

  // 测试 1: 健康检查
  info('[1/8] 测试健康检查...');
  try {
    const res = await getRequest(`${BASE_URL}/health`);
    if (res.status === 200 && res.data.status === 'ok') {
      success('健康检查通过');
      passed++;
    } else {
      error(`健康检查失败：${res.status}`);
      failed++;
    }
  } catch (err) {
    error(`健康检查异常：${err.message}`);
    failed++;
  }

  // 测试 2: 就绪检查
  info('[2/8] 测试就绪检查...');
  try {
    const res = await getRequest(`${BASE_URL}/ready`);
    if (res.status === 200) {
      success('就绪检查通过');
      passed++;
    } else {
      error(`就绪检查失败：${res.status}`);
      failed++;
    }
  } catch (err) {
    error(`就绪检查异常：${err.message}`);
    failed++;
  }

  // 测试 3: Prometheus 指标
  info('[3/8] 测试 Prometheus 指标...');
  try {
    const res = await getRequest(`${BASE_URL}/metrics`);
    if (res.status === 200 && res.data.includes('nodejs')) {
      success('Prometheus 指标采集正常');
      passed++;
    } else {
      error(`Prometheus 指标异常：${res.status}`);
      failed++;
    }
  } catch (err) {
    error(`Prometheus 指标异常：${err.message}`);
    failed++;
  }

  // 测试 4: 用户登录
  info('[4/8] 测试用户登录...');
  try {
    const res = await postRequest(`${BASE_URL}/api/v1/auth/login`, {
      username: 'admin',
      password: 'admin123',
    });
    if (res.status === 200 && res.data.access_token) {
      success('用户登录成功');
      accessToken = res.data.access_token;
      passed++;
      log(`   Token: ${accessToken.substring(0, 50)}...`);
    } else {
      error(`用户登录失败：${res.status}`);
      console.log('响应:', res.data);
      failed++;
    }
  } catch (err) {
    error(`用户登录异常：${err.message}`);
    failed++;
  }

  // 测试 5: 获取当前用户信息
  info('[5/8] 测试获取当前用户信息...');
  if (accessToken) {
    try {
      const res = await getRequest(`${BASE_URL}/api/v1/auth/me`, {
        'Authorization': `Bearer ${accessToken}`,
      });
      if (res.status === 200 && res.data.user) {
        success('获取当前用户信息成功');
        log(`   用户：${res.data.user.username} (${res.data.user.roles.join(', ')})`);
        passed++;
      } else {
        error(`获取用户信息失败：${res.status}`);
        failed++;
      }
    } catch (err) {
      error(`获取用户信息异常：${err.message}`);
      failed++;
    }
  } else {
    error('跳过（无有效 Token）');
    failed++;
  }

  // 测试 6: 获取推荐标签列表
  info('[6/8] 测试获取推荐标签列表...');
  if (accessToken) {
    try {
      const res = await getRequest(`${BASE_URL}/api/v1/recommendations`, {
        'Authorization': `Bearer ${accessToken}`,
      });
      if (res.status === 200) {
        success('获取推荐标签列表成功');
        if (Array.isArray(res.data)) {
          log(`   标签数量：${res.data.length}`);
        }
        passed++;
      } else {
        error(`获取推荐标签失败：${res.status}`);
        failed++;
      }
    } catch (err) {
      error(`获取推荐标签异常：${err.message}`);
      failed++;
    }
  } else {
    error('跳过（无有效 Token）');
    failed++;
  }

  // 测试 7: 获取标签评分统计
  info('[7/8] 测试获取标签评分统计...');
  if (accessToken) {
    try {
      const res = await getRequest(`${BASE_URL}/api/v1/scores/stats`, {
        'Authorization': `Bearer ${accessToken}`,
      });
      if (res.status === 200) {
        success('获取标签评分统计成功');
        log(`   总标签数：${res.data.total || 0}`);
        log(`   平均评分：${res.data.avgOverallScore || 0}`);
        passed++;
      } else {
        error(`获取评分统计失败：${res.status}`);
        failed++;
      }
    } catch (err) {
      error(`获取评分统计异常：${err.message}`);
      failed++;
    }
  } else {
    error('跳过（无有效 Token）');
    failed++;
  }

  // 测试 8: Swagger 文档可访问
  info('[8/8] 测试 Swagger 文档...');
  try {
    const res = await getRequest(`${BASE_URL}/api/docs`);
    if (res.status === 200) {
      success('Swagger 文档可访问');
      passed++;
    } else {
      error(`Swagger 文档访问失败：${res.status}`);
      failed++;
    }
  } catch (err) {
    error(`Swagger 文档访问异常：${err.message}`);
    failed++;
  }

  // 总结
  log('\n========================================', 'cyan');
  log('  测试总结', 'cyan');
  log('========================================', 'cyan');
  success(`通过：${passed} 项`);
  if (failed > 0) {
    error(`失败：${failed} 项`);
  }
  log(`总计：${passed + failed} 项`, 'cyan');
  log('========================================\n', 'cyan');

  if (failed === 0) {
    log('🎉 所有测试通过！系统运行正常！\n', 'green');
    process.exit(0);
  } else {
    log('⚠️  部分测试失败，请检查系统配置和日志。\n', 'yellow');
    process.exit(1);
  }
}

// 运行测试
runTests().catch(err => {
  error(`执行异常：${err.message}`);
  console.error(err);
  process.exit(1);
});
