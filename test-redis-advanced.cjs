const Redis = require('ioredis');

async function testRedisFeatures() {
  console.log('🧪 开始测试 Redis 高级功能...\n');
  
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  });

  try {
    // 1. 测试基础字符串操作
    console.log('📝 测试 1: 基础字符串操作');
    await redis.set('test:string', 'Hello Redis');
    const value = await redis.get('test:string');
    console.log(`   ✓ SET/GET: ${value}`);
    await redis.del('test:string');

    // 2. 测试带过期时间的键
    console.log('\n📝 测试 2: 带过期时间的键');
    await redis.setex('test:expiring', 5, 'Expires in 5s');
    const ttl = await redis.ttl('test:expiring');
    console.log(`   ✓ TTL: ${ttl}秒`);
    
    // 等待 6 秒验证是否过期
    console.log('   ⏳ 等待 6 秒验证过期...');
    await new Promise(resolve => setTimeout(resolve, 6000));
    const expiredValue = await redis.get('test:expiring');
    console.log(`   ✓ 过期后值：${expiredValue === null ? '已过期 ✓' : expiredValue}`);

    // 3. 测试哈希操作
    console.log('\n📝 测试 3: 哈希操作');
    await redis.hset('test:hash', 'field1', 'value1');
    await redis.hset('test:hash', 'field2', 'value2');
    const hashData = await redis.hgetall('test:hash');
    console.log('   ✓ HSET/HGETALL:', hashData);
    await redis.del('test:hash');

    // 4. 测试列表操作
    console.log('\n📝 测试 4: 列表操作');
    await redis.lpush('test:list', 'item3', 'item2', 'item1');
    const listItems = await redis.lrange('test:list', 0, -1);
    console.log('   ✓ LPUSH/LRANGE:', listItems);
    await redis.del('test:list');

    // 5. 测试集合操作
    console.log('\n📝 测试 5: 集合操作');
    await redis.sadd('test:set', 'member1', 'member2', 'member3');
    const setMembers = await redis.smembers('test:set');
    console.log('   ✓ SADD/SMEMBERS:', setMembers);
    await redis.del('test:set');

    // 6. 测试发布订阅（简单验证）
    console.log('\n📝 测试 6: 发布订阅');
    const subClient = new Redis();
    const pubClient = new Redis();
    
    let messageReceived = false;
    await subClient.subscribe('test:channel');
    subClient.on('message', (channel, message) => {
      console.log(`   ✓ 收到消息：${channel} - ${message}`);
      messageReceived = true;
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
    await pubClient.publish('test:channel', 'Hello PubSub!');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!messageReceived) {
      console.log('   ⚠️  未收到消息（可能是异步延迟）');
    }
    
    await subClient.unsubscribe('test:channel');
    await subClient.quit();
    await pubClient.quit();

    // 7. 测试 Lua 脚本（简单示例）
    console.log('\n📝 测试 7: Lua 脚本');
    const script = `
      redis.call('SET', KEYS[1], ARGV[1])
      return redis.call('GET', KEYS[1])
    `;
    const result = await redis.eval(script, 1, 'test:lua', 'LuaValue');
    console.log('   ✓ EVAL:', result);
    await redis.del('test:lua');

    // 8. 测试管道操作
    console.log('\n📝 测试 8: 管道操作');
    const pipeline = redis.pipeline();
    pipeline.set('test:pipe:1', 'value1');
    pipeline.set('test:pipe:2', 'value2');
    pipeline.set('test:pipe:3', 'value3');
    const pipeResults = await pipeline.exec();
    console.log('   ✓ PIPELINE: 执行了', pipeResults.length, '个操作');
    await redis.del(['test:pipe:1', 'test:pipe:2', 'test:pipe:3']);

    // 9. 测试事务操作
    console.log('\n📝 测试 9: 事务操作');
    const transaction = redis.multi();
    transaction.set('test:tx:1', 'value1');
    transaction.incr('test:tx:counter');
    transaction.incr('test:tx:counter');
    const txResults = await transaction.exec();
    console.log('   ✓ MULTI/EXEC: 执行了', txResults.length, '个操作');
    const counterValue = await redis.get('test:tx:counter');
    console.log(`   ✓ 计数器值：${counterValue}`);
    await redis.del(['test:tx:1', 'test:tx:counter']);

    console.log('\n✅ 所有 Redis 高级功能测试完成！\n');
    
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);
    await redis.quit().catch(() => {});
    process.exit(1);
  }
}

testRedisFeatures();
