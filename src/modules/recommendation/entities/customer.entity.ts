import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { TagRecommendation } from './tag-recommendation.entity';

// 客户等级枚举
export enum CustomerLevel {
  BRONZE = 'BRONZE',      // 青铜
  SILVER = 'SILVER',      // 白银
  GOLD = 'GOLD',          // 黄金
  PLATINUM = 'PLATINUM',  // 白金
  DIAMOND = 'DIAMOND',    // 钻石
}

// 风险等级枚举
export enum RiskLevel {
  LOW = 'LOW',        // 低风险
  MEDIUM = 'MEDIUM',  // 中风险
  HIGH = 'HIGH',      // 高风险
}

// 性别枚举
export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
}

@Entity('customers')
@Index(['email'], { unique: true })
@Index(['phone'], { unique: true })
@Index(['level'])
@Index(['riskLevel'])
@Index(['createdAt'])
export class Customer {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ type: 'int', nullable: true })
  age: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  province: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  address: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAssets: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  monthlyIncome: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  annualSpend: number;

  @Column({ type: 'int', default: 0 })
  orderCount: number;

  @Column({ type: 'int', default: 0 })
  productCount: number;

  @Column({ type: 'int', default: 0 })
  registerDays: number;

  @Column({ type: 'int', default: 0 })
  lastLoginDays: number;

  @Column({ type: 'enum', enum: CustomerLevel, default: CustomerLevel.BRONZE })
  level: CustomerLevel;

  @Column({ type: 'enum', enum: RiskLevel, default: RiskLevel.LOW })
  riskLevel: RiskLevel;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 关联推荐记录
  @OneToMany(() => TagRecommendation, recommendation => recommendation.customerId)
  recommendations: TagRecommendation[];
}