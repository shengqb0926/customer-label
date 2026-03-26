const jwt = require('jsonwebtoken');

// 使用与应用中相同的密钥和配置
const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 创建用户 payload
const payload = {
  sub: 1,
  username: 'admin',
  roles: ['admin', 'user']
};

// 生成 token
const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('=== JWT Token 生成器 ===\n');
console.log('用户名：admin');
console.log('\n生成的 Token:\n');
console.log(token);
console.log('\n\n使用方法:');
console.log('1. 复制上面的完整 token');
console.log('2. 在 Swagger UI 中点击 "Authorize" 按钮');
console.log('3. 粘贴 token（不需要加 Bearer 前缀）');
console.log('4. 点击 "Authorize" 确认');
console.log('5. 现在可以测试所有受保护的 API 了！');
