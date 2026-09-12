import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Word } from '../../word/entities/word.entity';

@Entity('dictionary')
export class Dictionary {
  @PrimaryGeneratedColumn()
  dictionaryId: number;

  @Column({ length: 100 })
  dictionaryName: string;

  @Column({ length: 100 })
  language: string;

  @Column({ default: 0 })
  amountWord: number;

  @Column({ type: 'text', nullable: true })
  coverImage: string;

  @Column({ default: true })
  showName: boolean;

  @Column({ default: true })
  showLanguage: boolean;

  @Column({ default: true })
  showFlag: boolean;

  @Column({ default: true })
  showProgress: boolean;

  @Column({ default: true })
  showImported: boolean;

  @Column({ default: false })
  isImported: boolean;

  @Column({ default: false })
  isPinned: boolean;

  @Column({ type: 'float', default: 1.0 })
  editOpacity: number;

  @Column({ type: 'float', default: 1.0 })
  pinOpacity: number;

  @ManyToOne(() => User, (user) => user.dictionaries, { onDelete: 'CASCADE' })
  user: User;

  @OneToMany(() => Word, (word) => word.dictionary, { cascade: true })
  words: Word[];
}
