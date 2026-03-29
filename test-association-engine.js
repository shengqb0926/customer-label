/**
 * 关联引擎测试脚本
 * 测试客户标签数据的获取和关联规则挖掘
 */

const axios = require('axios');

async function testAssociationEngine() {
  console.log('🔍 开始测试关联引擎...\n');

  try {
    // 步骤 1: 检查是否有客户标签数据
    console.log('📊 步骤 1: 检查客户标签数据...');
    const tagsResponse = await axios.get('http://localhost:3000/api/v1/recommendations/tags');
    const tagStats = tagsResponse.data;
    
    console.log(`✅ 找到 ${tagStats.totalTags || 0} 条标签记录`);
    console.log(`✅ 覆盖 ${tagStats.customersWithTags || 0} 个客户`);
    console.log(`✅ 包含 ${tagStats.uniqueTags || 0} 个唯一标签\n`);

    if (!tagStats.totalTags || tagStats.totalTags === 0) {
      console.log('⚠️  警告：没有找到客户标签数据');
      console.log('💡 请先运行 SQL 脚本创建标签数据：');
      console.log('   psql -U postgres -d customer-label -f scripts/create-customer-tags-table.sql\n');
      return;
    }

    // 步骤 2: 获取前 5 个有标签的客户
    console.log('📋 步骤 2: 查看示例客户标签...');
    const customersResponse = await axios.get('http://localhost:3000/api/v1/customers?page=1&limit=5');
    const customers = customersResponse.data.data;

    for (const customer of customers) {
      const customerTagsResponse = await axios.get(
        `http://localhost:3000/api/v1/recommendations/customer/${customer.id}/tags`
      );
      const tags = customerTagsResponse.data;
      
      if (tags.length > 0) {
        console.log(`\n  客户 ${customer.name} (ID: ${customer.id}):`);
        tags.forEach(tag => {
          console.log(`    - ${tag.tagName} (${tag.tagCategory})`);
        });
      }
    }
    console.log();

    // 步骤 3: 为第一个有标签的客户生成关联推荐
    console.log('🚀 步骤 3: 测试关联引擎推荐...');
    const firstCustomerWithTags = customers.find(c => c.id);
    
    if (firstCustomerWithTags) {
      const generateResponse = await axios.post(
        `http://localhost:3000/api/v1/recommendations/generate/${firstCustomerWithTags.id}?mode=association&useCache=false`
      );
      
      console.log(`✅ 推荐生成完成 (状态：${generateResponse.data.status})`);
      
      // 等待几秒让后台计算完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 查看推荐结果
      const recommendationsResponse = await axios.get(
        `http://localhost:3000/api/v1/recommendations/customer/${firstCustomerWithTags.id}?source=association`
      );
      
      const recommendations = recommendationsResponse.data.data;
      
      if (recommendations.length > 0) {
        console.log(`\n✅ 成功生成 ${recommendations.length} 条关联推荐:`);
        recommendations.forEach((rec, index) => {
          console.log(`\n  ${index + 1}. [${rec.tagName}]`);
          console.log(`     置信度：${(rec.confidence * 100).toFixed(1)}%`);
          console.log(`     来源：${rec.source}`);
          console.log(`     原因：${rec.reason}`);
        });
      } else {
        console.log('⚠️  没有生成关联推荐');
        console.log('可能的原因:');
        console.log('  1. 客户标签数据不足（至少需要 2 个标签）');
        console.log('  2. 标签共现模式不符合最小支持度阈值');
        console.log('  3. 关联规则的置信度或提升度未达到要求');
      }
    }

    console.log('\n✨ 关联引擎测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 请确保后端服务正在运行 (端口 3000)');
    }
  }
}

// 运行测试
testAssociationEngine().catch(console.error);
