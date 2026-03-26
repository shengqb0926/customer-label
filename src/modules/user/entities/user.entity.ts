import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Unique,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  ANALYST = 'analyst',
}

@Entity('users')
@Unique(['username'])
@Unique(['email'])
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 50 })
  username: string;

  @Column({ type: 'varchar', length: 100 })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ type: 'simple-array', default: 'user' })
  roles: UserRole[];

  @Column({ name: 'full_name', type: 'varchar', length: 50, nullable: true })
  fullName: string;

  @Column({ name: 'phone', type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ name: 'last_login_ip', type: 'varchar', length: 50, nullable: true })
  lastLoginIp: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number;

  /**
   * 检查用户是否具有指定角色
   */
  hasRole(role: UserRole): boolean {
    return this.roles.includes(role);
  }

  /**
   * 检查用户是否是管理员
   */
  isAdmin(): boolean {
    return this.hasRole(UserRole.ADMIN);
  }

  /**
   * 检查用户是否是分析师
   */
  isAnalyst(): boolean {
    return this.hasRole(UserRole.ANALYST);
  }

  /**
   * 检查用户是否是普通用户
   */
  isUser(): boolean {
    return this.hasRole(UserRole.USER);
  }
}
