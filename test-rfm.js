/**
 * 简化版 RFM 接口测试
 */
const axios = require('axios');

async function testRfm() {
  try {
    // 登录
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'business_user',
      password: 'Business123',
    });
    
    const token = loginRes.data.access_token;
    console.log('✅ Token 获取成功');
    
    // 测试 RFM 汇总
    console.log('\n📊 测试 RFM 汇总...');
    const summaryRes = await axios.get('http://localhost:3000/api/v1/customers/rfm-summary', {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    console.log('✅ RFM 汇总成功！');
    console.log(JSON.stringify(summaryRes.data, null, 2));
    
    // 测试 RFM 列表
    console.log('\n📋 测试 RFM 列表...');
    const listRes = await axios.get('http://localhost:3000/api/v1/customers/rfm-analysis', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, limit: 3 },
    });
    
    console.log('✅ RFM 列表成功！');
    console.log(`总数：${listRes.data.total}`);
    if (listRes.data.data && listRes.data.data.length > 0) {
      console.log('示例:', JSON.stringify(listRes.data.data[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testRfm();
