import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { Customer, CustomerLevel, RiskLevel, Gender } from '../services/customer';
import { Gender as GenderEnum, CustomerLevel as LevelEnum, RiskLevel as RiskEnum } from '../services/customer';

/**
 * Excel 导入导出工具类
 */
export class CustomerExcelUtils {
  /**
   * 客户表头定义
   */
  private static readonly HEADERS = [
    { key: 'name', header: '客户姓名', width: 15 },
    { key: 'email', header: '邮箱', width: 25 },
    { key: 'phone', header: '手机号', width: 15 },
    { key: 'gender', header: '性别', width: 10 },
    { key: 'age', header: '年龄', width: 8 },
    { key: 'city', header: '城市', width: 12 },
    { key: 'province', header: '省份', width: 12 },
    { key: 'totalAssets', header: '总资产 (元)', width: 15 },
    { key: 'monthlyIncome', header: '月收入 (元)', width: 15 },
    { key: 'annualSpend', header: '年消费 (元)', width: 15 },
    { key: 'orderCount', header: '订单数', width: 10 },
    { key: 'productCount', header: '产品数', width: 10 },
    { key: 'registerDays', header: '注册天数', width: 10 },
    { key: 'lastLoginDays', header: '最后登录 (天)', width: 12 },
    { key: 'level', header: '客户等级', width: 12 },
    { key: 'riskLevel', header: '风险等级', width: 12 },
    { key: 'isActive', header: '是否活跃', width: 10 },
    { key: 'remarks', header: '备注', width: 30 },
  ];

  /**
   * 性别映射
   */
  private static readonly GENDER_MAP: Record<string, string> = {
    M: '男',
    F: '女',
  };

  /**
   * 客户等级映射
   */
  private static readonly LEVEL_MAP: Record<CustomerLevel, string> = {
    [LevelEnum.BRONZE]: '青铜',
    [LevelEnum.SILVER]: '白银',
    [LevelEnum.GOLD]: '黄金',
    [LevelEnum.PLATINUM]: '铂金',
    [LevelEnum.DIAMOND]: '钻石',
  };

  /**
   * 风险等级映射
   */
  private static readonly RISK_MAP: Record<RiskLevel, string> = {
    [RiskEnum.LOW]: '低',
    [RiskEnum.MEDIUM]: '中',
    [RiskEnum.HIGH]: '高',
  };

  /**
   * 导出客户数据为 Excel
   */
  static async exportToExcel(customers: Customer[], filename: string = '客户列表.xlsx'): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('客户列表');

    // 设置列头
    worksheet.columns = this.HEADERS.map(h => ({
      key: h.key,
      header: h.header,
      width: h.width,
    }));

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 填充数据
    customers.forEach((customer, index) => {
      const row = worksheet.getRow(index + 2);
      row.values = {
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone || '',
        gender: this.GENDER_MAP[customer.gender as string] || customer.gender || '',
        age: customer.age || '',
        city: customer.city || '',
        province: customer.province || '',
        totalAssets: customer.totalAssets,
        monthlyIncome: customer.monthlyIncome,
        annualSpend: customer.annualSpend,
        orderCount: customer.orderCount,
        productCount: customer.productCount,
        registerDays: customer.registerDays,
        lastLoginDays: customer.lastLoginDays,
        level: this.LEVEL_MAP[customer.level] || customer.level,
        riskLevel: this.RISK_MAP[customer.riskLevel] || customer.riskLevel,
        isActive: customer.isActive ? '是' : '否',
        remarks: customer.remarks || '',
      };

      // 设置行高
      row.height = 20;

      // 隔行换色
      if ((index + 1) % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' },
        };
      }
    });

    // 冻结首行
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // 生成并下载
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  }

  /**
   * 从 Excel 导入客户数据
   */
  static async importFromExcel(file: File): Promise<Partial<Customer>[]> {
    const workbook = new ExcelJS.Workbook();
    const data = await file.arrayBuffer();
    await workbook.xlsx.load(data);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('Excel 文件为空或格式不正确');
    }

    const customers: Partial<Customer>[] = [];

    worksheet.eachRow((row: any, rowNumber: number) => {
      // 跳过表头
      if (rowNumber === 1) return;

      const values = row.values as any;
      
      // 解析性别
      let gender: Gender | undefined;
      const genderStr = String(values.gender || '').trim();
      if (genderStr === '男' || genderStr === 'M' || genderStr === 'MALE') {
        gender = GenderEnum.MALE;
      } else if (genderStr === '女' || genderStr === 'F' || genderStr === 'FEMALE') {
        gender = GenderEnum.FEMALE;
      }

      // 解析客户等级
      let level: CustomerLevel | undefined = LevelEnum.BRONZE;
      const levelStr = String(values.level || '').trim();
      if (levelStr.includes('钻')) level = LevelEnum.DIAMOND;
      else if (levelStr.includes('铂')) level = LevelEnum.PLATINUM;
      else if (levelStr.includes('黄')) level = LevelEnum.GOLD;
      else if (levelStr.includes('白')) level = LevelEnum.SILVER;
      else if (levelStr.includes('铜')) level = LevelEnum.BRONZE;
      else if (Object.values(LevelEnum).includes(levelStr as CustomerLevel)) {
        level = levelStr as CustomerLevel;
      }

      // 解析风险等级
      let riskLevel: RiskLevel | undefined = RiskEnum.LOW;
      const riskStr = String(values.riskLevel || '').trim();
      if (riskStr.includes('高')) riskLevel = RiskEnum.HIGH;
      else if (riskStr.includes('中')) riskLevel = RiskEnum.MEDIUM;
      else if (riskStr.includes('低')) riskLevel = RiskEnum.LOW;
      else if (Object.values(RiskEnum).includes(riskStr as RiskLevel)) {
        riskLevel = riskStr as RiskLevel;
      }

      // 解析是否活跃
      const isActiveStr = String(values.isActive || '').trim();
      const isActive = isActiveStr === '是' || isActiveStr === 'true' || isActiveStr === '1';

      // 构建客户对象
      const customer: Partial<Customer> = {
        name: String(values.name || '').trim(),
        email: String(values.email || '').trim() || undefined,
        phone: String(values.phone || '').trim() || undefined,
        gender,
        age: values.age ? Number(values.age) : undefined,
        city: String(values.city || '').trim() || undefined,
        province: String(values.province || '').trim() || undefined,
        totalAssets: Number(values.totalAssets) || 0,
        monthlyIncome: Number(values.monthlyIncome) || 0,
        annualSpend: Number(values.annualSpend) || 0,
        orderCount: Number(values.orderCount) || 0,
        productCount: Number(values.productCount) || 0,
        registerDays: Number(values.registerDays) || 0,
        lastLoginDays: Number(values.lastLoginDays) || 0,
        level,
        riskLevel,
        isActive,
        remarks: String(values.remarks || '').trim() || undefined,
      };

      // 验证必填字段
      if (!customer.name) {
        console.warn(`第 ${rowNumber} 行缺少客户姓名，已跳过`);
        return;
      }

      customers.push(customer);
    });

    return customers;
  }

  /**
   * 生成 Excel 模板
   */
  static async downloadTemplate(): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('客户导入模板');

    // 设置列头（与导出相同）
    worksheet.columns = this.HEADERS.map(h => ({
      key: h.key,
      header: h.header,
      width: h.width,
    }));

    // 设置表头样式
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // 添加示例数据行
    const exampleRow = worksheet.getRow(2);
    exampleRow.values = {
      name: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138000',
      gender: '男',
      age: 30,
      city: '北京',
      province: '北京市',
      totalAssets: 500000,
      monthlyIncome: 20000,
      annualSpend: 100000,
      orderCount: 50,
      productCount: 10,
      registerDays: 365,
      lastLoginDays: 7,
      level: '黄金',
      riskLevel: '低',
      isActive: '是',
      remarks: '优质客户',
    };

    // 添加说明
    worksheet.mergeCells('A20:T20');
    const noteRow = worksheet.getRow(20);
    noteRow.getCell('A').value = '说明：带 * 号为必填项，性别可填"男/女"或"M/F"，等级可填"青铜/白银/黄金/铂金/钻石"';
    noteRow.font = { italic: true, color: { argb: 'FF999999' } };

    // 生成并下载
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, '客户导入模板.xlsx');
  }
}
