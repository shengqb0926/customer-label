import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_tags')
export class CustomerTag {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'bigint', name: 'customer_id' })
  customerId: number;

  @Column({ type: 'varchar', length: 100, name: 'tag_name' })
  tagName: string;

  @Column({ type: 'varchar', length: 50, name: 'tag_category', nullable: true })
  tagCategory: string;

  @Column({ type: 'timestamp', nullable: true })
  taggedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}