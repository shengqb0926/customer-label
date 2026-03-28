const { Client } = require('pg');

async function seedCustomers() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'customer_label',
  });

  try {
    console.log('🚀 开始生成种子客户数据...\n');
    
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 清空现有数据（可选）
    await client.query('TRUNCATE TABLE customers RESTART IDENTITY CASCADE');
    console.log('🗑️  已清空现有数据\n');

    // 生成模拟数据
    const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆'];
    const provinces = {
      '北京': '北京市', '上海': '上海市', '广州': '广东省', '深圳': '广东省',
      '杭州': '浙江省', '成都': '四川省', '武汉': '湖北省', '西安': '陕西省',
      '南京': '江苏省', '重庆': '重庆市',
    };
    const genders = ['M', 'F'];
    const levels = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
    const riskLevels = ['LOW', 'MEDIUM', 'HIGH'];
    const surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许'];
    const givenNames = ['伟', '刚', '勇', '毅', '俊', '峰', '强', '军', '平', '保', '东', '文', '辉', '力', '明', '永', '健', '世', '广', '志', '秀', '娟', '英', '华', '慧', '巧', '美', '娜', '静', '淑', '惠', '珠', '翠', '雅', '芝', '玉', '萍', '红', '娥', '玲', '芬', '芳', '燕', '彩', '春', '菊', '兰', '凤', '洁', '梅', '琳', '素', '云', '莲', '真', '环', '雪', '荣', '爱', '妹', '霞', '香', '月', '莺', '媛', '艳', '瑞', '凡', '佳', '嘉', '琼', '勤', '珍', '贞', '莉', '桂', '娣', '叶', '璧', '璐', '娅', '琦', '晶', '妍', '茜', '秋', '珊', '莎', '锦', '黛', '青', '倩', '婷', '姣', '婉', '娴', '瑾', '颖', '露', '瑶', '怡', '婵', '雁', '蓓', '纨', '仪', '荷', '丹', '蓉', '眉', '君', '琴', '蕊', '薇', '菁', '梦', '岚', '苑', '婕', '馨', '瑗', '琰', '韵', '融', '园', '艺', '咏', '卿', '聪', '澜', '纯', '毓', '悦', '昭', '冰', '爽', '琬', '茗', '羽', '希', '欣', '飘', '育', '滢', '馥', '筠', '柔', '竹', '霭', '凝', '晓', '欢', '霄', '枫', '芸', '菲', '寒', '伊', '亚', '宜', '可', '姬', '舒', '影', '荔', '枝', '丽', '阳', '妮', '宝', '贝'];

    let insertCount = 0;
    
    for (let i = 0; i < 100; i++) {
      const city = cities[Math.floor(Math.random() * cities.length)];
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const age = Math.floor(Math.random() * 45) + 20; // 20-65 岁
      
      const baseIncome = 5000 + (age - 20) * 800;
      const incomeMultiplier = gender === 'M' ? 1.2 : 1.0;
      const monthlyIncome = Math.floor((baseIncome + Math.random() * 20000) * incomeMultiplier);
      
      const totalAssets = monthlyIncome * (12 + Math.floor(Math.random() * 20)) * (0.5 + Math.random());
      const annualSpend = monthlyIncome * (6 + Math.random() * 6);
      
      const orderCount = Math.floor(Math.random() * 50) + 1;
      const productCount = Math.floor(Math.random() * 10) + 1;
      const registerDays = Math.floor(Math.random() * 1000) + 30;
      const lastLoginDays = Math.floor(Math.random() * 60);
      
      let level = 'BRONZE';
      if (totalAssets > 5000000) level = 'DIAMOND';
      else if (totalAssets > 2000000) level = 'PLATINUM';
      else if (totalAssets > 1000000) level = 'GOLD';
      else if (totalAssets > 300000) level = 'SILVER';
      
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      
      const surname = surnames[Math.floor(Math.random() * surnames.length)];
      const givenName1 = givenNames[Math.floor(Math.random() * givenNames.length)];
      const givenName2 = givenNames[Math.floor(Math.random() * givenNames.length)];
      const name = surname + (Math.random() > 0.5 ? givenName1 : givenName1 + givenName2);

      try {
        await client.query(`
          INSERT INTO customers (
            name, email, phone, gender, age, city, province, address,
            total_assets, monthly_income, annual_spend,
            order_count, product_count, register_days, last_login_days,
            level, risk_level, remarks, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        `, [
          name,
          `customer${i}@example.com`,
          `1${3 + Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
          gender,
          age,
          city,
          provinces[city] || city,
          `${city}${['朝阳区', '海淀区', '浦东新区', '天河区', '南山区'][Math.floor(Math.random() * 5)]}路${Math.floor(Math.random() * 1000)}号`,
          totalAssets,
          monthlyIncome,
          annualSpend,
          orderCount,
          productCount,
          registerDays,
          lastLoginDays,
          level,
          riskLevel,
          `种子客户 #${i + 1}`,
          true,
        ]);
        
        insertCount++;
        console.log(`✅ 插入客户：${name} (${city}, ${level})`);
      } catch (error) {
        console.error(`❌ 插入失败：${name} - ${error.message}`);
      }
    }
    
    console.log(`\n✅ 成功插入 ${insertCount}/100 个客户数据`);
    console.log('\n🎉 种子数据生成完成！\n');
    
  } catch (error) {
    console.error('❌ 生成失败:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedCustomers();