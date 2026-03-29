const axios = require('axios');

async function testStatistics() {
  try {
    console.log('=== 测试客户统计 API ===\n');
    
    // 1. 登录获取 token
    console.log('1. 登录...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.access_token;
    console.log('✅ 登录成功\n');
    
    // 2. 获取统计数据
    console.log('2. 获取客户统计数据...');
    const statsRes = await axios.get('http://localhost:3000/api/v1/customers/statistics', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    console.log('\n=== 统计数据 ===');
    console.log(JSON.stringify(statsRes.data, null, 2));
    
    // 3. 检查数据
    const data = statsRes.data;
    console.log('\n=== 数据分析 ===');
    console.log(`总客户数：${data.total}`);
    console.log(`活跃客户：${data.activeCount}`);
    console.log(`平均资产：${data.avgAssets}`);
    console.log(`等级分布：`, data.levelStats);
    console.log(`风险分布：`, data.riskStats);
    console.log(`城市分布：`, data.cityStats?.slice(0, 5));
    
  } catch (error) {
    console.error('\n❌ 错误:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
    }
  }
}

testStatistics();
