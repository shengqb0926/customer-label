const { Client } = require('pg');
const fs = require('fs');

async function importCustomers() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'customer_label',
  });

  try {
    console.log('🚀 开始导入客户数据...\n');
    
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 读取 CSV 文件（假设格式：name,email,phone,gender,age,city,totalAssets,monthlyIncome,annualSpend）
    const csvData = fs.readFileSync('d:/VsCode/customer-label/customers-import.csv', 'utf8');
    const lines = csvData.split('\n').filter(line => line.trim());
    
    // 跳过表头
    const headers = lines[0].split(',').map(h => h.trim());
    const dataLines = lines.slice(1);
    
    console.log(`📊 发现 ${dataLines.length} 条客户数据\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const line of dataLines) {
      if (!line.trim()) continue;
      
      const values = line.split(',').map(v => v.trim());
      
      if (values.length < headers.length) {
        console.warn(`⚠️  数据不完整：${line}`);
        failCount++;
        continue;
      }
      
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      
      try {
        await client.query(`
          INSERT INTO customers (name, email, phone, gender, age, city, total_assets, monthly_income, annual_spend)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (email) DO NOTHING
        `, [
          row.name,
          row.email,
          row.phone,
          row.gender === '男' ? 'M' : 'F',
          parseInt(row.age) || null,
          row.city || null,
          parseFloat(row.totalAssets) || 0,
          parseFloat(row.monthlyIncome) || 0,
          parseFloat(row.annualSpend) || 0,
        ]);
        
        successCount++;
        console.log(`✅ 导入成功：${row.name}`);
      } catch (error) {
        failCount++;
        console.error(`❌ 导入失败：${row.name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ 导入完成！`);
    console.log(`   成功：${successCount} 条`);
    console.log(`   失败：${failCount} 条`);
    console.log('\n🎉 客户数据导入完成！\n');
    
  } catch (error) {
    console.error('❌ 导入失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

importCustomers();