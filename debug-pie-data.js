const http = require('http');

console.log('====================================');
console.log('🔍 深度调试饼图数据流');
console.log('====================================\n');

// 获取统计数据
async function fetchStatistics() {
    return new Promise((resolve, reject) => {
        http.get('http://localhost:3000/api/v1/customers/statistics', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        }).on('error', reject);
    });
}

// 获取 RFM 汇总
async function fetchRfmSummary() {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: '/api/v1/customers/rfm-summary',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`HTTP ${res.statusCode}`));
                }
            });
        });
        req.write('{}');
        req.end();
    });
}

// 主测试流程
async function runDebugTest() {
    try {
        console.log('📊 步骤 1: 获取后端统计数据...\n');
        const stats = await fetchStatistics();
        
        console.log('✅ 统计数据获取成功');
        console.log('原始数据:');
        console.log(JSON.stringify(stats, null, 2));
        console.log();
        
        console.log('📊 步骤 2: 检查 levelStats 数据结构...\n');
        if (!stats.levelStats || !Array.isArray(stats.levelStats)) {
            console.error('❌ levelStats 不是数组或不存在');
            return;
        }
        
        console.log(`✅ levelStats 是数组，包含 ${stats.levelStats.length} 条记录`);
        console.log('\n逐条检查:');
        stats.levelStats.forEach((item, index) => {
            console.log(`\n第${index + 1}条:`);
            console.log(`  - level: "${item.level}" (${typeof item.level})`);
            console.log(`  - count: "${item.count}" (${typeof item.count})`);
            
            // 模拟前端转换
            const name = item.level === 'BRONZE' ? '青铜' : 
                        item.level === 'SILVER' ? '白银' : 
                        item.level === 'GOLD' ? '黄金' : 
                        item.level === 'PLATINUM' ? '铂金' : '钻石';
            const value = Number(item.count);
            
            console.log(`  - 转换后 name: "${name}"`);
            console.log(`  - 转换后 value: ${value} (${typeof value})`);
            
            if (!name || name === 'undefined') {
                console.error(`  ❌ name 字段无效！`);
            }
            if (typeof value !== 'number' || isNaN(value)) {
                console.error(`  ❌ value 字段不是有效数字！`);
            }
        });
        
        console.log('\n\n📊 步骤 3: 检查 riskStats 数据结构...\n');
        if (!stats.riskStats || !Array.isArray(stats.riskStats)) {
            console.error('❌ riskStats 不是数组或不存在');
            return;
        }
        
        console.log(`✅ riskStats 是数组，包含 ${stats.riskStats.length} 条记录`);
        console.log('\n逐条检查:');
        stats.riskStats.forEach((item, index) => {
            console.log(`\n第${index + 1}条:`);
            console.log(`  - riskLevel: "${item.riskLevel}" (${typeof item.riskLevel})`);
            console.log(`  - count: "${item.count}" (${typeof item.count})`);
            
            // 模拟前端转换
            const name = item.riskLevel === 'LOW' ? '低风险' : 
                        item.riskLevel === 'MEDIUM' ? '中风险' : '高风险';
            const value = Number(item.count);
            
            console.log(`  - 转换后 name: "${name}"`);
            console.log(`  - 转换后 value: ${value} (${typeof value})`);
            
            if (!name || name === 'undefined') {
                console.error(`  ❌ name 字段无效！`);
            }
            if (typeof value !== 'number' || isNaN(value)) {
                console.error(`  ❌ value 字段不是有效数字！`);
            }
        });
        
        console.log('\n\n📊 步骤 4: 获取 RFM 汇总数据...\n');
        const rfmSummary = await fetchRfmSummary();
        
        console.log('✅ RFM 汇总数据获取成功');
        console.log('segmentDistribution:');
        console.log(rfmSummary.segmentDistribution);
        console.log();
        
        console.log('\n逐条检查 RFM 数据:');
        if (rfmSummary.segmentDistribution) {
            const entries = Object.entries(rfmSummary.segmentDistribution);
            console.log(`✅ segmentDistribution 包含 ${entries.length} 个分类`);
            
            entries.forEach(([key, value], index) => {
                console.log(`\n第${index + 1}条:`);
                console.log(`  - key: "${key}" (${typeof key})`);
                console.log(`  - value: "${value}" (${typeof value})`);
                
                // 模拟前端转换
                const name = key;
                const convertedValue = Number(value);
                
                console.log(`  - 转换后 name: "${name}"`);
                console.log(`  - 转换后 value: ${convertedValue} (${typeof convertedValue})`);
                
                if (!name || name === 'undefined') {
                    console.error(`  ❌ name 字段无效！`);
                }
                if (typeof convertedValue !== 'number' || isNaN(convertedValue)) {
                    console.error(`  ❌ value 字段不是有效数字！`);
                }
            });
        }
        
        console.log('\n\n====================================');
        console.log('✅ 数据流检查完成！');
        console.log('====================================\n');
        
        console.log('📋 结论:');
        console.log('1. 如果所有数据都通过了检查，说明后端数据正常');
        console.log('2. 问题可能出在前端缓存、组件渲染或图表库配置');
        console.log('3. 请使用调试页面 test-pie-charts.html 进一步验证\n');
        
        console.log('🔧 下一步建议:');
        console.log('1. 打开浏览器访问：http://localhost:5176/test-pie-charts.html');
        console.log('2. 查看 Console 输出，确认数据是否正确');
        console.log('3. 如果调试页面能正常显示，说明是 React 组件的问题');
        console.log('4. 如果调试页面也显示 undefined，请提供 Console 截图\n');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        console.error(error.stack);
    }
}

runDebugTest();
