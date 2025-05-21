import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

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

@Injectable({
  providedIn: 'root'
})
export class MovieLifecycleService {
  private apiUrl = 'http://localhost:3000/movies';

  constructor(private http: HttpClient) {}

  getMovieRatingLifecycle(movieId: number): Observable<MovieLifecycleData> {
    return this.http.get<MovieLifecycleData>(`${this.apiUrl}/lifecycle/${movieId}`);
  }
} 