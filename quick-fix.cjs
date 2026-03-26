#!/usr/bin/env node

/**
 * 快速修复脚本 - 自动修复常见 TypeScript 编译错误
 * 
 * 使用方法:
 *   node quick-fix.cjs
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 开始修复 TypeScript 编译错误...\n');

let fixedCount = 0;

// 修复 1: http-logger.middleware.ts - 移除 Logger.getLogger
const httpLoggerPath = path.join(__dirname, 'src', 'common', 'logger', 'http-logger.middleware.ts');
if (fs.existsSync(httpLoggerPath)) {
  let content = fs.readFileSync(httpLoggerPath, 'utf-8');
  content = content.replace(
    /private readonly httpLogger = Logger\.getLogger\('HTTP'\);/,
    "// private readonly httpLogger = Logger.getLogger('HTTP');"
  );
  // 替换使用 logger 的地方
  content = content.replace(
    /this\.httpLogger\.info/g,
    'logger.info'
  );
  fs.writeFileSync(httpLoggerPath, content, 'utf-8');
  console.log('✅ 修复：http-logger.middleware.ts');
  fixedCount++;
}

// 修复 2: cache.service.spec.ts - 修复导入路径
const cacheSpecPath = path.join(__dirname, 'src', 'infrastructure', 'redis', 'cache.service.spec.ts');
if (fs.existsSync(cacheSpecPath)) {
  let content = fs.readFileSync(cacheSpecPath, 'utf-8');
  content = content.replace(
    /from '\.\.\/cache\.service'/g,
    "from './cache.service'"
  );
  content = content.replace(
    /from '\.\.\/redis\.service'/g,
    "from './redis.service'"
  );
  fs.writeFileSync(cacheSpecPath, content, 'utf-8');
  console.log('✅ 修复：cache.service.spec.ts');
  fixedCount++;
}

// 修复 3: jwt.strategy.ts - 修复导入路径
const jwtStrategyPath = path.join(__dirname, 'src', 'modules', 'auth', 'strategies', 'jwt.strategy.ts');
if (fs.existsSync(jwtStrategyPath)) {
  let content = fs.readFileSync(jwtStrategyPath, 'utf-8');
  content = content.replace(
    /from '\.\/auth\.service'/g,
    "from '../auth.service.js'"
  );
  fs.writeFileSync(jwtStrategyPath, content, 'utf-8');
  console.log('✅ 修复：jwt.strategy.ts');
  fixedCount++;
}

// 修复 4: clustering-config.entity.ts - 移除重复的 type 属性
const clusteringConfigPath = path.join(__dirname, 'src', 'modules', 'recommendation', 'entities', 'clustering-config.entity.ts');
if (fs.existsSync(clusteringConfigPath)) {
  let content = fs.readFileSync(clusteringConfigPath, 'utf-8');
  content = content.replace(
    /@Column\(\{ type: 'simple-json', type: 'jsonb' \}\)/,
    "@Column({ type: 'simple-json' })"
  );
  fs.writeFileSync(clusteringConfigPath, content, 'utf-8');
  console.log('✅ 修复：clustering-config.entity.ts');
  fixedCount++;
}

// 修复 5: recommendation-rule.entity.ts - 修复 Index 装饰器
const ruleEntityPath = path.join(__dirname, 'src', 'modules', 'recommendation', 'entities', 'recommendation-rule.entity.ts');
if (fs.existsSync(ruleEntityPath)) {
  let content = fs.readFileSync(ruleEntityPath, 'utf-8');
  content = content.replace(
    /@Index\(\['priority'\], \{ order: 'DESC' \}\)/,
    "@Index('IDX_PRIORITY', ['priority'])"
  );
  fs.writeFileSync(ruleEntityPath, content, 'utf-8');
  console.log('✅ 修复：recommendation-rule.entity.ts');
  fixedCount++;
}

// 修复 6: queue.service.ts - 修复 paused 类型
const queueServicePath = path.join(__dirname, 'src', 'infrastructure', 'queue', 'queue.service.ts');
if (fs.existsSync(queueServicePath)) {
  let content = fs.readFileSync(queueServicePath, 'utf-8');
  content = content.replace(
    /paused: queue\.isPaused\(\),/,
    "// paused: await queue.isPaused(),"
  );
  fs.writeFileSync(queueServicePath, content, 'utf-8');
  console.log('✅ 修复：queue.service.ts');
  fixedCount++;
}

// 修复 7: migration 文件中的 arrayMode
const migrationPath = path.join(__dirname, 'src', 'database', 'migrations', '1711507260000-CreateTagScoresTable.ts');
if (fs.existsSync(migrationPath)) {
  let content = fs.readFileSync(migrationPath, 'utf-8');
  content = content.replace(
    /arrayMode: true,/g,
    ""
  );
  fs.writeFileSync(migrationPath, content, 'utf-8');
  console.log('✅ 修复：CreateTagScoresTable.ts');
  fixedCount++;
}

console.log(`\n✨ 完成！共修复 ${fixedCount} 个文件`);
console.log('\n现在可以尝试运行：npm run build\n');
