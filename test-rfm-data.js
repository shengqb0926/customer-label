const axios = require('axios');

async function testRFMData() {
  try {
    console.log('=== 测试 RFM 数据 ===\n');
    
    // 1. 登录获取 token
    console.log('1. 登录...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'admin',
      password: 'admin123'
    });
    const token = loginRes.data.access_token;
    console.log('✅ 登录成功\n');
    
    // 2. 获取 RFM 统计汇总
    console.log('2. 获取 RFM 统计汇总...');
    const rfmSummaryRes = await axios.post('http://localhost:3000/api/v1/customers/rfm-summary', {}, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('\n=== RFM Summary ===');
    console.log(JSON.stringify(rfmSummaryRes.data, null, 2));
    
    // 3. 获取 RFM 分析详情
    console.log('\n3. 获取 RFM 分析详情...');
    const rfmAnalysisRes = await axios.post('http://localhost:3000/api/v1/customers/rfm-analysis', {
      page: 1,
      limit: 100
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('\n=== RFM Analysis ===');
    console.log('Total:', rfmAnalysisRes.data.total);
    console.log('Data count:', rfmAnalysisRes.data.data?.length);
    if (rfmAnalysisRes.data.data && rfmAnalysisRes.data.data.length > 0) {
      console.log('第一条数据:', JSON.stringify(rfmAnalysisRes.data.data[0], null, 2));
    }
    
    // 4. 获取客户统计数据
    console.log('\n4. 获取客户统计数据...');
    const statsRes = await axios.get('http://localhost:3000/api/v1/customers/statistics', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('\n=== Customer Statistics ===');
    console.log('总客户数:', statsRes.data.total);
    console.log('等级分布:', statsRes.data.levelStats);
    console.log('风险分布:', statsRes.data.riskStats);
    
  } catch (error) {
    console.error('\n❌ 错误:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
    }
  }
}

testRFMData();
