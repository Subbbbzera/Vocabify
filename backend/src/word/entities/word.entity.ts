import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Dictionary } from '../../dictionary/entities/dictionary.entity';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  text: string;

  @Column({ length: 100 })
  translate: string;

  @Column({ default: false })
  isFavorite: boolean;

  @Column({ default: false })
  important: boolean;

  @Column({ default: false })
  remembered: boolean;

  @Column({ type: 'simple-json', nullable: true })
  extraForms: string[];

  @Column({ type: 'simple-json', nullable: true })
  examples: string[];

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Index()
  @Column()
  dictionaryId: number;

  @ManyToOne(() => Dictionary, (dict) => dict.words, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'dictionaryId' })
  dictionary: Dictionary;
}
