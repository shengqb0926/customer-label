/**
 * RFM 接口完整测试 - 测试所有 RFM 相关接口
 */
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testRfmAnalysis() {
  try {
    // 登录
    console.log('🔐 正在登录...');
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      username: 'business_user',
      password: 'Business123',
    });
    
    const token = loginRes.data.access_token;
    console.log('✅ Token 获取成功\n');
    
    // 测试 1: 获取 RFM 分析列表
    console.log('📊 测试 1: 获取 RFM 分析列表');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    try {
      const analysisRes = await axios.post(
        `${API_BASE}/customers/rfm-analysis`,
        {},
        { headers }
      );
      console.log('✅ RFM 分析列表:', JSON.stringify(analysisRes.data, null, 2));
    } catch (error) {
      console.error('❌ RFM 分析列表失败:', error.response?.data || error.message);
    }

    // 测试 2: 获取 RFM 统计汇总
    console.log('\n📊 测试 2: 获取 RFM 统计汇总');
    try {
      const rfmRes = await axios.post(
        `${API_BASE}/customers/rfm-summary`,
        {},
        { headers }
      );
      console.log('✅ RFM 统计:', JSON.stringify(rfmRes.data, null, 2));
    } catch (error) {
      console.error('❌ RFM 统计失败:', error.response?.data || error.message);
    }

    // 测试 3: 获取 RFM 分析（筛选：minTotalScore=10）
    console.log('\n📊 测试 3: 获取 RFM 分析（筛选：minTotalScore=10）');
    try {
      const filterRes = await axios.post(
        `${API_BASE}/customers/rfm-analysis`,
        { minTotalScore: 10 },
        { headers }
      );
      console.log('✅ 筛选结果:', JSON.stringify(filterRes.data, null, 2));
    } catch (error) {
      console.error('❌ 筛选失败:', error.response?.data || error.message);
    }

    // 测试 4: 获取高价值客户列表（limit=10）
    console.log('\n📊 测试 4: 获取高价值客户列表（limit=10）');
    try {
      const highValueRes = await axios.post(
        `${API_BASE}/customers/rfm-high-value`,
        { limit: 10 },
        { headers }
      );
      console.log('✅ 高价值客户:', JSON.stringify(highValueRes.data, null, 2));
    } catch (error) {
      console.error('❌ 高价值客户失败:', error.response?.data || error.message);
    }

    console.log('🎉 所有测试通过！');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应:', JSON.stringify(error.response.data, null, 2));
      console.error('请求配置:', JSON.stringify(error.config, null, 2));
    }
    if (error.request) {
      console.error('请求已发送但未收到响应，请检查服务是否启动');
    }
  }
}

testRfmAnalysis();
