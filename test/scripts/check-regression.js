/**
 * 性能回归检测脚本
 * 
 * 用途：
 * 1. 读取当前测试结果和基线数据
 * 2. 比较关键性能指标
 * 3. 检测性能回归（下降超过阈值则失败）
 * 4. 输出详细的对比报告
 * 
 * 使用方法：
 * node test/scripts/check-regression.js
 */

const fs = require('fs');
const path = require('path');

// 配置
const CONFIG = {
  // 性能下降阈值（百分比）
  regressionThreshold: parseFloat(process.env.REGRESSION_THRESHOLD || '10'),
  
  // 基线文件路径
  baselinePath: process.env.BASELINE_PATH || '.github/baselines/latest.json',
  
  // 当前结果文件路径
  currentResultPath: process.env.CURRENT_RESULT_PATH || 'test/results/benchmark-results.json',
  
  // 需要检查的指标
  metricsToCheck: [
    { name: '平均响应时间', key: 'avgResponseTime', lowerIsBetter: true },
    { name: 'P95 响应时间', key: 'p95ResponseTime', lowerIsBetter: true },
    { name: 'P99 响应时间', key: 'p99ResponseTime', lowerIsBetter: true },
    { name: '成功率', key: 'successRate', lowerIsBetter: false },
    { name: '吞吐量', key: 'throughput', lowerIsBetter: false },
  ],
};

/**
 * 读取 JSON 文件
 */
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  文件不存在：${filePath}`);
      return null;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`❌ 读取文件失败 ${filePath}:`, error.message);
    return null;
  }
}

/**
 * 计算性能变化百分比
 */
function calculateChange(current, baseline, lowerIsBetter) {
  if (baseline === 0) return 0;
  
  const change = ((current - baseline) / baseline) * 100;
  
  // 对于"越低越好"的指标，负增长是好的
  // 对于"越高越好"的指标，正增长是好的
  if (lowerIsBetter) {
    return change; // 正值表示变差
  } else {
    return -change; // 负值表示变差
  }
}

/**
 * 检查单个指标是否回归
 */
function checkMetric(metricName, currentValue, baselineValue, lowerIsBetter, threshold) {
  const change = calculateChange(currentValue, baselineValue, lowerIsBetter);
  const isRegression = change > threshold;
  
  return {
    metric: metricName,
    current: currentValue,
    baseline: baselineValue,
    change: change.toFixed(2),
    isRegression,
    status: isRegression ? '❌ REGRESSION' : (change < 0 ? '✅ IMPROVED' : '✓ OK'),
  };
}

/**
 * 主函数
 */
async function main() {
  console.log('🔍 开始性能回归检测...\n');
  console.log(`📊 阈值设置：${CONFIG.regressionThreshold}%\n`);
  
  // 读取基线数据
  const baseline = readJsonFile(CONFIG.baselinePath);
  if (!baseline) {
    console.log('⚠️  未找到基线数据，跳过回归检测');
    console.log('💡 提示：在 main 分支成功运行后会创建基线\n');
    process.exit(0);
  }
  
  // 读取当前结果
  const current = readJsonFile(CONFIG.currentResultPath);
  if (!current) {
    console.error('❌ 未找到当前测试结果，无法进行回归检测');
    process.exit(1);
  }
  
  console.log('📈 性能指标对比:\n');
  console.log('=' .repeat(80));
  console.log(`${'指标'.padEnd(20)} | ${'基线'.padStart(12)} | ${'当前'.padStart(12)} | ${'变化'.padStart(10)} | ${'状态'.padStart(15)}`);
  console.log('=' .repeat(80));
  
  let regressionDetected = false;
  const results = [];
  
  // 检查每个指标
  for (const metric of CONFIG.metricsToCheck) {
    const baselineValue = baseline.summary?.[metric.key] || baseline[metric.key];
    const currentValue = current.summary?.[metric.key] || current[metric.key];
    
    if (baselineValue === undefined || currentValue === undefined) {
      console.log(`${metric.name.padEnd(20)} | ${'N/A'.padStart(12)} | ${'N/A'.padStart(12)} | ${'N/A'.padStart(10)} | ⚠️  数据缺失`.padStart(15));
      continue;
    }
    
    const result = checkMetric(metric.name, currentValue, baselineValue, metric.lowerIsBetter, CONFIG.regressionThreshold);
    results.push(result);
    
    if (result.isRegression) {
      regressionDetected = true;
    }
    
    const changeDisplay = `${result.change > 0 ? '+' : ''}${result.change}%`;
    console.log(
      `${result.metric.padEnd(20)} | ` +
      `${String(result.baseline).padStart(12)} | ` +
      `${String(result.current).padStart(12)} | ` +
      `${changeDisplay.padStart(10)} | ${result.status.padStart(15)}`
    );
  }
  
  console.log('=' .repeat(80));
  
  // 输出总结
  console.log('\n📋 检测总结:\n');
  
  if (regressionDetected) {
    console.error('❌ 检测到性能回归！');
    console.error('\n以下指标出现性能下降:');
    results
      .filter(r => r.isRegression)
      .forEach(r => {
        console.error(`  - ${r.metric}: 下降 ${r.change}%`);
      });
    console.error('\n💡 建议:');
    console.error('  1. 查看最近的代码变更');
    console.error('  2. 分析性能瓶颈');
    console.error('  3. 优化相关代码或调整基线');
    process.exit(1);
  } else {
    console.log('✅ 未检测到性能回归！');
    
    const improvedMetrics = results.filter(r => r.change < 0);
    if (improvedMetrics.length > 0) {
      console.log('\n🎉 以下指标有性能提升:');
      improvedMetrics.forEach(r => {
        console.log(`  - ${r.metric}: 提升 ${Math.abs(parseFloat(r.change)).toFixed(2)}%`);
      });
    }
    
    console.log('\n✨ 性能测试通过！');
    process.exit(0);
  }
}

// 执行
main().catch(error => {
  console.error('❌ 发生错误:', error.message);
  process.exit(1);
});
