import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { MovieLensService } from '../movielens.service';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const movieLensService = app.get(MovieLensService);

  try {
    console.log('Starting MovieLens data import...');
    
    // Import movies
    const moviesPath = path.join(__dirname, '../../../dataset/movies.csv');
    console.log('Importing movies from:', moviesPath);
    await movieLensService.importMovies(moviesPath);
    
    console.log('MovieLens data import completed successfully!');
  } catch (error) {
    console.error('Error importing MovieLens data:', error);
  } finally {
    await app.close();
  }
}

bootstrap(); 