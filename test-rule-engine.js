/**
 * 测试规则引擎修复
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

async function testRuleEngine() {
  console.log('🧪 开始测试规则引擎修复...\n');

  try {
    // 1. 获取活跃规则列表
    console.log('📋 步骤 1: 获取活跃规则...');
    const rulesResponse = await axios.get(`${BASE_URL}/recommendations/rules/active`);
    const rules = rulesResponse.data;
    
    console.log(`✅ 找到 ${rules.length} 条活跃规则\n`);
    
    if (rules.length === 0) {
      console.log('⚠️  没有找到活跃规则，请先创建规则');
      return;
    }

    // 显示前 3 条规则的表达式格式
    console.log('📝 规则示例:');
    rules.slice(0, 3).forEach((rule, index) => {
      console.log(`\n${index + 1}. ${rule.ruleName}`);
      console.log(`   优先级：${rule.priority}`);
      console.log(`   表达式类型：${typeof rule.ruleExpression}`);
      console.log(`   表达式内容：${JSON.stringify(rule.ruleExpression).substring(0, 100)}...`);
    });

    // 2. 获取客户列表
    console.log('\n\n👥 步骤 2: 获取客户列表...');
    const customersResponse = await axios.get(`${BASE_URL}/customers`, {
      params: { page: 1, limit: 5 }
    });
    
    const customers = customersResponse.data.data || customersResponse.data;
    console.log(`✅ 找到 ${customers.length} 个客户\n`);

    if (customers.length === 0) {
      console.log('⚠️  没有找到客户数据');
      return;
    }

    // 3. 为第一个客户生成推荐（使用规则引擎模式）
    const testCustomer = customers[0];
    console.log(`🎯 步骤 3: 为客户 "${testCustomer.name}" (ID: ${testCustomer.id}) 生成推荐...\n`);

    console.log('⏳ 正在调用规则引擎...');
    const startTime = Date.now();
    
    const generateResponse = await axios.post(
      `${BASE_URL}/recommendations/generate/${testCustomer.id}`,
      null,
      {
        params: {
          mode: 'rule',  // 只测试规则引擎
          useCache: false  // 强制重新计算
        }
      }
    );

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`✅ 推荐生成完成 (耗时：${duration}ms)\n`);
    console.log('响应:', JSON.stringify(generateResponse.data, null, 2));

    // 4. 查看生成的推荐结果
    console.log('\n📊 步骤 4: 查看推荐结果...\n');
    
    setTimeout(async () => {
      try {
        const recommendationsResponse = await axios.get(
          `${BASE_URL}/recommendations/customer/${testCustomer.id}`,
          {
            params: {
              source: 'rule',
              sortBy: 'confidence',
              sortOrder: 'desc'
            }
          }
        );

        const recommendations = recommendationsResponse.data.data || recommendationsResponse.data;
        
        if (recommendations.length === 0) {
          console.log('⚠️  没有生成任何规则推荐');
          console.log('\n💡 可能的原因:');
          console.log('   1. 规则表达式与客户数据不匹配');
          console.log('   2. 置信度阈值设置过高（默认 0.6）');
          console.log('   3. 规则配置有问题');
        } else {
          console.log(`✅ 成功生成 ${recommendations.length} 条规则推荐:\n`);
          
          recommendations.forEach((rec, index) => {
            console.log(`${index + 1}. [${rec.tagName}] (${rec.tagCategory})`);
            console.log(`   置信度：${rec.confidence}`);
            console.log(`   原因：${rec.reason}`);
            console.log('');
          });
        }

        console.log('\n✨ 规则引擎测试完成!\n');
      } catch (error) {
        console.error('❌ 查询推荐结果失败:', error.message);
      }
    }, 2000); // 等待 2 秒让推荐结果保存

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testRuleEngine();
