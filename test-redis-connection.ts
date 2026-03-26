import Redis from 'ioredis';

async function testRedis() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  });

  try {
    console.log('🔍 正在连接 Redis...');
    
    // 测试连接
    const pingResult = await redis.ping();
    console.log('✅ Redis 连接成功！PING:', pingResult);

    // 测试设置值
    await redis.set('test_connection', 'Hello from customer-label!');
    console.log('✅ SET 操作成功');

    // 测试获取值
    const value = await redis.get('test_connection');
    console.log('✅ GET 操作成功，值:', value);

    // 测试删除
    await redis.del('test_connection');
    console.log('✅ DEL 操作成功');

    // 查询 Redis 信息
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:(\d+\.\d+\.\d+)/);
    if (versionMatch) {
      console.log('📊 Redis 版本:', versionMatch[1]);
    }

    await redis.quit();
    console.log('✅ Redis 测试完成！\n');
  } catch (error) {
    console.error('❌ Redis 连接失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. Redis 服务未启动');
    console.error('   2. 端口被占用');
    console.error('   3. 密码认证失败');
    console.error('\n💡 解决方案:');
    console.error('   1. Windows: 检查 Redis 服务是否运行 (net start Redis)');
    console.error('   2. 测试连接：redis-cli ping');
    console.error('   3. 检查 .env 文件中的 REDIS_* 配置');
    process.exit(1);
  }
}

testRedis();
