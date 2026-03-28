const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api/v1';

async function testCustomerModule() {
  console.log('🚀 开始测试客户管理模块...\n');

  try {
    // Test 1: 获取客户列表
    console.log('📋 测试 1: 获取客户列表（分页）');
    const listResponse = await axios.get(`${API_BASE_URL}/customers`, {
      params: { page: 1, limit: 5 },
    });
    console.log(`✅ 成功获取客户列表，总数：${listResponse.data.total}`);
    console.log(`   当前页：${listResponse.data.page}, 每页：${listResponse.data.limit}`);
    console.log(`   前 5 个客户:`);
    listResponse.data.data.slice(0, 5).forEach(c => {
      console.log(`     - ${c.name} (${c.city}, ${c.level}, ¥${Number(c.totalAssets).toLocaleString()})`);
    });
    console.log();

    // Test 2: 获取统计信息
    console.log('📊 测试 2: 获取统计信息');
    const statsResponse = await axios.get(`${API_BASE_URL}/customers/statistics`);
    console.log(`✅ 统计信息:`);
    console.log(`   总客户数：${statsResponse.data.total}`);
    console.log(`   活跃客户：${statsResponse.data.activeCount}`);
    console.log(`   平均资产：¥${Number(statsResponse.data.avgAssets).toLocaleString()}`);
    console.log(`   等级分布:`);
    statsResponse.data.levelStats.forEach(s => {
      console.log(`     - ${s.level}: ${s.count}人`);
    });
    console.log();

    // Test 3: 筛选查询
    console.log('🔍 测试 3: 条件筛选（黄金客户，北京）');
    const filterResponse = await axios.get(`${API_BASE_URL}/customers`, {
      params: {
        level: 'GOLD',
        city: '北京',
        minAssets: 500000,
      },
    });
    console.log(`✅ 找到 ${filterResponse.data.total} 个符合条件的客户`);
    filterResponse.data.data.forEach(c => {
      console.log(`   - ${c.name}: ¥${Number(c.totalAssets).toLocaleString()} (${c.age}岁)`);
    });
    console.log();

    // Test 4: 创建新客户
    console.log('➕ 测试 4: 创建新客户');
    const newCustomer = {
      name: '测试用户',
      email: `test${Date.now()}@example.com`,
      phone: '13800138000',
      gender: 'M',
      age: 30,
      city: '北京',
      totalAssets: 800000,
      monthlyIncome: 40000,
      annualSpend: 240000,
      orderCount: 15,
      productCount: 5,
      registerDays: 365,
      lastLoginDays: 3,
      level: 'GOLD',
      riskLevel: 'LOW',
      isActive: true,
    };
    
    const createResponse = await axios.post(`${API_BASE_URL}/customers`, newCustomer);
    console.log(`✅ 成功创建客户：${createResponse.data.name} (ID: ${createResponse.data.id})`);
    console.log();

    // Test 5: 更新客户
    console.log('✏️  测试 5: 更新客户信息');
    const updateResponse = await axios.put(
      `${API_BASE_URL}/customers/${createResponse.data.id}`,
      { totalAssets: 1000000, remarks: '资产已更新' }
    );
    console.log(`✅ 更新后资产：¥${Number(updateResponse.data.totalAssets).toLocaleString()}`);
    console.log();

    // Test 6: 删除客户
    console.log('🗑️  测试 6: 删除客户');
    await axios.delete(`${API_BASE_URL}/customers/${createResponse.data.id}`);
    console.log(`✅ 已成功删除测试客户\n`);

    console.log('🎉 所有测试通过！客户管理模块运行正常！\n');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    process.exit(1);
  }
}

testCustomerModule();