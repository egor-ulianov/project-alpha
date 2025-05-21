import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MovieLensMovie } from '../models/movielens-movie.model';
import { GenreEvolution } from '../models/genre-evolution.model';
import { MovieStats } from '../models/movie-stats.model';
import { ClusterInterpretation } from '../models/cluster-interpretation.model';

interface UserCluster {
  userId: number;
  x: number;
  y: number;
  cluster: number;
  sampleRatings: Array<{
    movieId: number;
    title: string;
    rating: number;
    genres: string[];
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class MovieLensService {
  private apiUrl = 'http://localhost:3000/movielens';

  constructor(private http: HttpClient) {}

  getMovieStats(): Observable<MovieStats> {
    return this.http.get<MovieStats>(`${this.apiUrl}/stats`);
  }

  getClusterInterpretations(): Observable<ClusterInterpretation[]> {
    return this.http.get<UserCluster[]>(`${this.apiUrl}/stats/user-clusters`).pipe(
      map(clusters => {
        console.log('Raw clusters data:', clusters);
        
        // Group clusters by cluster ID
        const clusterGroups = clusters.reduce((acc, cluster) => {
          if (!acc[cluster.cluster]) {
            acc[cluster.cluster] = [];
          }
          acc[cluster.cluster].push(cluster);
          return acc;
        }, {} as { [key: number]: UserCluster[] });

        console.log('Grouped clusters:', clusterGroups);
        console.log('Cluster IDs:', Object.keys(clusterGroups));

        // Create interpretations for each unique cluster
        const interpretations = Object.entries(clusterGroups).map(([clusterId, clusterData]) => {
          const interpretation = {
            id: parseInt(clusterId),
            size: clusterData.length,
            description: `Cluster ${clusterId}`,
            topGenres: this.getTopGenres(clusterData.flatMap(c => c.sampleRatings))
          };
          console.log(`Created interpretation for cluster ${clusterId}:`, interpretation);
          return interpretation;
        });

        console.log('Final interpretations:', interpretations);
        return interpretations;
      })
    );
  }

  private getTopGenres(ratings: Array<{ genres: string[] }>): Array<{ name: string; percentage: number }> {
    console.log('Calculating top genres for ratings:', ratings);
    
    const genreCounts: { [key: string]: number } = {};
    let totalMovies = 0;

    ratings.forEach(rating => {
      rating.genres.forEach(genre => {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        totalMovies++;
      });
    });

    console.log('Genre counts:', genreCounts);
    console.log('Total movies:', totalMovies);

    const topGenres = Object.entries(genreCounts)
      .map(([name, count]) => ({
        name,
        percentage: (count / totalMovies) * 100
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);

    console.log('Top genres:', topGenres);
    return topGenres;
  }

  getMovies(): Observable<MovieLensMovie[]> {
    return this.http.get<MovieLensMovie[]>(`${this.apiUrl}/movies`);
  }

  getMoviesByGenre(genre: string): Observable<MovieLensMovie[]> {
    return this.http.get<MovieLensMovie[]>(`${this.apiUrl}/movies?genre=${encodeURIComponent(genre)}`);
  }

  searchMovies(query: string): Observable<MovieLensMovie[]> {
    return this.http.get<MovieLensMovie[]>(`${this.apiUrl}/search?query=${encodeURIComponent(query)}`);
  }

  getGenreEvolution(): Observable<GenreEvolution[]> {
    return this.http.get<GenreEvolution[]>(`${this.apiUrl}/stats/genre-evolution`);
  }

  getUserTasteClusters(): Observable<UserCluster[]> {
    return this.http.get<UserCluster[]>(`${this.apiUrl}/stats/user-clusters`);
  }

  getUserTasteClustersPCA(): Observable<UserCluster[]> {
    return this.http.get<UserCluster[]>(`${this.apiUrl}/stats/user-clusters-pca`);
  }

  getTemporalRatingPatterns(genre?: string): Observable<Array<{
    dayOfWeek: number;
    hour: number;
    count: number;
  }>> {
    const url = genre 
      ? `${this.apiUrl}/stats/temporal-patterns?genre=${encodeURIComponent(genre)}`
      : `${this.apiUrl}/stats/temporal-patterns`;
    return this.http.get<Array<{
      dayOfWeek: number;
      hour: number;
      count: number;
    }>>(url);
  }

  getMovieRatingLifecycle(movieId: number): Observable<{
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
    return this.http.get<{
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
    }>(`${this.apiUrl}/stats/movie-lifecycle/${movieId}`);
  }
} 