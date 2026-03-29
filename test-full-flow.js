/**
 * 完整流程测试：从客户生成到推荐结果展现
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testFullFlow() {
  try {
    // ==================== 步骤 1: 登录获取 Token ====================
    console.log('\n🔐 步骤 1: 登录获取 Token');
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      username: 'business_user',
      password: 'Business123',
    });
    
    const token = loginRes.data.access_token;
    console.log('✅ Token 获取成功\n');
    
    const headers = { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // ==================== 步骤 2: 批量生成随机客户 ====================
    console.log('📊 步骤 2: 批量生成随机客户数据（50 个）');
    let generateRes;
    try {
      generateRes = await axios.post(
        `${API_BASE}/customers/generate`,
        { count: 50 }, // 生成 50 个随机客户
        { headers }
      );
      console.log(`✅ 成功生成 ${generateRes.data.length} 个客户`);
      console.log(`   示例客户：${generateRes.data[0]?.name} (ID: ${generateRes.data[0]?.id})\n`);
    } catch (error) {
      console.error('❌ 生成客户失败:', error.response?.data || error.message);
      console.log('   提示：如果已存在客户数据，可跳过此步骤\n');
    }

    // ==================== 步骤 3: 获取客户列表 ====================
    console.log('📋 步骤 3: 获取客户列表');
    const customersRes = await axios.get(
      `${API_BASE}/customers`,
      { 
        headers,
        params: { page: 1, limit: 10 }
      }
    );
    console.log(`✅ 获取到 ${customersRes.data.total} 个客户`);
    console.log(`   当前页显示 ${customersRes.data.data.length} 个客户\n`);

    // 选取第一个客户进行测试
    const testCustomer = customersRes.data.data[0];
    if (!testCustomer) {
      console.log('⚠️  没有找到客户，请先执行步骤 2 生成客户');
      return;
    }
    
    console.log(`🎯 选择测试客户：${testCustomer.name} (ID: ${testCustomer.id})`);
    console.log(`   总资产：¥${testCustomer.totalAssets?.toLocaleString()}`);
    console.log(`   月收入：¥${testCustomer.monthlyIncome?.toLocaleString()}`);
    console.log(`   年消费：¥${testCustomer.annualSpend?.toLocaleString()}\n`);

    // ==================== 步骤 4: 为该客户生成推荐 ====================
    console.log('💡 步骤 4: 为客户生成智能推荐');
    try {
      const recommendRes = await axios.post(
        `${API_BASE}/recommendations/generate/${testCustomer.id}`,
        {},
        { headers }
      );
      
      console.log(`✅ ${recommendRes.data.message}`);
      console.log(`   状态：${recommendRes.data.status}\n`);
      
      // 等待 2 秒后查询实际生成的推荐
      console.log('⏳ 等待推荐计算完成...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 查询该客户的推荐
      const customerRecsRes = await axios.get(
        `${API_BASE}/recommendations/customer/${testCustomer.id}`,
        { headers }
      );
      
      if (customerRecsRes.data.length > 0) {
        console.log(`\n📊 为该客户生成了 ${customerRecsRes.data.length} 条推荐:`);
        customerRecsRes.data.forEach((rec, index) => {
          console.log(`   ${index + 1}. [${rec.tagCategory}] ${rec.tagName}`);
          console.log(`      置信度：${(rec.confidence * 100).toFixed(1)}%`);
          console.log(`      来源：${rec.source}`);
          console.log(`      理由：${rec.reason}`);
        });
      } else {
        console.log('⚠️  暂未找到该客户的推荐，可能需要更长时间计算\n');
      }
    } catch (error) {
      console.error('❌ 生成推荐失败:', error.response?.data || error.message);
    }
    
    console.log('\n');

    // ==================== 步骤 5: 查询推荐列表（不分客户） ====================
    console.log('📋 步骤 5: 查询所有推荐列表（最新 10 条）');
    const allRecommendationsRes = await axios.get(
      `${API_BASE}/recommendations`,
      { 
        headers,
        params: { page: 1, limit: 10 }
      }
    );
    
    console.log(`✅ 共有 ${allRecommendationsRes.data.total} 条推荐`);
    console.log(`   当前页显示 ${allRecommendationsRes.data.data.length} 条\n`);
    
    if (allRecommendationsRes.data.data.length > 0) {
      console.log('📊 最新推荐列表:');
      allRecommendationsRes.data.data.forEach((rec, index) => {
        const statusTag = rec.status === 'accepted' ? '✅' : rec.status === 'rejected' ? '❌' : '⏳';
        console.log(`   ${statusTag} ${index + 1}. [客户${rec.customerId}] ${rec.tagName} (${rec.tagCategory})`);
        console.log(`      状态：${rec.status} | 置信度：${(rec.confidence * 100).toFixed(1)}%`);
      });
    }
    console.log('\n');

    // ==================== 步骤 6: 查看推荐统计 ====================
    console.log('📈 步骤 6: 查看推荐统计信息');
    const statsRes = await axios.get(
      `${API_BASE}/recommendations/stats`,
      { headers }
    );
    
    console.log('✅ 推荐统计:');
    console.log(`   总推荐数：${statsRes.data.total}`);
    console.log(`   平均置信度：${(statsRes.data.avgConfidence * 100).toFixed(1)}%`);
    console.log('   按来源分布:');
    Object.entries(statsRes.data.bySource).forEach(([source, count]) => {
      console.log(`     - ${source}: ${count}条`);
    });
    console.log('\n');

    // ==================== 步骤 7: 接受/拒绝推荐测试 ====================
    if (allRecommendationsRes.data.data.length > 0) {
      const firstRec = allRecommendationsRes.data.data[0];
      console.log(`🎯 步骤 7: 测试接受/拒绝推荐（以第 1 条为例）`);
      console.log(`   推荐 ID: ${firstRec.id}, 标签：${firstRec.tagName}`);
      
      try {
        // 测试接受推荐
        const acceptRes = await axios.post(
          `${API_BASE}/recommendations/${firstRec.id}/accept`,
          {},
          { headers }
        );
        console.log(`✅ 成功接受推荐，新状态：${acceptRes.data.status}`);
      } catch (error) {
        console.error('❌ 接受推荐失败:', error.response?.data || error.message);
      }
    }
    console.log('\n');

    // ==================== 总结 ====================
    console.log('='.repeat(60));
    console.log('✅ 完整流程测试完成！');
    console.log('='.repeat(60));
    console.log('\n📝 前端操作步骤:');
    console.log('   1. 访问 http://localhost:5176 登录系统');
    console.log('   2. 进入【客户管理】页面');
    console.log('      - 点击【批量导入】或等待自动生成客户');
    console.log('      - 查看客户列表和详情');
    console.log('   3. 进入【推荐管理】页面');
    console.log('      - 系统会自动显示所有客户的推荐列表');
    console.log('      - 可以筛选、搜索、查看详情');
    console.log('      - 点击 ✓ 接受推荐 或 ✗ 拒绝推荐');
    console.log('      - 支持批量操作（勾选多条后批量接受/拒绝）');
    console.log('\n💡 提示:');
    console.log('   - 推荐生成是自动的，无需手动触发');
    console.log('   - 每次访问客户详情页时可能会触发重新计算');
    console.log('   - 推荐结果会缓存 1 小时');
    console.log('\n');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 提示：请确保后端服务正在运行（端口 3000）');
    }
  }
}

// 执行测试
console.log('\n' + '='.repeat(60));
console.log('🚀 开始执行完整流程测试');
console.log('='.repeat(60));

testFullFlow();
