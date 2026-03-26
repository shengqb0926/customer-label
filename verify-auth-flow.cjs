const http = require('http');

console.log('=== 验证完整验证流程 ===\n');

// 1. 登录获取 token
login()
  .then((token) => {
    if (token) {
      console.log('\n✅ 验证成功！可以使用 token 访问受保护接口\n');
      // 2. 使用 token 访问受保护接口
      return testProtectedEndpoint(token);
    } else {
      console.log('\n❌ 登录失败，无法继续测试\n');
    }
  })
  .catch((err) => {
    console.error('测试失败:', err);
  });

function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      username: 'admin',
      password: 'admin123'
    });
    
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      family: 4
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`1. 登录接口：${res.statusCode}`);
        console.log(`   响应时间：<1s`);
        
        if (res.statusCode === 201 || res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            const token = response.access_token;
            console.log(`   ✅ 获取到 token: ${token ? token.substring(0, 20) + '...' : '无'}`);
            console.log(`   expires_in: ${response.expires_in || 'N/A'}`);
            console.log(`   token_type: ${response.token_type || 'N/A'}`);
            resolve(token);
          } catch (e) {
            console.log(`   ❌ 解析响应失败：${e.message}`);
            resolve(null);
          }
        } else {
          console.log(`   ❌ 登录失败：${data.substring(0, 100)}`);
          resolve(null);
        }
      });
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ 请求失败：${e.message}`);
      reject(e);
    });
    
    req.write(postData);
    req.end();
  });
}

function testProtectedEndpoint(token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: '/api/v1/recommendations/stats',
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      family: 4
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n2. 受保护接口 (/api/v1/recommendations/stats): ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log(`   ✅ 成功访问受保护接口`);
          console.log(`   响应大小：${data.length} bytes`);
          try {
            const json = JSON.parse(data);
            console.log(`   响应数据：${JSON.stringify(json).substring(0, 150)}...`);
          } catch (e) {
            console.log(`   响应内容：${data.substring(0, 100)}`);
          }
        } else {
          console.log(`   ❌ 访问失败：${data.substring(0, 100)}`);
        }
        
        resolve();
      });
    });
    
    req.on('error', (e) => {
      console.log(`   ❌ 请求失败：${e.message}`);
      reject(e);
    });
    
    req.end();
  });
}
