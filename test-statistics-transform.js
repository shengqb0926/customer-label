const http = require('http');

// 模拟前端数据转换逻辑
async function testDataTransformation() {
    console.log('====================================');
    console.log('🧪 测试统计数据转换');
    console.log('====================================\n');
    
    try {
        // 获取统计数据
        const response = await new Promise((resolve, reject) => {
            const req = http.get('http://localhost:3000/api/v1/customers/statistics', (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(JSON.parse(data));
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
        });
        
        console.log('✅ API 返回数据正常\n');
        
        // 模拟前端的数据转换逻辑
        const levelChartData = response.levelStats.map((item) => ({
            name: item.level === 'BRONZE' ? '青铜' : item.level === 'SILVER' ? '白银' : item.level === 'GOLD' ? '黄金' : item.level === 'PLATINUM' ? '铂金' : '钻石',
            value: Number(item.count),
        }));
        
        const riskChartData = response.riskStats.map((item) => ({
            name: item.riskLevel === 'LOW' ? '低风险' : item.riskLevel === 'MEDIUM' ? '中风险' : '高风险',
            value: Number(item.count),
        }));
        
        console.log('📊 等级分布图表数据:');
        console.log(levelChartData);
        console.log();
        
        console.log('📊 风险等级图表数据:');
        console.log(riskChartData);
        console.log();
        
        // 验证数据是否符合 @ant-design/charts 要求
        let hasError = false;
        
        levelChartData.forEach((item, index) => {
            if (!item.name || item.name === 'undefined') {
                console.error(`❌ 等级数据第${index + 1}条：name 字段为 "${item.name}"`);
                hasError = true;
            }
            if (typeof item.value !== 'number' || isNaN(item.value)) {
                console.error(`❌ 等级数据第${index + 1}条：value 字段不是有效数字`);
                hasError = true;
            }
        });
        
        riskChartData.forEach((item, index) => {
            if (!item.name || item.name === 'undefined') {
                console.error(`❌ 风险数据第${index + 1}条：name 字段为 "${item.name}"`);
                hasError = true;
            }
            if (typeof item.value !== 'number' || isNaN(item.value)) {
                console.error(`❌ 风险数据第${index + 1}条：value 字段不是有效数字`);
                hasError = true;
            }
        });
        
        if (hasError) {
            console.log('\n❌ 数据转换存在问题，需要修复！');
        } else {
            console.log('\n✅ 所有数据转换正确，符合 @ant-design/charts 要求！');
            console.log('\n数据格式检查:');
            console.log('- ✅ 使用 name + value 字段');
            console.log('- ✅ value 已转换为数字类型');
            console.log('- ✅ name 有明确的中文映射');
        }
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
    }
}

testDataTransformation();
