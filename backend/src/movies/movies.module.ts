import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Movie } from './entities/movie.entity';
import { MovieLensMovie } from './entities/movielens-movie.entity';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { MovieLensService } from './movielens.service';
import { MovieLensController } from './movielens.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Movie, MovieLensMovie]),
  ],
  controllers: [MoviesController, MovieLensController],
  providers: [MoviesService, MovieLensService],
})
export class MoviesModule {} 