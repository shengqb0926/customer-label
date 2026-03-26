const Bull = require('bull');

async function testQueueFeatures() {
  console.log('🧪 开始测试 Bull 消息队列功能...\n');
  
  const queueName = 'test:queue';
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  };

  const queue = new Bull(queueName, { redis: redisConfig });

  try {
    // 1. 测试基础任务添加
    console.log('📝 测试 1: 基础任务添加');
    const job1 = await queue.add({ test: 'data1', value: 123 });
    console.log(`   ✓ 任务已添加：Job ID ${job1.id}`);

    // 2. 测试带优先级的任务
    console.log('\n📝 测试 2: 优先级任务');
    const [low, normal, high] = await Promise.all([
      queue.add({ test: 'low' }, { priority: 0 }),
      queue.add({ test: 'normal' }, { priority: 5 }),
      queue.add({ test: 'high' }, { priority: 10 }),
    ]);
    console.log(`   ✓ 添加了 3 个不同优先级的任务：${low.id}, ${normal.id}, ${high.id}`);

    // 3. 测试延迟任务
    console.log('\n📝 测试 3: 延迟任务');
    const delayedJob = await queue.add(
      { test: 'delayed' },
      { delay: 3000 } // 3 秒后执行
    );
    console.log(`   ✓ 延迟任务已添加：Job ID ${delayedJob.id} (3 秒后执行)`);

    // 4. 测试重试配置
    console.log('\n📝 测试 4: 重试配置');
    const retryJob = await queue.add(
      { test: 'retry' },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );
    console.log(`   ✓ 配置了重试策略的任务：Job ID ${retryJob.id}`);

    // 5. 测试队列统计
    console.log('\n📝 测试 5: 队列统计');
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    console.log(`   ✓ 队列状态:`);
    console.log(`      - Waiting: ${waiting}`);
    console.log(`      - Active: ${active}`);
    console.log(`      - Completed: ${completed}`);
    console.log(`      - Failed: ${failed}`);
    console.log(`      - Delayed: ${delayed}`);

    // 6. 注册处理器并处理任务
    console.log('\n📝 测试 6: 任务处理');
    let processedCount = 0;
    
    queue.process(async (job) => {
      console.log(`   ⚙️  处理任务 ${job.id}:`, job.data);
      
      // 模拟处理延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      processedCount++;
      return { success: true, jobId: job.id };
    });

    // 等待所有任务完成
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log(`   ✓ 已处理 ${processedCount} 个任务`);

    // 7. 测试任务事件监听
    console.log('\n📝 测试 7: 事件监听');
    queue.on('completed', (job, result) => {
      console.log(`   📊 任务 ${job.id} 完成，结果:`, result);
    });

    queue.on('failed', (job, error) => {
      console.log(`   ❌ 任务 ${job?.id} 失败:`, error.message);
    });

    // 8. 清空队列
    console.log('\n📝 测试 8: 清空队列');
    await queue.empty();
    console.log('   ✓ 队列已清空');

    // 9. 获取最终统计
    console.log('\n📝 测试 9: 最终统计');
    const [waitingCount, activeCount, completedCount, failedCount] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ]);
    console.log('   ✓ 最终队列状态:', {
      waiting: waitingCount,
      active: activeCount,
      completed: completedCount,
      failed: failedCount,
    });

    console.log('\n✅ 所有 Bull 消息队列功能测试完成！\n');
    
    await queue.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误详情:', error.stack);
    await queue.close().catch(() => {});
    process.exit(1);
  }
}

testQueueFeatures();
