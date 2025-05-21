import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovieLensController } from './movielens.controller';
import { MovieLensService } from './movielens.service';
import { MovieLensMovie } from './entities/movielens-movie.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([MovieLensMovie])
  ],
  controllers: [MovieLensController],
  providers: [MovieLensService],
  exports: [MovieLensService]
})
export class MovieLensModule {} 