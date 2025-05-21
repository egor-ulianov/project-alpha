import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Movie {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  year: number;

  @Column('simple-array')
  genres: string[];

  @Column('float')
  rating: number;

  @Column()
  language: string;

  @Column()
  country: string;

  @Column('text')
  description: string;

  @Column('int')
  votes: number;

  @Column()
  directors: string;
} 