/**
 * 客户管理模块功能验证脚本
 * 
 * 验证内容：
 * 1. API 端点连通性测试
 * 2. CRUD 操作验证
 * 3. Excel 导入导出验证
 * 4. RFM 分析功能验证
 * 5. 统计接口验证
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const API_PREFIX = '/api/v1'; // 修改为 v1 版本

// 测试账号凭证
const testCredentials = {
  username: 'business_user',
  password: 'Business123',
};

let authToken = '';
let testCustomerId = null;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. 登录获取 Token
async function login() {
  log(colors.cyan, '\n📝 [步骤 1] 登录获取 Token...');
  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/auth/login`, testCredentials);
    authToken = response.data.access_token;
    log(colors.green, '✅ 登录成功！Token 已获取');
    return true;
  } catch (error) {
    log(colors.red, `❌ 登录失败：${error.message}`);
    if (error.response) {
      log(colors.yellow, `状态码：${error.response.status}`);
      log(colors.yellow, `响应：${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

// 2. 测试客户列表 API
async function testGetCustomers() {
  log(colors.cyan, '\n📋 [步骤 2] 测试获取客户列表...');
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/customers`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, limit: 5 },
    });
    
    const { data, total } = response.data;
    log(colors.green, `✅ 获取客户列表成功！`);
    log(colors.blue, `   总数：${total}`);
    log(colors.blue, `   返回数量：${data.length}`);
    
    if (data.length > 0) {
      log(colors.blue, `   示例客户：${data[0].name} (等级：${data[0].level})`);
    }
    
    return data.length > 0;
  } catch (error) {
    log(colors.red, `❌ 获取客户列表失败：${error.message}`);
    if (error.response?.status === 403) {
      log(colors.yellow, `   权限不足，请检查用户角色`);
    }
    return false;
  }
}

// 3. 测试统计数据 API
async function testStatistics() {
  log(colors.cyan, '\n📊 [步骤 3] 测试统计接口...');
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/customers/statistics`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const stats = response.data;
    log(colors.green, `✅ 统计数据获取成功！`);
    log(colors.blue, `   总客户数：${stats.total}`);
    log(colors.blue, `   活跃客户：${stats.activeCount}`);
    log(colors.blue, `   平均资产：¥${stats.avgAssets?.toLocaleString()}`);
    
    if (stats.levelStats?.length > 0) {
      log(colors.blue, `   等级分布：${stats.levelStats.map(s => `${s.level}:${s.count}`).join(', ')}`);
    }
    
    return true;
  } catch (error) {
    log(colors.red, `❌ 统计接口失败：${error.message}`);
    return false;
  }
}

// 4. 测试创建客户
async function testCreateCustomer() {
  log(colors.cyan, '\n➕ [步骤 4] 测试创建客户...');
  const newCustomer = {
    name: `测试客户_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    phone: `138${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
    gender: 'M',
    age: 30,
    city: '上海',
    province: '上海市',
    totalAssets: 500000,
    monthlyIncome: 20000,
    annualSpend: 100000,
    orderCount: 50,
    productCount: 10,
    registerDays: 365,
    lastLoginDays: 7,
    level: 'GOLD',
    riskLevel: 'LOW',
    isActive: true,
    remarks: '功能验证测试数据',
  };
  
  try {
    const response = await axios.post(`${BASE_URL}${API_PREFIX}/customers`, newCustomer, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    testCustomerId = response.data.id;
    log(colors.green, `✅ 创建客户成功！ID: ${testCustomerId}`);
    log(colors.blue, `   姓名：${response.data.name}`);
    log(colors.blue, `   等级：${response.data.level}`);
    log(colors.blue, `   风险：${response.data.riskLevel}`);
    return true;
  } catch (error) {
    log(colors.red, `❌ 创建客户失败：${error.message}`);
    if (error.response) {
      log(colors.yellow, `   状态码：${error.response.status}`);
      log(colors.yellow, `   错误信息：${JSON.stringify(error.response.data.message)}`);
    }
    return false;
  }
}

// 5. 测试更新客户
async function testUpdateCustomer() {
  if (!testCustomerId) {
    log(colors.yellow, '⏭️  跳过更新测试（无测试客户 ID）');
    return false;
  }
  
  log(colors.cyan, `\n✏️  [步骤 5] 测试更新客户...`);
  try {
    const updateData = {
      annualSpend: 150000,
      orderCount: 75,
      remarks: '已更新 - 功能验证测试',
    };
    
    const response = await axios.put(`${BASE_URL}${API_PREFIX}/customers/${testCustomerId}`, updateData, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    log(colors.green, `✅ 更新客户成功！`);
    log(colors.blue, `   年消费：¥${response.data.annualSpend?.toLocaleString()}`);
    log(colors.blue, `   订单数：${response.data.orderCount}`);
    return true;
  } catch (error) {
    log(colors.red, `❌ 更新客户失败：${error.message}`);
    return false;
  }
}

// 6. 测试 RFM 分析
async function testRfmAnalysis() {
  log(colors.cyan, '\n🎯 [步骤 6] 测试 RFM 分析...');
  try {
    // 测试 RFM 汇总
    const summaryResponse = await axios.get(`${BASE_URL}${API_PREFIX}/customers/rfm-summary`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    const summary = summaryResponse.data;
    log(colors.green, `✅ RFM 汇总获取成功！`);
    log(colors.blue, `   分析客户数：${summary.totalCustomers}`);
    log(colors.blue, `   平均 R 值：${summary.avgRecency} 天`);
    log(colors.blue, `   平均 F 值：${summary.avgFrequency} 次`);
    log(colors.blue, `   平均 M 值：¥${summary.avgMonetary?.toLocaleString()}`);
    log(colors.blue, `   高价值客户占比：${(summary.highValueRatio * 100).toFixed(1)}%`);
    
    if (Object.keys(summary.segmentDistribution || {}).length > 0) {
      log(colors.blue, `   价值分布：`);
      Object.entries(summary.segmentDistribution).forEach(([segment, count]) => {
        log(colors.blue, `     - ${segment}: ${count}人`);
      });
    }
    
    // 测试 RFM 列表
    const listResponse = await axios.get(`${BASE_URL}${API_PREFIX}/customers/rfm-analysis`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, limit: 3 },
    });
    
    const { data: rfmData, total } = listResponse.data;
    log(colors.green, `✅ RFM 分析列表获取成功！共 ${total} 条记录`);
    
    if (rfmData.length > 0) {
      const sample = rfmData[0];
      log(colors.blue, `   示例 - ${sample.customerName}:`);
      log(colors.blue, `     R 分数：${sample.rScore}, F 分数：${sample.fScore}, M 分数：${sample.mScore}`);
      log(colors.blue, `     总分：${sample.totalScore}`);
      log(colors.blue, `     分类：${sample.customerSegment}`);
      log(colors.blue, `     策略：${sample.strategy.substring(0, 30)}...`);
    }
    
    return true;
  } catch (error) {
    log(colors.red, `❌ RFM 分析失败：${error.message}`);
    if (error.response) {
      log(colors.yellow, `   状态码：${error.response.status}`);
      log(colors.yellow, `   错误信息：${JSON.stringify(error.response.data)}`);
      log(colors.yellow, `   请求路径：${error.config?.url}`);
    }
    if (error.response?.status === 404) {
      log(colors.yellow, `   RFM 端点可能未正确注册`);
    }
    return false;
  }
}

// 7. 测试高价值客户
async function testHighValueCustomers() {
  log(colors.cyan, '\n⭐ [步骤 7] 测试高价值客户查询...');
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/customers/rfm-high-value`, {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { limit: 5 },
    });
    
    const customers = response.data;
    log(colors.green, `✅ 高价值客户获取成功！共 ${customers.length} 位`);
    
    if (customers.length > 0) {
      customers.forEach((c, i) => {
        log(colors.blue, `   ${i + 1}. ${c.customerName} (总分：${c.totalScore}, 分类：${c.customerSegment})`);
      });
    }
    
    return true;
  } catch (error) {
    log(colors.red, `❌ 高价值客户查询失败：${error.message}`);
    return false;
  }
}

// 8. 测试删除客户
async function testDeleteCustomer() {
  if (!testCustomerId) {
    log(colors.yellow, '⏭️  跳过删除测试（无测试客户 ID）');
    return false;
  }
  
  log(colors.cyan, `\n🗑️  [步骤 8] 测试删除客户...`);
  try {
    await axios.delete(`${BASE_URL}${API_PREFIX}/customers/${testCustomerId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    
    log(colors.green, `✅ 删除客户成功！ID: ${testCustomerId}`);
    return true;
  } catch (error) {
    log(colors.red, `❌ 删除客户失败：${error.message}`);
    return false;
  }
}

// 9. 测试 Excel 导出（模拟）
async function testExcelExport() {
  log(colors.cyan, '\n📥 [步骤 9] 测试 Excel 导出接口...');
  try {
    const response = await axios.get(`${BASE_URL}${API_PREFIX}/customers/export`, {
      headers: { Authorization: `Bearer ${authToken}` },
      responseType: 'arraybuffer',
    });
    
    const fileSize = response.data.byteLength;
    log(colors.green, `✅ Excel 导出成功！文件大小：${(fileSize / 1024).toFixed(2)} KB`);
    return true;
  } catch (error) {
    // 如果导出接口不存在，跳过此测试
    if (error.response?.status === 404) {
      log(colors.yellow, `⚠️  Excel 导出接口未实现（可选功能）`);
      return false;
    }
    log(colors.red, `❌ Excel 导出失败：${error.message}`);
    return false;
  }
}

// 主测试流程
async function runTests() {
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.cyan, '       🚀 客户管理模块功能验证开始');
  log(colors.cyan, '='.repeat(60));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
  };
  
  const tests = [
    { name: '登录认证', fn: login },
    { name: '获取客户列表', fn: testGetCustomers },
    { name: '统计接口', fn: testStatistics },
    { name: '创建客户', fn: testCreateCustomer },
    { name: '更新客户', fn: testUpdateCustomer },
    { name: 'RFM 分析', fn: testRfmAnalysis },
    { name: '高价值客户', fn: testHighValueCustomers },
    { name: '删除客户', fn: testDeleteCustomer },
    { name: 'Excel 导出', fn: testExcelExport },
  ];
  
  for (const test of tests) {
    results.total++;
    try {
      const result = await test.fn();
      if (result === true) {
        results.passed++;
      } else if (result === false) {
        results.failed++;
      } else {
        results.skipped++;
      }
      await sleep(300); // 避免请求过快
    } catch (error) {
      results.failed++;
      log(colors.red, `❌ ${test.name} 测试异常：${error.message}`);
    }
  }
  
  // 输出测试报告
  log(colors.cyan, '\n' + '='.repeat(60));
  log(colors.cyan, '       📊 测试报告');
  log(colors.cyan, '='.repeat(60));
  log(colors.blue, `   总测试数：${results.total}`);
  log(colors.green, `   ✅ 通过：${results.passed}`);
  log(colors.red, `   ❌ 失败：${results.failed}`);
  log(colors.yellow, `   ⏭️  跳过/警告：${results.skipped}`);
  log(colors.cyan, '='.repeat(60));
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  if (results.failed === 0) {
    log(colors.green, `\n🎉 所有测试通过！成功率：${successRate}%`);
  } else {
    log(colors.yellow, `\n⚠️  部分测试失败，成功率：${successRate}%`);
  }
  
  return results.failed === 0;
}

// 执行测试
runTests()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('测试执行出错:', error);
    process.exit(1);
  });
