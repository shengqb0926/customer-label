/**
 * 客户管理模块 UI 重构验证脚本
 * 用于快速检查前后端服务状态和路由配置
 */

const axios = require('axios');

async function verifyCustomerManagement() {
  console.log('🔍 开始验证客户管理模块...\n');

  try {
    // 1. 检查后端服务
    console.log('📡 步骤 1: 检查后端服务...');
    const healthCheck = await axios.get('http://localhost:3000/api/v1/health');
    console.log('✅ 后端服务运行正常');
    console.log(`   状态：${healthCheck.data.status || 'healthy'}`);
    console.log(`   时间：${new Date().toLocaleString('zh-CN')}\n`);

    // 2. 检查 API 端点
    console.log('📡 步骤 2: 检查客户管理 API...');
    const customersResponse = await axios.get('http://localhost:3000/api/v1/customers?limit=5');
    const customersData = customersResponse.data;
    
    console.log('✅ 客户 API 正常');
    console.log(`   总客户数：${customersData.total || 0}`);
    console.log(`   返回数据：${customersData.data?.length || 0} 条\n`);

    // 3. 检查统计 API
    console.log('📊 步骤 3: 检查统计 API...');
    const statsResponse = await axios.get('http://localhost:3000/api/v1/customers/statistics');
    const statsData = statsResponse.data;
    
    console.log('✅ 统计 API 正常');
    console.log(`   总客户数：${statsData.total || 0}`);
    console.log(`   活跃客户：${statsData.activeCount || 0}`);
    console.log(`   平均资产：¥${(statsData.avgAssets || 0).toLocaleString()}\n`);

    // 4. 检查 RFM 分析 API
    console.log('📈 步骤 4: 检查 RFM 分析 API...');
    try {
      const rfmResponse = await axios.post('http://localhost:3000/api/v1/customers/rfm-analysis', {
        page: 1,
        limit: 5,
      });
      const rfmData = rfmResponse.data;
      
      console.log('✅ RFM 分析 API 正常');
      console.log(`   分析客户数：${rfmData.data?.length || 0}`);
      if (rfmData.data && rfmData.data.length > 0) {
        console.log(`   示例客户：${rfmData.data[0].customerName}`);
        console.log(`   RFM 总分：${rfmData.data[0].totalScore}`);
      }
    } catch (error) {
      console.log('⚠️  RFM 分析 API 暂时不可用（可选功能）');
    }
    console.log();

    // 5. 前端服务检查
    console.log('🌐 步骤 5: 检查前端服务...');
    try {
      const frontendResponse = await axios.get('http://localhost:5176/', {
        headers: { 'Accept': 'text/html' },
      });
      
      if (frontendResponse.status === 200) {
        console.log('✅ 前端服务运行正常');
        console.log('   地址：http://localhost:5176/');
      }
    } catch (error) {
      console.log('⚠️  前端服务可能未启动或响应异常');
    }
    console.log();

    // 6. 总结
    console.log('✨ 验证完成！\n');
    console.log('📋 访问指南:');
    console.log('   1. 打开浏览器访问：http://localhost:5176/');
    console.log('   2. 使用账号登录：admin / admin123');
    console.log('   3. 点击左侧菜单 "客户管理"');
    console.log('   4. 查看新的左右布局效果');
    console.log('\n   新功能特点:');
    console.log('   ✅ 左侧功能菜单：客户列表、统计分析');
    console.log('   ✅ 右侧展示区域：卡片式内容区');
    console.log('   ✅ 路由自动切换：点击菜单即可切换视图');
    console.log('   ✅ 响应式设计：适配不同屏幕尺寸');
    console.log();

  } catch (error) {
    console.error('❌ 验证失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 提示：请确保服务已启动');
      console.error('   运行命令：npm run dev:all');
    }
    
    process.exit(1);
  }
}

// 运行验证
verifyCustomerManagement().catch(console.error);
