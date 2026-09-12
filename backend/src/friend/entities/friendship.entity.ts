import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';

@Entity('friendship')
export class Friendship {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  receiver: User;

  @Column({ type: 'varchar', length: 20, default: 'PENDING' })
  status: FriendshipStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
