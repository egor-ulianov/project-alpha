import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Movie } from './entities/movie.entity';
import { spawn } from 'child_process';
import { join } from 'path';

@Injectable()
export class AdvancedAnalysisService {
  constructor(
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
  ) {}

  async getDimensionalityReduction(
    technique: 'pca' | 'mds' | 'tsne' | 'umap',
    startYear: number,
    endYear: number,
    nComponents: number = 2,
  ) {
    const movies = await this.movieRepository.find({
      where: {
        year: Between(startYear, endYear)
      },
      select: [
        'id',
        'title',
        'year',
        'rating',
        'genres',
        'directors',
        'country',
      ],
    });

    // Prepare data for Python script
    const data = movies.map(movie => ({
      id: movie.id,
      title: movie.title,
      year: movie.year,
      rating: movie.rating,
      genres: movie.genres,
      directors: movie.directors,
      country: movie.country,
    }));

    return new Promise((resolve, reject) => {
      const pythonScript = join(__dirname, 'scripts', 'dimensionality_reduction.py');
      const pythonProcess = spawn('python3', [
        pythonScript,
        JSON.stringify(data),
        technique,
        nComponents.toString(),
      ]);

      let result = '';
      let error = '';

      pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python process exited with code ${code}: ${error}`));
          return;
        }
        try {
          const parsedResult = JSON.parse(result);
          resolve(parsedResult);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${e.message}`));
        }
      });
    });
  }
} 