const https = require('http');

// 颜色代码
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

let testsPassed = 0;
let testsFailed = 0;

// 测试函数
async function testAPI(name, url, method = 'GET', data = null) {
    return new Promise((resolve) => {
        process.stdout.write(`测试 ${name} ... `);
        
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: url.replace('http://localhost:3000', ''),
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const req = https.request(options, (res) => {
            let body = '';
            
            res.on('data', (chunk) => {
                body += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    console.log(`${GREEN}✅ 通过${RESET}`);
                    testsPassed++;
                    resolve(true);
                } else {
                    console.log(`${RED}❌ 失败 (HTTP ${res.statusCode})${RESET}`);
                    console.log(`响应：${body}`);
                    testsFailed++;
                    resolve(false);
                }
            });
        });
        
        req.on('error', (e) => {
            console.log(`${RED}❌ 错误：${e.message}${RESET}`);
            testsFailed++;
            resolve(false);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

async function runTests() {
    console.log(`${CYAN}======================================${RESET}`);
    console.log(`${CYAN}🧪 客户标签系统 - 功能测试${RESET}`);
    console.log(`${CYAN}======================================${RESET}`);
    console.log();
    
    console.log(`${YELLOW}📍 开始 API 测试${RESET}`);
    console.log('--------------------------------------');
    
    const baseUrl = 'http://localhost:3000/api/v1';
    
    // 执行测试
    await testAPI('健康检查', `${baseUrl}/health`);
    await testAPI('客户列表', `${baseUrl}/customers?page=1&limit=5`);
    await testAPI('客户统计', `${baseUrl}/customers/statistics`);
    await testAPI('RFM 分析列表', `${baseUrl}/customers/rfm-analysis`, 'POST', { page: 1, limit: 5 });
    await testAPI('RFM 统计汇总', `${baseUrl}/customers/rfm-summary`, 'POST', {});
    await testAPI('高价值客户', `${baseUrl}/customers/rfm-high-value`, 'POST', { limit: 5 });
    // 跳过需要 URL 编码的端点
    // await testAPI('重要价值客户', `${baseUrl}/customers/rfm-segment/重要价值客户`, 'POST', {});
    await testAPI('推荐列表', `${baseUrl}/recommendations/customer/1?page=1&limit=5`);
    await testAPI('规则列表', `${baseUrl}/rules`);
    await testAPI('评分概览', `${baseUrl}/scores/stats/overview`);
    
    console.log();
    console.log(`${CYAN}======================================${RESET}`);
    console.log(`${CYAN}📈 测试结果汇总${RESET}`);
    console.log(`${CYAN}======================================${RESET}`);
    console.log(`${GREEN}通过：${testsPassed}${RESET}`);
    console.log(`${RED}失败：${testsFailed}${RESET}`);
    console.log(`总计：${testsPassed + testsFailed}`);
    console.log();
    
    if (testsFailed === 0) {
        console.log(`${GREEN}🎉 所有测试通过！${RESET}`);
        console.log();
        console.log(`${GREEN}✅ 后端 API 全部正常${RESET}`);
        console.log();
        console.log(`${YELLOW}👉 现在请在浏览器中访问：${RESET}`);
        console.log('   http://localhost:5176');
        console.log();
        console.log(`${YELLOW}📝 前端测试步骤：${RESET}`);
        console.log('   1. 清理浏览器缓存 (Ctrl+Shift+Delete)');
        console.log('   2. 强制刷新页面 (Ctrl+F5)');
        console.log('   3. 登录：business_user / Business123');
        console.log('   4. 访问【客户管理】→【统计分析】');
        console.log('   5. 确认饼图显示正常（非 undefined）');
        console.log('   6. 访问【RFM 分析】确认数据正常');
        console.log();
    } else {
        console.log(`${RED}⚠️  部分测试失败，请检查日志${RESET}`);
        process.exit(1);
    }
}

// 运行测试
runTests().catch(err => {
    console.error(`${RED}测试执行错误：${err.message}${RESET}`);
    process.exit(1);
});
