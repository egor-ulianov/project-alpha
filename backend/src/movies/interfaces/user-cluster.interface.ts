export interface UserCluster {
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