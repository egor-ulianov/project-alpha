import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { MovieLensService } from './movielens.service';
import { MovieLensMovie } from './entities/movielens-movie.entity';
import { UserCluster } from './interfaces/user-cluster.interface';

@Controller('movielens')
export class MovieLensController {
  constructor(private readonly movieLensService: MovieLensService) {}

  @Get('stats')
  async getMovieStats() {
    return this.movieLensService.getMovieStats();
  }

  @Get('stats/genre-evolution')
  async getGenreEvolution() {
    return this.movieLensService.getGenreEvolution();
  }

  @Get('stats/user-clusters')
  async getUserTasteClusters(): Promise<UserCluster[]> {
    return this.movieLensService.getUserTasteClusters();
  }

  @Get('movies')
  async getMovies(@Query('genre') genre?: string) {
    if (genre) {
      return this.movieLensService.getMoviesByGenre(genre);
    }
    return this.movieLensService.getMovies();
  }

  @Get('search')
  async searchMovies(@Query('query') query: string) {
    return this.movieLensService.searchMovies(query);
  }

  @Get('stats/temporal-patterns')
  async getTemporalRatingPatterns(
    @Query('genre') genre?: string
  ): Promise<Array<{
    dayOfWeek: number;
    hour: number;
    count: number;
  }>> {
    return this.movieLensService.getTemporalRatingPatterns(genre);
  }

  @Get('stats/movie-lifecycle/:movieId')
  async getMovieRatingLifecycle(
    @Param('movieId') movieId: string
  ): Promise<{
    movie: {
      title: string;
      releaseYear: number;
    };
    ratings: Array<{
      timestamp: number;
      rating: number;
    }>;
    timeSegments: Array<{
      startTime: number;
      endTime: number;
      averageRating: number;
      ratingCount: number;
    }>;
  }> {
    return this.movieLensService.getMovieRatingLifecycle(parseInt(movieId));
  }

  @Get('stats/user-clusters-pca')
  async getUserClustersPCA() {
    return this.movieLensService.getUserTasteClustersFromPCA();
  }
} 