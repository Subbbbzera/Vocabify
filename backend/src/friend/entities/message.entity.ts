import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('direct_message')
export class DirectMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  sender: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE', eager: true })
  receiver: User;

  @Column({ type: 'text' })
  text: string;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isEdited: boolean;

  @Column({ type: 'int', nullable: true })
  replyToId: number | null;

  @Column({ type: 'text', nullable: true })
  replyToText: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  replyToSenderName: string | null;

  @Column({ type: 'json', nullable: true })
  reactions: Record<string, number[]> | null;

  @CreateDateColumn()
  createdAt: Date;
}
