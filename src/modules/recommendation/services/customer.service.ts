import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Customer, CustomerLevel, RiskLevel, Gender } from '../entities/customer.entity';
import { CreateCustomerDto, UpdateCustomerDto, GetCustomersDto, GenerateRandomCustomersDto } from '../dto/customer.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
  ) {}

  /**
   * 创建单个客户
   */
  async create(dto: CreateCustomerDto): Promise<Customer> {
    // 检查邮箱或手机号是否已存在
    const existing = await this.customerRepo.findOne({
      where: [
        { email: dto.email },
        { phone: dto.phone },
      ],
    });

    if (existing) {
      throw new BadRequestException('邮箱或手机号已存在');
    }

    const customer = this.customerRepo.create(dto);
    return await this.customerRepo.save(customer);
  }

  /**
   * 批量创建客户
   */
  async batchCreate(customers: CreateCustomerDto[]): Promise<Customer[]> {
    const createdCustomers: Customer[] = [];
    
    for (const dto of customers) {
      try {
        const customer = await this.create(dto);
        createdCustomers.push(customer);
      } catch (error) {
        this.logger.warn(`创建客户失败：${dto.name} - ${error.message}`);
      }
    }

    this.logger.log(`成功创建 ${createdCustomers.length}/${customers.length} 个客户`);
    return createdCustomers;
  }

  /**
   * 根据 ID 获取客户
   */
  async findById(id: number): Promise<Customer> {
    const customer = await this.customerRepo.findOne({ where: { id } });
    if (!customer) {
      throw new NotFoundException(`客户 #${id} 不存在`);
    }
    return customer;
  }

  /**
   * 分页查询客户列表（支持多条件筛选）
   */
  async findAll(options: GetCustomersDto) {
    const {
      page = 1,
      limit = 20,
      keyword,
      email,
      city,
      level,
      riskLevel,
      gender,
      minAge,
      maxAge,
      minAssets,
      maxAssets,
      isActive,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const queryBuilder = this.customerRepo.createQueryBuilder('customer');

    // 关键词搜索（姓名、手机号）
    if (keyword) {
      queryBuilder.andWhere('(customer.name LIKE :keyword OR customer.phone LIKE :keyword)', {
        keyword: `%${keyword}%`,
      });
    }

    // 邮箱筛选
    if (email) {
      queryBuilder.andWhere('customer.email LIKE :email', { email: `%${email}%` });
    }

    // 城市筛选
    if (city) {
      queryBuilder.andWhere('customer.city = :city', { city });
    }

    // 等级筛选
    if (level) {
      queryBuilder.andWhere('customer.level = :level', { level });
    }

    // 风险等级筛选
    if (riskLevel) {
      queryBuilder.andWhere('customer.riskLevel = :riskLevel', { riskLevel });
    }

    // 性别筛选
    if (gender) {
      queryBuilder.andWhere('customer.gender = :gender', { gender });
    }

    // 年龄范围
    if (minAge) {
      queryBuilder.andWhere('customer.age >= :minAge', { minAge });
    }
    if (maxAge) {
      queryBuilder.andWhere('customer.age <= :maxAge', { maxAge });
    }

    // 资产范围
    if (minAssets) {
      queryBuilder.andWhere('customer.totalAssets >= :minAssets', { minAssets });
    }
    if (maxAssets) {
      queryBuilder.andWhere('customer.totalAssets <= :maxAssets', { maxAssets });
    }

    // 激活状态
    if (isActive !== undefined) {
      queryBuilder.andWhere('customer.isActive = :isActive', { isActive });
    }

    // 排序
    const orderDirection = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(`customer.${sortBy}`, orderDirection);

    // 分页
    queryBuilder.skip((page - 1) * limit).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 更新客户信息
   */
  async update(id: number, dto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findById(id);
    
    // 检查邮箱或手机号是否与其他客户重复
    if (dto.email || dto.phone) {
      const existing = await this.customerRepo.findOne({
        where: [
          { email: dto.email, id: Not(id) },
          { phone: dto.phone, id: Not(id) },
        ],
      });

      if (existing) {
        throw new BadRequestException('邮箱或手机号已被其他客户使用');
      }
    }

    Object.assign(customer, dto);
    return await this.customerRepo.save(customer);
  }

  /**
   * 删除客户
   */
  async remove(id: number): Promise<void> {
    const customer = await this.findById(id);
    await this.customerRepo.remove(customer);
    this.logger.log(`客户 #${id} 已删除`);
  }

  /**
   * 批量删除客户
   */
  async batchRemove(ids: number[]): Promise<void> {
    await this.customerRepo.delete(ids);
    this.logger.log(`批量删除 ${ids.length} 个客户`);
  }

  /**
   * 随机生成客户数据
   */
  async generateRandomCustomers(options: GenerateRandomCustomersDto): Promise<Customer[]> {
    const { count, cities, minAge = 20, maxAge = 65, minAssets = 10000, maxAssets = 10000000 } = options;

    const customers: CreateCustomerDto[] = [];
    const genders = [Gender.MALE, Gender.FEMALE];
    const levels = [CustomerLevel.BRONZE, CustomerLevel.SILVER, CustomerLevel.GOLD, CustomerLevel.PLATINUM, CustomerLevel.DIAMOND];
    const riskLevels = [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH];
    const defaultCities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆'];
    const provinces: Record<string, string> = {
      '北京': '北京市', '上海': '上海市', '广州': '广东省', '深圳': '广东省',
      '杭州': '浙江省', '成都': '四川省', '武汉': '湖北省', '西安': '陕西省',
      '南京': '江苏省', '重庆': '重庆市',
    };

    for (let i = 0; i < count; i++) {
      const city = cities?.length ? cities[Math.floor(Math.random() * cities.length)] : defaultCities[Math.floor(Math.random() * defaultCities.length)];
      const gender = genders[Math.floor(Math.random() * genders.length)];
      const age = Math.floor(Math.random() * (maxAge - minAge + 1)) + minAge;
      
      // 基于年龄和性别生成更真实的收入数据
      const baseIncome = 5000 + (age - 20) * 800; // 年龄越大收入越高
      const incomeMultiplier = gender === Gender.MALE ? 1.2 : 1.0; // 性别系数
      const monthlyIncome = Math.floor((baseIncome + Math.random() * 20000) * incomeMultiplier);
      
      // 资产与收入相关
      const totalAssets = monthlyIncome * (12 + Math.floor(Math.random() * 20)) * (0.5 + Math.random());
      const annualSpend = monthlyIncome * (6 + Math.random() * 6); // 年消费为月收入的 6-12 倍
      
      // 订单数和产品数
      const orderCount = Math.floor(Math.random() * 50) + 1;
      const productCount = Math.floor(Math.random() * 10) + 1;
      
      // 注册天数和登录天数
      const registerDays = Math.floor(Math.random() * 1000) + 30;
      const lastLoginDays = Math.floor(Math.random() * 60);
      
      // 等级和风险评估
      let level: CustomerLevel = CustomerLevel.BRONZE;
      if (totalAssets > 5000000) level = CustomerLevel.DIAMOND;
      else if (totalAssets > 2000000) level = CustomerLevel.PLATINUM;
      else if (totalAssets > 1000000) level = CustomerLevel.GOLD;
      else if (totalAssets > 300000) level = CustomerLevel.SILVER;
      
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];

      customers.push({
        name: this.generateChineseName(gender),
        email: `customer${Date.now()}${i}@example.com`,
        phone: `1${3 + Math.floor(Math.random() * 9)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
        gender,
        age,
        city,
        province: provinces[city] || city,
        address: `${city}${['朝阳区', '海淀区', '浦东新区', '天河区', '南山区'][Math.floor(Math.random() * 5)]}路${Math.floor(Math.random() * 1000)}号`,
        totalAssets,
        monthlyIncome,
        annualSpend,
        orderCount,
        productCount,
        registerDays,
        lastLoginDays,
        level,
        riskLevel,
        remarks: `自动生成客户 #${i + 1}`,
        isActive: true,
      });
    }

    return await this.batchCreate(customers);
  }

  /**
   * 生成中文姓名
   */
  private generateChineseName(gender: Gender): string {
    const surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许'];
    const maleNames = ['伟', '刚', '勇', '毅', '俊', '峰', '强', '军', '平', '保', '东', '文', '辉', '力', '明', '永', '健', '世', '广', '志', '义', '兴', '良', '海', '山', '仁', '波', '宁', '贵', '福', '生', '龙', '元', '全', '国', '胜', '学', '祥', '才', '发', '武', '新', '利', '清', '飞', '彬', '富', '顺', '信', '子', '杰', '涛', '昌', '成', '康', '星', '光', '天', '达', '安', '岩', '中', '茂', '进', '林', '有', '坚', '和', '彪', '博', '诚', '先', '敬', '震', '振', '壮', '会', '思', '群', '豪', '心', '邦', '承', '乐', '绍', '功', '松', '善', '厚', '庆', '磊', '民', '友', '裕', '河', '哲', '江', '超', '浩', '亮', '政', '谦', '亨', '奇', '固', '之', '轮', '翰', '朗', '伯', '宏', '言', '若', '鸣', '朋', '斌', '梁', '栋', '维', '启', '克', '伦', '翔', '旭', '鹏', '泽', '晨', '辰', '士', '以', '建', '家', '致', '树', '炎', '德', '行', '时', '泰', '盛', '雄', '琛', '钧', '冠', '策', '腾', '楠', '榕', '风', '航', '弘'];
    const femaleNames = ['秀', '娟', '英', '华', '慧', '巧', '美', '娜', '静', '淑', '惠', '珠', '翠', '雅', '芝', '玉', '萍', '红', '娥', '玲', '芬', '芳', '燕', '彩', '春', '菊', '兰', '凤', '洁', '梅', '琳', '素', '云', '莲', '真', '环', '雪', '荣', '爱', '妹', '霞', '香', '月', '莺', '媛', '艳', '瑞', '凡', '佳', '嘉', '琼', '勤', '珍', '贞', '莉', '桂', '娣', '叶', '璧', '璐', '娅', '琦', '晶', '妍', '茜', '秋', '珊', '莎', '锦', '黛', '青', '倩', '婷', '姣', '婉', '娴', '瑾', '颖', '露', '瑶', '怡', '婵', '雁', '蓓', '纨', '仪', '荷', '丹', '蓉', '眉', '君', '琴', '蕊', '薇', '菁', '梦', '岚', '苑', '婕', '馨', '瑗', '琰', '韵', '融', '园', '艺', '咏', '卿', '聪', '澜', '纯', '毓', '悦', '昭', '冰', '爽', '琬', '茗', '羽', '希', '欣', '飘', '育', '滢', '馥', '筠', '柔', '竹', '霭', '凝', '晓', '欢', '霄', '枫', '芸', '菲', '寒', '伊', '亚', '宜', '可', '姬', '舒', '影', '荔', '枝', '丽', '阳', '妮', '宝', '贝', '初', '惠', '菁', '菊', '勤', '艳', '娥', '玲', '芬', '芳', '燕', '彩', '春', '梅', '琳', '素', '云', '莲', '真', '环', '雪', '荣', '爱', '妹', '霞', '香', '月', '莺', '媛', '瑞', '凡', '佳', '嘉', '琼', '桂', '娣', '叶', '璧', '璐', '娅', '琦', '晶', '妍', '秋', '珊', '莎', '锦', '黛', '青', '倩', '婷', '姣', '婉', '娴', '瑾', '颖', '露', '瑶', '怡', '婵', '雁', '蓓', '纨', '仪', '荷', '丹', '蓉', '眉', '君', '琴', '蕊', '薇', '菁', '梦', '岚', '苑', '婕', '馨', '瑗', '琰', '韵', '融', '园', '艺', '咏', '卿', '聪', '澜', '纯', '毓', '悦', '昭', '冰', '爽', '琬', '茗', '羽', '希', '欣', '飘', '育', '滢', '馥', '筠', '柔', '竹', '霭', '凝', '晓', '欢', '霄', '枫', '芸', '菲', '寒', '伊', '亚', '宜', '可', '姬', '舒', '影', '荔', '枝', '丽', '阳', '妮', '宝', '贝'];
    
    const surname = surnames[Math.floor(Math.random() * surnames.length)];
    const givenNames = gender === Gender.MALE ? maleNames : femaleNames;
    const givenName1 = givenNames[Math.floor(Math.random() * givenNames.length)];
    const givenName2 = givenNames[Math.floor(Math.random() * givenNames.length)];
    
    return surname + (Math.random() > 0.5 ? givenName1 : givenName1 + givenName2);
  }

  /**
   * 获取客户统计信息
   */
  async getStatistics(): Promise<any> {
    const total = await this.customerRepo.count();
    const activeCount = await this.customerRepo.count({ where: { isActive: true } });
    
    const levelStats = await this.customerRepo
      .createQueryBuilder('customer')
      .select('customer.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.level')
      .getRawMany();

    const riskStats = await this.customerRepo
      .createQueryBuilder('customer')
      .select('customer.riskLevel', 'riskLevel')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.riskLevel')
      .getRawMany();

    const cityStats = await this.customerRepo
      .createQueryBuilder('customer')
      .select('customer.city', 'city')
      .addSelect('COUNT(*)', 'count')
      .orderBy('count', 'DESC')
      .limit(10)
      .groupBy('customer.city')
      .getRawMany();

    const avgAssets = await this.customerRepo
      .createQueryBuilder('customer')
      .select('AVG(customer.totalAssets)', 'avg')
      .getRawOne();

    // 转换数据格式，确保字段名称正确
    return {
      total,
      activeCount,
      inactiveCount: total - activeCount,
      levelStats: levelStats.map((item: any) => ({
        level: item.level,
        count: Number(item.count), // 确保 count 是数字
      })),
      riskStats: riskStats.map((item: any) => ({
        riskLevel: item.riskLevel,
        count: Number(item.count), // 确保 count 是数字
      })),
      cityStats: cityStats.map((item: any) => ({
        city: item.city,
        count: Number(item.count), // 确保 count 是数字
      })),
      avgAssets: parseFloat(avgAssets.avg) || 0,
    };
  }
}

// 需要导入 Not 操作符
import { Not } from 'typeorm';