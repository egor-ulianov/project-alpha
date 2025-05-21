export interface TopGenre {
  name: string;
  percentage: number;
}

export interface ClusterInterpretation {
  id: number;
  size: number;
  description: string;
  topGenres: TopGenre[];
} 