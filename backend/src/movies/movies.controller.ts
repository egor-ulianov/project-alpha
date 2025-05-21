import { Controller, Get, Query, Post, UploadedFile, UseInterceptors, Param, ParseIntPipe } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MoviesService } from './movies.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

interface ImportResponse {
  success: boolean;
  message: string;
}

interface GenreTrends {
  [genre: string]: { [year: number]: number };
}

interface RatingTrend {
  year: number;
  averageRating: number;
}

interface CountryComparison {
  country: string;
  averageRating: number;
  movieCount: number;
}

interface DirectorStats {
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

interface CareerData {
  year: number;
  title: string;
  rating: number;
  genres: string[];
  votes: number;
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

@Controller('movies')
export class MoviesController {
  constructor(private readonly moviesService: MoviesService) {}

  @Get('genre-trends')
  async getGenreTrends(
    @Query('startYear', ParseIntPipe) startYear: number,
    @Query('endYear', ParseIntPipe) endYear: number,
  ): Promise<GenreTrends> {
    return this.moviesService.getGenreTrends(startYear, endYear);
  }

  @Get('rating-trends')
  async getRatingTrends(
    @Query('startYear', ParseIntPipe) startYear: number,
    @Query('endYear', ParseIntPipe) endYear: number,
  ): Promise<RatingTrend[]> {
    return this.moviesService.getRatingTrends(startYear, endYear);
  }

  @Get('country-comparison')
  async getCountryComparison(
    @Query('startYear', ParseIntPipe) startYear: number,
    @Query('endYear', ParseIntPipe) endYear: number,
  ): Promise<CountryComparison[]> {
    return this.moviesService.getCountryComparison(startYear, endYear);
  }

  @Get('director-stats')
  async getDirectorStats(
    @Query('startYear', ParseIntPipe) startYear: number,
    @Query('endYear', ParseIntPipe) endYear: number,
    @Query('minMovies', ParseIntPipe) minMovies: number = 3,
  ): Promise<DirectorStats[]> {
    return this.moviesService.getDirectorStats(startYear, endYear, minMovies);
  }

  @Get('director-career/:director')
  async getDirectorCareerProgression(@Param('director') director: string): Promise<CareerData[]> {
    return this.moviesService.getDirectorCareerProgression(director);
  }

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv') {
          cb(null, true);
        } else {
          cb(new Error('Only CSV files are allowed'), false);
        }
      },
    }),
  )
  async importMovies(@UploadedFile() file: Express.Multer.File): Promise<ImportResponse> {
    if (!file) {
      return {
        success: false,
        message: 'No file uploaded',
      };
    }
    return this.moviesService.importMovies(file);
  }

  @Get('dimensionality-reduction')
  async getDimensionalityReduction(
    @Query('technique') technique: string,
    @Query('startYear', ParseIntPipe) startYear: number,
    @Query('endYear', ParseIntPipe) endYear: number,
  ): Promise<DimensionalityReductionResult> {
    return this.moviesService.getDimensionalityReduction(technique, startYear, endYear);
  }
} 