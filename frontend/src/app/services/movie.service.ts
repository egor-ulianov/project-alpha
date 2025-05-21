import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MovieStats } from '../models/movie-stats.model';
import { ClusterInterpretation } from '../models/cluster-interpretation.model';
import { Movie } from '../models/movie.model';

export interface MovieLifecycleData {
  ratings: Array<{
    rating: number;
    timestamp: number;
  }>;
  timeSegments: Array<{
    startTime: number;
    endTime: number;
    ratingCount: number;
    averageRating: number;
  }>;
}

interface ImportResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private apiUrl = 'http://localhost:3000/movies';

  constructor(private http: HttpClient) {}

  getMovieStats(): Observable<MovieStats> {
    return this.http.get<MovieStats>(`${this.apiUrl}/stats`);
  }

  getClusterInterpretations(): Observable<ClusterInterpretation[]> {
    return this.http.get<ClusterInterpretation[]>(`${this.apiUrl}/clusters`);
  }

  getMovies(): Observable<Movie[]> {
    return this.http.get<Movie[]>(`${this.apiUrl}/list`);
  }

  getMovieRatingLifecycle(movieId: number): Observable<MovieLifecycleData> {
    return this.http.get<MovieLifecycleData>(`${this.apiUrl}/lifecycle/${movieId}`);
  }

  getGenreTrends(startYear: number, endYear: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/genre-trends`, {
      params: { startYear: startYear.toString(), endYear: endYear.toString() }
    });
  }

  getRatingTrends(startYear: number, endYear: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/rating-trends`, {
      params: { startYear: startYear.toString(), endYear: endYear.toString() }
    });
  }

  getCountryComparison(startYear: number, endYear: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/country-comparison`, {
      params: { startYear: startYear.toString(), endYear: endYear.toString() }
    });
  }

  getDirectorStats(startYear: number, endYear: number, minMovies: number = 3): Observable<any> {
    return this.http.get(`${this.apiUrl}/director-stats`, {
      params: {
        startYear: startYear.toString(),
        endYear: endYear.toString(),
        minMovies: minMovies.toString()
      }
    });
  }

  getDirectorCareerProgression(director: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/director-career/${encodeURIComponent(director)}`);
  }

  importMovies(file: FormData): Observable<ImportResponse> {
    return this.http.post<ImportResponse>(`${this.apiUrl}/import`, file);
  }

  getDimensionalityReduction(
    technique: 'pca' | 'mds' | 'tsne' | 'umap',
    startYear: number,
    endYear: number
  ) {
    return this.http.get<any>(`${this.apiUrl}/dimensionality-reduction`, {
      params: {
        technique,
        startYear: startYear.toString(),
        endYear: endYear.toString()
      }
    });
  }
} 