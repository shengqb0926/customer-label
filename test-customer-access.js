// 测试客户管理模块访问性
const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function testCustomerManagement() {
  console.log('=== 测试客户管理模块 ===\n');

  try {
    // 1. 测试登录 admin
    console.log('1. 测试 admin 用户登录...');
    const adminResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });
    console.log('✅ admin 登录成功，token:', adminResponse.data.access_token.substring(0, 50) + '...');
    console.log('   角色:', adminResponse.data.user.roles);

    // 2. 测试登录 business_user
    console.log('\n2. 测试 business_user 用户登录...');
    const businessResponse = await axios.post(`${API_BASE}/auth/login`, {
      username: 'business_user',
      password: 'Business123'
    });
    console.log('✅ business_user 登录成功，token:', businessResponse.data.access_token.substring(0, 50) + '...');
    console.log('   角色:', businessResponse.data.user.roles);

    // 3. 测试获取客户列表 (admin)
    console.log('\n3. 测试获取客户列表 (admin)...');
    const customersResponse = await axios.get(`${API_BASE}/customers?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${adminResponse.data.access_token}`
      }
    });
    console.log('✅ 获取客户列表成功，总数:', customersResponse.data.total);

    // 4. 测试获取客户统计 (admin)
    console.log('\n4. 测试获取客户统计数据...');
    const statsResponse = await axios.get(`${API_BASE}/customers/statistics`, {
      headers: {
        Authorization: `Bearer ${adminResponse.data.access_token}`
      }
    });
    console.log('✅ 获取统计数据成功:', statsResponse.data);

    // 5. 测试获取客户列表 (business_user)
    console.log('\n5. 测试获取客户列表 (business_user)...');
    const businessCustomersResponse = await axios.get(`${API_BASE}/customers?page=1&limit=10`, {
      headers: {
        Authorization: `Bearer ${businessResponse.data.access_token}`
      }
    });
    console.log('✅ business_user 获取客户列表成功，总数:', businessCustomersResponse.data.total);

    console.log('\n=== 所有测试通过 ✅ ===');
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.response?.data || error.message);
    if (error.response) {
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

testCustomerManagement();
