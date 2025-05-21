import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoviesModule } from './movies/movies.module';
import { Movie } from './movies/entities/movie.entity';
import { MovieLensMovie } from './movies/entities/movielens-movie.entity';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { MovieLensModule } from './movies/movielens.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'database.sqlite',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    MoviesModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 3600000, // 1 hour default TTL
      max: 100, // maximum number of items in cache
      store: 'memory', // use in-memory store
    }),
    MovieLensModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
