import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MovieLensMovie } from './entities/movielens-movie.entity';
import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import * as path from 'path';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UserCluster } from './interfaces/user-cluster.interface';
import { PCA } from 'ml-pca';

interface MovieLensRating {
  userId: number;
  movieId: number;
  rating: number;
  timestamp: number;
}

interface MovieLensTag {
  userId: number;
  movieId: number;
  tag: string;
  timestamp: number;
}

interface YearGroup {
  year: number;
  totalMovies: number;
  genres: { [key: string]: number };
}

interface UserPreference {
  userId: number;
  genrePreferences: { [genre: string]: number };
  sampleRatings: Array<{
    movieId: number;
    title: string;
    rating: number;
    genres: string[];
  }>;
}

interface PCAUserEmbedding {
  userId: number;
  pc1: number;
  pc2: number;
}

/**
 * Service for handling MovieLens dataset operations
 * Provides functionality for movie data import, analysis, and visualization
 * Includes methods for genre analysis, user clustering, and temporal patterns
 */
@Injectable()
export class MovieLensService {
  private readonly logger = new Logger(MovieLensService.name);

  constructor(
    @InjectRepository(MovieLensMovie)
    private movieLensRepository: Repository<MovieLensMovie>,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache
  ) {}

  /**
   * Imports movies from a CSV file into the database
   * @param filePath - Path to the CSV file containing movie data
   * @returns Promise that resolves when import is complete
   */
  async importMovies(filePath: string): Promise<void> {
    const movies: MovieLensMovie[] = [];
    
    return new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (record) => {
          const movie = new MovieLensMovie();
          movie.movieId = parseInt(record.movieId);
          movie.title = record.title;
          movie.genres = record.genres.split('|');
          movies.push(movie);
        })
        .on('end', async () => {
          try {
            await this.movieLensRepository.save(movies);
            await this.cacheManager.del('movie_stats');
            await this.cacheManager.del('genre_evolution');
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Retrieves movie statistics including total count and genre distribution
   * @returns Promise containing movie statistics with genre distribution
   */
  async getMovieStats(): Promise<any> {
    const cacheKey = 'movie_stats';
    this.logger.debug(`Checking cache for key: ${cacheKey}`);
    const cachedStats = await this.cacheManager.get(cacheKey);
    
    if (cachedStats) {
      this.logger.debug('Cache hit for movie stats');
      return cachedStats as any;
    }

    this.logger.debug('Cache miss for movie stats, fetching from database');
    const totalMovies = await this.movieLensRepository.count();
    const genres = await this.movieLensRepository
      .createQueryBuilder('movie')
      .select('movie.genres')
      .getMany();

    const genreCounts = {};
    genres.forEach(movie => {
      movie.genres.forEach(genre => {
        if (genre !== '(no genres listed)') {
          genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        }
      });
    });

    const stats = {
      totalMovies,
      genreDistribution: Object.entries(genreCounts).map(([genre, count]) => ({
        genre,
        count,
        percentage: (count as number / totalMovies * 100).toFixed(2)
      }))
    };

    this.logger.debug('Caching movie stats');
    await this.cacheManager.set(cacheKey, stats, 3600000);
    return stats;
  }

  /**
   * Retrieves genre evolution data over time
   * @returns Promise containing genre distribution by year
   */
  async getGenreEvolution(): Promise<any[]> {
    const cacheKey = 'genre_evolution';
    this.logger.debug(`Checking cache for key: ${cacheKey}`);
    const cachedEvolution = await this.cacheManager.get(cacheKey);
    
    if (cachedEvolution) {
      this.logger.debug('Cache hit for genre evolution');
      return cachedEvolution as any[];
    }

    this.logger.debug('Cache miss for genre evolution, fetching from database');
    const movies = await this.movieLensRepository
      .createQueryBuilder('movie')
      .select(['movie.title', 'movie.genres'])
      .getMany();

    const moviesWithYear = movies.map(movie => {
      const yearMatch = movie.title.match(/\((\d{4})\)/);
      const year = yearMatch ? parseInt(yearMatch[1]) : null;
      return { ...movie, year };
    }).filter(movie => movie.year !== null);

    const yearGroups: { [key: number]: YearGroup } = {};
    moviesWithYear.forEach(movie => {
      if (!yearGroups[movie.year]) {
        yearGroups[movie.year] = {
          year: movie.year,
          totalMovies: 0,
          genres: {}
        };
      }
      yearGroups[movie.year].totalMovies++;
      movie.genres.forEach(genre => {
        if (genre !== '(no genres listed)') {
          yearGroups[movie.year].genres[genre] = (yearGroups[movie.year].genres[genre] || 0) + 1;
        }
      });
    });

    const evolution = Object.values(yearGroups).map(yearData => ({
      year: yearData.year,
      totalMovies: yearData.totalMovies,
      genres: Object.entries(yearData.genres).map(([genre, count]) => ({
        genre,
        count
      }))
    })).sort((a, b) => a.year - b.year);

    this.logger.debug('Caching genre evolution data');
    await this.cacheManager.set(cacheKey, evolution, 3600000);
    return evolution;
  }

  /**
   * Retrieves movies by genre
   * @param genre - Genre to filter movies by
   * @returns Promise containing array of movies in the specified genre
   */
  async getMoviesByGenre(genre: string): Promise<MovieLensMovie[]> {
    const cacheKey = `movies_by_genre_${genre}`;
    const cachedMovies = await this.cacheManager.get(cacheKey);
    
    if (cachedMovies) {
      return cachedMovies as MovieLensMovie[];
    }

    const movies = await this.movieLensRepository
      .createQueryBuilder('movie')
      .where('movie.genres LIKE :genre', { genre: `%${genre}%` })
      .getMany();

    await this.cacheManager.set(cacheKey, movies, 3600000);
    return movies;
  }

  /**
   * Searches movies by title
   * @param query - Search query string
   * @returns Promise containing array of matching movies
   */
  async searchMovies(query: string): Promise<MovieLensMovie[]> {
    const cacheKey = `search_${query}`;
    const cachedResults = await this.cacheManager.get(cacheKey);
    
    if (cachedResults) {
      return cachedResults as MovieLensMovie[];
    }

    const movies = await this.movieLensRepository
      .createQueryBuilder('movie')
      .where('movie.title LIKE :query', { query: `%${query}%` })
      .getMany();

    await this.cacheManager.set(cacheKey, movies, 300000);
    return movies;
  }

  /**
   * Retrieves user taste clusters based on genre preferences
   * @returns Promise containing array of user clusters with coordinates and sample ratings
   */
  async getUserTasteClusters(): Promise<UserCluster[]> {
    const cacheKey = 'user_taste_clusters';
    this.logger.debug(`Checking cache for key: ${cacheKey}`);
    const cachedClusters = await this.cacheManager.get(cacheKey);
    
    if (cachedClusters) {
      this.logger.debug('Cache hit for user taste clusters');
      return cachedClusters as UserCluster[];
    }

    this.logger.debug('Cache miss for user taste clusters, computing...');
    
    const userPreferences = await this.getUserPreferences();
    
    const points = userPreferences.map(user => {
      const preferences = Object.values(user.genrePreferences);
      const x = preferences.reduce((sum, val, i) => sum + val * Math.cos(i), 0);
      const y = preferences.reduce((sum, val, i) => sum + val * Math.sin(i), 0);
      return { x, y };
    });

    const kmeans = new KMeans(5); 
    const clusters = kmeans.fit(points.map(p => [p.x, p.y]));

    const results = userPreferences.map((user, i) => ({
      userId: user.userId,
      x: points[i].x,
      y: points[i].y,
      cluster: clusters[i],
      sampleRatings: user.sampleRatings
    }));

    await this.cacheManager.set(cacheKey, results, 3600000);
    return results;
  }

  /**
   * Retrieves user preferences based on movie ratings
   * @returns Promise containing array of user preferences with genre preferences and sample ratings
   */
  private async getUserPreferences(): Promise<UserPreference[]> {
    const ratingsPath = path.join(__dirname, '../../../dataset/ratings.csv');
    const moviesPath = path.join(__dirname, '../../../dataset/movies.csv');

    const ratings: any[] = [];
    const movies: any[] = [];

    await new Promise((resolve, reject) => {
      createReadStream(ratingsPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (record) => {
          ratings.push({
            userId: parseInt(record.userId),
            movieId: parseInt(record.movieId),
            rating: parseFloat(record.rating)
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    await new Promise((resolve, reject) => {
      createReadStream(moviesPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (record) => {
          movies.push({
            movieId: parseInt(record.movieId),
            title: record.title,
            genres: record.genres.split('|')
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    const movieMap = new Map(movies.map(movie => [movie.movieId, movie]));

    const userRatings = new Map<number, any[]>();
    ratings.forEach(rating => {
      if (!userRatings.has(rating.userId)) {
        userRatings.set(rating.userId, []);
      }
      userRatings.get(rating.userId)!.push(rating);
    });

    const userPreferences: UserPreference[] = [];
    userRatings.forEach((ratings, userId) => {
      const genrePreferences: { [genre: string]: number } = {};
      const sampleRatings = [];

      ratings.forEach(rating => {
        const movie = movieMap.get(rating.movieId);
        if (movie) {
          movie.genres.forEach(genre => {
            if (genre !== '(no genres listed)') {
              genrePreferences[genre] = (genrePreferences[genre] || 0) + rating.rating;
            }
          });
          if (sampleRatings.length < 5) {
            sampleRatings.push({
              movieId: movie.movieId,
              title: movie.title,
              rating: rating.rating,
              genres: movie.genres
            });
          }
        }
      });

      const totalRatings = Object.values(genrePreferences).reduce((a, b) => a + b, 0);
      Object.keys(genrePreferences).forEach(genre => {
        genrePreferences[genre] = genrePreferences[genre] / totalRatings;
      });

      userPreferences.push({
        userId,
        genrePreferences,
        sampleRatings
      });
    });

    return userPreferences;
  }

  /**
   * Applies PCA to user preferences to reduce dimensionality
   * @param userPreferences - Array of user preferences
   * @returns Array of PCA embeddings for each user
   */
  applyPCAOnUserPreferences(userPreferences: UserPreference[]): PCAUserEmbedding[] {
    const allGenres = new Set<string>();
    for (const pref of userPreferences) {
      Object.keys(pref.genrePreferences).forEach(genre => allGenres.add(genre));
    }
    const genreList = Array.from(allGenres);
  
    const matrix = userPreferences.map(pref =>
      genreList.map(genre => pref.genrePreferences[genre] ?? 0)
    );
  
    const pca = new PCA(matrix, { center: true, scale: true });
    const projected = pca.predict(matrix, { nComponents: 2 }).to2DArray();
  
    return projected.map((coords, i) => ({
      userId: userPreferences[i].userId,
      pc1: coords[0],
      pc2: coords[1]
    }));
  }

  /**
   * Retrieves temporal rating patterns by hour and day of week
   * @param genre - Optional genre to filter patterns by
   * @returns Promise containing array of rating counts by time period
   */
  async getTemporalRatingPatterns(genre?: string): Promise<Array<{
    dayOfWeek: number;
    hour: number;
    count: number;
  }>> {
    const cacheKey = `temporal_patterns${genre ? `_${genre}` : ''}`;
    const cachedPatterns = await this.cacheManager.get(cacheKey);
    
    if (cachedPatterns) {
      return cachedPatterns as Array<{
        dayOfWeek: number;
        hour: number;
        count: number;
      }>;
    }

    const ratingsPath = path.join(__dirname, '../../../dataset/ratings.csv');
    const moviesPath = path.join(__dirname, '../../../dataset/movies.csv');

    const ratings: any[] = [];
    const movies: any[] = [];

    await new Promise((resolve, reject) => {
      createReadStream(ratingsPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (record) => {
          ratings.push({
            userId: parseInt(record.userId),
            movieId: parseInt(record.movieId),
            rating: parseFloat(record.rating),
            timestamp: parseInt(record.timestamp)
          });
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (genre) {
      await new Promise((resolve, reject) => {
        createReadStream(moviesPath)
          .pipe(parse({
            columns: true,
            skip_empty_lines: true,
            trim: true,
          }))
          .on('data', (record) => {
            movies.push({
              movieId: parseInt(record.movieId),
              genres: record.genres.split('|')
            });
          })
          .on('end', resolve)
          .on('error', reject);
      });
    }

    const movieMap = genre ? new Map(movies.map(movie => [movie.movieId, movie])) : null;

    const patterns = new Array(7).fill(0).map(() => new Array(24).fill(0));

    ratings.forEach(rating => {
      if (genre) {
        const movie = movieMap?.get(rating.movieId);
        if (!movie || !movie.genres.includes(genre)) {
          return;
        }
      }
      const date = new Date(rating.timestamp * 1000);
      const dayOfWeek = date.getDay();
      const hour = date.getHours();
      patterns[dayOfWeek][hour]++;
    });

    const result = patterns.flatMap((dayPattern, dayOfWeek) =>
      dayPattern.map((count, hour) => ({
        dayOfWeek,
        hour,
        count
      }))
    );

    await this.cacheManager.set(cacheKey, result, 3600000);
    return result;
  }

  /**
   * Retrieves movie rating lifecycle data
   * @param movieId - ID of the movie to get lifecycle data for
   * @returns Promise containing movie info, individual ratings, and time segments
   */
  async getMovieRatingLifecycle(movieId: number): Promise<{
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
    const cacheKey = `movie_lifecycle_${movieId}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    
    if (cachedData) {
      return cachedData as {
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
      };
    }

    const ratingsPath = path.join(__dirname, '../../../dataset/ratings.csv');
    const moviesPath = path.join(__dirname, '../../../dataset/movies.csv');

    const ratings: any[] = [];
    const movies: any[] = [];

    await new Promise((resolve, reject) => {
      createReadStream(ratingsPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (record) => {
          if (parseInt(record.movieId) === movieId) {
            ratings.push({
              timestamp: parseInt(record.timestamp),
              rating: parseFloat(record.rating)
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    await new Promise((resolve, reject) => {
      createReadStream(moviesPath)
        .pipe(parse({
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }))
        .on('data', (record) => {
          if (parseInt(record.movieId) === movieId) {
            const yearMatch = record.title.match(/\((\d{4})\)/);
            const releaseYear = yearMatch ? parseInt(yearMatch[1]) : null;
            movies.push({
              title: record.title,
              releaseYear
            });
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    if (movies.length === 0 || !movies[0].releaseYear) {
      throw new Error('Movie not found or release year not available');
    }

    ratings.sort((a, b) => a.timestamp - b.timestamp);

    const releaseTimestamp = new Date(movies[0].releaseYear, 0, 1).getTime() / 1000;
    const timeSegments: Array<{
      startTime: number;
      endTime: number;
      averageRating: number;
      ratingCount: number;
    }> = [];

    const segmentDuration = 30 * 24 * 60 * 60;
    const maxTime = Math.max(...ratings.map(r => r.timestamp));
    const numSegments = Math.ceil((maxTime - releaseTimestamp) / segmentDuration);

    for (let i = 0; i < numSegments; i++) {
      const startTime = releaseTimestamp + i * segmentDuration;
      const endTime = startTime + segmentDuration;
      
      const segmentRatings = ratings.filter(r => 
        r.timestamp >= startTime && r.timestamp < endTime
      );

      if (segmentRatings.length > 0) {
        timeSegments.push({
          startTime,
          endTime,
          averageRating: segmentRatings.reduce((sum, r) => sum + r.rating, 0) / segmentRatings.length,
          ratingCount: segmentRatings.length
        });
      }
    }

    const result = {
      movie: movies[0],
      ratings,
      timeSegments
    };

    await this.cacheManager.set(cacheKey, result, 3600000);
    return result;
  }

  /**
   * Retrieves all movies from the database
   * @returns Promise containing array of all movies
   */
  async getMovies(): Promise<MovieLensMovie[]> {
    const cacheKey = 'all_movies';
    const cachedMovies = await this.cacheManager.get(cacheKey);
    
    if (cachedMovies) {
      return cachedMovies as MovieLensMovie[];
    }

    const movies = await this.movieLensRepository.find();
    
    await this.cacheManager.set(cacheKey, movies, 3600000);
    return movies;
  }

  /**
   * Retrieves user taste clusters using PCA dimensionality reduction
   * @returns Promise containing array of user clusters in PCA space
   */
  async getUserTasteClustersFromPCA(): Promise<UserCluster[]> {
    const cacheKey = 'user_taste_clusters_pca';
    this.logger.debug(`Checking cache for key: ${cacheKey}`);
    const cachedClusters = await this.cacheManager.get(cacheKey);
    
    if (cachedClusters) {
      this.logger.debug('Cache hit for PCA-based user taste clusters');
      return cachedClusters as UserCluster[];
    }
  
    this.logger.debug('Cache miss for PCA-based user taste clusters, computing...');
  
    const userPreferences = await this.getUserPreferences();
    const pcaEmbeddings = this.applyPCAOnUserPreferences(userPreferences);
    const points = pcaEmbeddings.map(e => [e.pc1, e.pc2]);
    const kmeans = new KMeans(5);
    const clusters = kmeans.fit(points);
  
    const results: UserCluster[] = userPreferences.map((user, i) => ({
      userId: user.userId,
      x: pcaEmbeddings[i].pc1,
      y: pcaEmbeddings[i].pc2,
      cluster: clusters[i],
      sampleRatings: user.sampleRatings
    }));
  
    await this.cacheManager.set(cacheKey, results, 3600000);
    return results;
  }
}

/**
 * Implementation of K-means clustering algorithm
 * Used for clustering user preferences in 2D space
 */
class KMeans {
  private k: number;
  private centroids: number[][] = [];

  constructor(k: number) {
    this.k = k;
  }

  /**
   * Fits the K-means model to the data
   * @param data - Array of data points to cluster
   * @returns Array of cluster assignments for each data point
   */
  fit(data: number[][]): number[] {
    this.centroids = Array.from({ length: this.k }, () => {
      const randomIndex = Math.floor(Math.random() * data.length);
      return [...data[randomIndex]];
    });

    let clusters: number[] = [];
    let oldClusters: number[] = [];

    do {
      oldClusters = [...clusters];
      clusters = this.assignClusters(data);
      this.updateCentroids(data, clusters);
    } while (!this.areClustersEqual(clusters, oldClusters));

    return clusters;
  }

  /**
   * Assigns each data point to the nearest centroid
   * @param data - Array of data points
   * @returns Array of cluster assignments
   */
  private assignClusters(data: number[][]): number[] {
    return data.map(point => {
      const distances = this.centroids.map(centroid => 
        this.euclideanDistance(point, centroid)
      );
      return distances.indexOf(Math.min(...distances));
    });
  }

  /**
   * Updates centroids based on current cluster assignments
   * @param data - Array of data points
   * @param clusters - Current cluster assignments
   */
  private updateCentroids(data: number[][], clusters: number[]): void {
    for (let i = 0; i < this.k; i++) {
      const clusterPoints = data.filter((_, index) => clusters[index] === i);
      if (clusterPoints.length > 0) {
        this.centroids[i] = clusterPoints[0].map((_, j) =>
          clusterPoints.reduce((sum, point) => sum + point[j], 0) / clusterPoints.length
        );
      }
    }
  }

  /**
   * Calculates Euclidean distance between two points
   * @param a - First point
   * @param b - Second point
   * @returns Euclidean distance between points
   */
  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }

  /**
   * Checks if two cluster assignments are equal
   * @param a - First cluster assignment
   * @param b - Second cluster assignment
   * @returns True if assignments are equal
   */
  private areClustersEqual(a: number[], b: number[]): boolean {
    return a.every((val, i) => val === b[i]);
  }
} 