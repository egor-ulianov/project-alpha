import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity()
export class MovieLensMovie {
  @PrimaryColumn()
  movieId: number;

  @Column()
  title: string;

  @Column('simple-array')
  genres: string[];

  @Column({ nullable: true })
  imdbId: string;

  @Column({ nullable: true })
  tmdbId: string;
} 