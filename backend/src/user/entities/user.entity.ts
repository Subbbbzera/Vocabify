import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Dictionary } from '../../dictionary/entities/dictionary.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: 0 })
  streakCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastPracticeDate: Date;

  @Column({ type: 'text', nullable: true })
  avatarUrl: string;

  @Column({ type: 'timestamp', nullable: true })
  lastSeen: Date | null;

  @OneToMany(() => Dictionary, (dictionary) => dictionary.user)
  dictionaries: Dictionary[];
}
