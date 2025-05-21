export interface Movie {
  id: number;
  title: string;
  year: number;
  ratings?: MovieRating[];
}

export interface MovieRating {
  rating: number;
  timestamp: string;
} 