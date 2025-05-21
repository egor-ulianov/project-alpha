export interface GenreEvolution {
  year: number;
  totalMovies: number;
  genres: {
    genre: string;
    count: number;
  }[];
} 