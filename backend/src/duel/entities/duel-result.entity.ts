import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('duel_result')
export class DuelResult {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @Column()
  winnerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'loserId' })
  loser: User;

  @Column()
  loserId: number;

  @Column()
  winnerScore: number;

  @Column()
  loserScore: number;

  @Column({ length: 50 })
  language: string;

  @CreateDateColumn()
  createdAt: Date;
}
