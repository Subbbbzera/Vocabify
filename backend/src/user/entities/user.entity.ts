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

  @Column({ default: 0 })
  duelWins: number;

  @Column({ default: 0 })
  duelLosses: number;

  @Column({ default: 0 })
  currentWinStreak: number;

  @Column({ default: 0 })
  bestWinStreak: number;
}
