export interface GenreDistribution {
  genre: string;
  count: number;
}

export interface GenreEvolution {
  year: number;
  genres: { [key: string]: number };
}

export interface RatingPattern {
  timestamp: number;
  count: number;
}

export interface MovieStats {
  genreDistribution: GenreDistribution[];
  genreEvolution: GenreEvolution[];
  ratingPatterns: RatingPattern[];
  totalMovies: number;
  totalRatings: number;
  averageRating: number;
} 