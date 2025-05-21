import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Movie } from './entities/movie.entity';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

interface CsvMovie {
  id: string;
  name: string;
  year: string;
  rating: string;
  certificate: string;
  duration: string;
  genre: string;
  votes: string;
  gross_income: string;
  directors_id: string;
  directors_name: string;
  stars_id: string;
  stars_name: string;
  description: string;
}

interface DirectorStats {
  movies: Movie[];
  averageRating: number;
  totalMovies: number;
  genres: { [key: string]: number };
  years: { [key: string]: number };
}

interface DirectorStatsResponse {
  director: string;
  averageRating: number;
  totalMovies: number;
  genres: { genre: string; count: number }[];
  moviesByYear: { year: number; count: number }[];
  topMovies: {
    title: string;
    year: number;
    rating: number;
    genres: string[];
  }[];
}

interface ImportResponse {
  success: boolean;
  message: string;
}

interface DimensionalityReductionResult {
  points: Array<{
    x: number;
    y: number;
    id: number;
    title: string;
    year: number;
    rating: number;
    country: string;
    genres: string[];
  }>;
  metadata: {
    technique: string;
    startYear: number;
    endYear: number;
    totalPoints: number;
  };
}

@Injectable()
export class MoviesService {
  constructor(
    @InjectRepository(Movie)
    private moviesRepository: Repository<Movie>,
  ) {}

  async getGenreTrends(startYear: number, endYear: number) {
    const movies = await this.moviesRepository
      .createQueryBuilder('movie')
      .where('movie.year BETWEEN :startYear AND :endYear', { startYear, endYear })
      .getMany();

    const genreTrends = {};
    movies.forEach(movie => {
      movie.genres.forEach(genre => {
        if (!genreTrends[genre]) {
          genreTrends[genre] = {};
        }
        if (!genreTrends[genre][movie.year]) {
          genreTrends[genre][movie.year] = 0;
        }
        genreTrends[genre][movie.year]++;
      });
    });

    return genreTrends;
  }

  async getRatingTrends(startYear: number, endYear: number) {
    return this.moviesRepository
      .createQueryBuilder('movie')
      .select('movie.year', 'year')
      .addSelect('AVG(movie.rating)', 'averageRating')
      .where('movie.year BETWEEN :startYear AND :endYear', { startYear, endYear })
      .groupBy('movie.year')
      .orderBy('movie.year', 'ASC')
      .getRawMany();
  }

  async getCountryComparison(startYear: number, endYear: number) {
    return this.moviesRepository
      .createQueryBuilder('movie')
      .select('movie.country', 'country')
      .addSelect('AVG(movie.rating)', 'averageRating')
      .addSelect('COUNT(*)', 'movieCount')
      .where('movie.year BETWEEN :startYear AND :endYear', { startYear, endYear })
      .groupBy('movie.country')
      .having('COUNT(*) > 10')
      .orderBy('averageRating', 'DESC')
      .getRawMany();
  }

  private extractYear(yearStr: string): number {
    // Handle cases like "(2018– )" or "2018"
    const match = yearStr.match(/\d{4}/);
    return match ? parseInt(match[0], 10) : NaN;
  }

  private parseVotes(votesStr: string): number {
    // Remove commas and any non-numeric characters
    return parseInt(votesStr.replace(/[^0-9]/g, ''), 10);
  }

  async importMovies(file: Express.Multer.File): Promise<ImportResponse> {
    try {
      console.log('File received:', {
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      });

      const validMovies: Movie[] = [];
      let processedCount = 0;
      let validCount = 0;
      const BATCH_SIZE = 1000;

      return new Promise<ImportResponse>((resolve, reject) => {
        const parser = createReadStream(file.path)
          .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
            skipRecordsWithError: true,
            relaxColumnCount: true,
            delimiter: ',',
            quote: '"',
            escape: '"',
          }));

        parser.on('data', (record: CsvMovie) => {
          processedCount++;
          const movie = new Movie();
          movie.title = record.name;
          movie.year = this.extractYear(record.year);
          movie.genres = record.genre.split(',').map(g => g.trim());
          movie.rating = parseFloat(record.rating);
          movie.language = 'Unknown';
          movie.country = 'Unknown';
          movie.description = record.description;
          movie.votes = this.parseVotes(record.votes);
          movie.directors = record.directors_name || 'Unknown';

          if (!isNaN(movie.year) && 
              !isNaN(movie.rating) && 
              !isNaN(movie.votes) &&
              movie.title &&
              movie.genres.length > 0) {
            validMovies.push(movie);
            validCount++;
          }
        });

        parser.on('end', async () => {
          try {
            if (validMovies.length === 0) {
              resolve({
                success: false,
                message: 'No valid movies found in the CSV file. Please check the data format.',
              });
              return;
            }

            // Process in batches
            for (let i = 0; i < validMovies.length; i += BATCH_SIZE) {
              const batch = validMovies.slice(i, i + BATCH_SIZE);
              await this.moviesRepository.save(batch);
              console.log(`Processed batch ${i / BATCH_SIZE + 1} of ${Math.ceil(validMovies.length / BATCH_SIZE)}`);
            }

            fs.unlinkSync(file.path);

            resolve({
              success: true,
              message: `Successfully imported ${validCount} movies out of ${processedCount} records`,
            });
          } catch (error) {
            reject(error);
          }
        });

        parser.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Import error:', error);
      if (file.path) {
        try {
          fs.unlinkSync(file.path);
        } catch (unlinkError) {
          console.error('Error deleting file:', unlinkError);
        }
      }
      return {
        success: false,
        message: `Error importing movies: ${error.message}`,
      };
    }
  }

  async getDirectorStats(startYear: number, endYear: number, minMovies: number = 3): Promise<DirectorStatsResponse[]> {
    const movies = await this.moviesRepository
      .createQueryBuilder('movie')
      .where('movie.year BETWEEN :startYear AND :endYear', { startYear, endYear })
      .getMany();

    // Group movies by director
    const directorStats: { [key: string]: DirectorStats } = {};
    movies.forEach(movie => {
      const directors = movie.directors.split(',').map(d => d.trim());
      directors.forEach(director => {
        if (!directorStats[director]) {
          directorStats[director] = {
            movies: [],
            averageRating: 0,
            totalMovies: 0,
            genres: {},
            years: {}
          };
        }
        directorStats[director].movies.push(movie);
        directorStats[director].totalMovies++;
        directorStats[director].averageRating = 
          (directorStats[director].averageRating * (directorStats[director].totalMovies - 1) + movie.rating) / 
          directorStats[director].totalMovies;

        // Count genres
        movie.genres.forEach(genre => {
          directorStats[director].genres[genre] = (directorStats[director].genres[genre] || 0) + 1;
        });

        // Count movies by year
        directorStats[director].years[movie.year] = (directorStats[director].years[movie.year] || 0) + 1;
      });
    });

    // Filter directors with minimum number of movies and format the response
    const filteredStats = Object.entries(directorStats)
      .filter(([_, stats]) => stats.totalMovies >= minMovies)
      .map(([director, stats]) => ({
        director,
        averageRating: stats.averageRating,
        totalMovies: stats.totalMovies,
        genres: Object.entries(stats.genres).map(([genre, count]) => ({
          genre,
          count
        })),
        moviesByYear: Object.entries(stats.years).map(([year, count]) => ({
          year: parseInt(year),
          count
        })),
        topMovies: stats.movies
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5)
          .map(movie => ({
            title: movie.title,
            year: movie.year,
            rating: movie.rating,
            genres: movie.genres
          }))
      }))
      .sort((a, b) => b.averageRating - a.averageRating);

    return filteredStats;
  }

  async getDirectorCareerProgression(director: string) {
    const movies = await this.moviesRepository
      .createQueryBuilder('movie')
      .where('movie.directors LIKE :director', { director: `%${director}%` })
      .orderBy('movie.year', 'ASC')
      .getMany();

    return movies.map(movie => ({
      year: movie.year,
      title: movie.title,
      rating: movie.rating,
      genres: movie.genres,
      votes: movie.votes
    }));
  }

  async getDimensionalityReduction(
    technique: string,
    startYear: number,
    endYear: number,
  ): Promise<DimensionalityReductionResult> {
    const movies = await this.moviesRepository
      .createQueryBuilder('movie')
      .where('movie.year BETWEEN :startYear AND :endYear', { startYear, endYear })
      .select([
        'movie.id',
        'movie.title',
        'movie.year',
        'movie.rating',
        'movie.country',
        'movie.genres'
      ])
      .getMany();

    // Create a temporary file for the input data
    const scriptsDir = path.join(__dirname, 'scripts');
    const tempInputPath = path.join(scriptsDir, 'temp_input.json');
    const tempOutputPath = path.join(scriptsDir, 'temp_output.json');
    
    try {
      // Ensure the scripts directory exists
      if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
      }

      // Write the movies data to the temporary file
      fs.writeFileSync(tempInputPath, JSON.stringify(movies));

      const scriptPath = path.join(__dirname, 'scripts', 'dimensionality_reduction.py');
      console.log('Running Python script:', scriptPath);
      console.log('With arguments:', [technique, tempInputPath, tempOutputPath]);

      const pythonProcess = spawn('python', [
        scriptPath,
        technique,
        tempInputPath,
        tempOutputPath
      ]);

      return new Promise((resolve, reject) => {
        let stdout = '';
        let stderr = '';

        pythonProcess.stdout.on('data', (data) => {
          const output = data.toString();
          stdout += output;
          console.log('Python stdout:', output);
        });

        pythonProcess.stderr.on('data', (data) => {
          const error = data.toString();
          stderr += error;
          console.error('Python stderr:', error);
        });

        pythonProcess.on('close', (code) => {
          try {
            // Clean up the input file
            if (fs.existsSync(tempInputPath)) {
              fs.unlinkSync(tempInputPath);
            }

            if (code !== 0) {
              console.error('Python script failed with code:', code);
              console.error('Python stdout:', stdout);
              console.error('Python stderr:', stderr);
              reject(new Error(`Python script failed with code ${code}: ${stderr}`));
              return;
            }

            if (!fs.existsSync(tempOutputPath)) {
              console.error('Output file not found:', tempOutputPath);
              console.error('Python stdout:', stdout);
              console.error('Python stderr:', stderr);
              reject(new Error('Python script did not create output file'));
              return;
            }

            // Read and parse the output file
            const result = JSON.parse(fs.readFileSync(tempOutputPath, 'utf8'));
            
            // Clean up the output file
            if (fs.existsSync(tempOutputPath)) {
              fs.unlinkSync(tempOutputPath);
            }
            
            resolve(result);
          } catch (e) {
            // Clean up files in case of error
            try {
              if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
              if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
            } catch (cleanupError) {
              console.error('Error cleaning up temporary files:', cleanupError);
            }
            console.error('Error processing Python script output:', e);
            console.error('Python stdout:', stdout);
            console.error('Python stderr:', stderr);
            reject(new Error(`Failed to process Python script output: ${e.message}`));
          }
        });
      });
    } catch (error) {
      // Clean up files in case of error
      try {
        if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
        if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
      } catch (cleanupError) {
        console.error('Error cleaning up temporary files:', cleanupError);
      }
      console.error('Error in getDimensionalityReduction:', error);
      throw error;
    }
  }
} 