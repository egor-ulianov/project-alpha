import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { MovieLensService } from '../../services/movielens.service';
import { MovieLifecycleService } from '../../services/movie-lifecycle.service';
import { MovieLensMovie } from '../../models/movielens-movie.model';
import { MovieStats } from '../../models/movie-stats.model';
import { GenreEvolution } from '../../models/genre-evolution.model';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ClusterInterpretation } from '../../models/cluster-interpretation.model';
import { MovieLifecycleChartComponent } from './charts/movie-lifecycle-chart.component';
import { GenrePieChartComponent } from './charts/genre-pie-chart.component';
import { UserClustersChartComponent } from './charts/user-clusters-chart.component';

/**
 * Component for displaying MovieLens data visualization presentation
 * Handles multiple slides with different visualizations including genre distribution,
 * user clusters, temporal patterns, and movie lifecycle analysis
 */
@Component({
  selector: 'app-movielens-presentation',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, MovieLifecycleChartComponent, GenrePieChartComponent, UserClustersChartComponent],
  templateUrl: './movielens-presentation.component.html',
  styleUrls: ['./movielens-presentation.component.scss']
})
export class MovieLensPresentationComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('genreChart') private genreChartContainer!: ElementRef;
  @ViewChild('clustersChart') private clustersChartContainer!: ElementRef;
  @ViewChild('temporalChart') private temporalChartContainer!: ElementRef;
  @ViewChild('lifecycleChart') private lifecycleChartContainer!: ElementRef;
  @ViewChild('clustersPcaChart') private clustersPcaChartContainer!: ElementRef;

  currentSlide = 0;
  totalSlides = 7;
  movieStats: MovieStats | null = null;
  clusterInterpretations: ClusterInterpretation[] = [];
  movies: MovieLensMovie[] = [];
  selectedMovieId: number = 0;
  selectedGenre: string = '';
  genres: string[] = [];

  private genreSvg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private clustersSvg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private temporalSvg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private lifecycleSvg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private clustersPcaSvg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private margin = { top: 10, right: 20, bottom: 180, left: 60 };
  private width = 0;
  private height = 200;
  private resizeObserver: ResizeObserver;
  private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

  // Modal state for cluster genre pie chart
  showClusterPieModal = false;
  clusterPieData: { genre: string; count: number }[] = [];
  clusterPieTitle: string = '';

  constructor(
    private movieLensService: MovieLensService,
    private movieLifecycleService: MovieLifecycleService
  ) {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateCharts();
    });
  }

  /**
   * Initializes the component and loads required data
   * Loads movie stats, cluster interpretations, and movies data
   */
  ngOnInit() {
    console.log('MovieLensPresentationComponent initialized');
    this.loadData();
  }

  /**
   * Called after view initialization
   * Sets up initial chart containers and starts data visualization
   */
  ngAfterViewInit() {
    console.log('AfterViewInit called');
    setTimeout(() => {
      console.log('Initializing charts...');
      console.log('Lifecycle chart container:', this.lifecycleChartContainer?.nativeElement);
      this.initializeCharts();
    }, 100);
  }

  /**
   * Cleans up resources when component is destroyed
   * Disconnects resize observer
   */
  ngOnDestroy() {
    this.resizeObserver.disconnect();
  }

  /**
   * Advances to the next slide in the presentation
   * Updates charts based on the new slide
   */
  nextSlide() {
    if (this.currentSlide < this.totalSlides - 1) {
      this.currentSlide++;
      this.updateCharts();
    }
  }

  /**
   * Returns to the previous slide in the presentation
   * Updates charts based on the new slide
   */
  previousSlide() {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.updateCharts();
    }
  }

  /**
   * Returns a color for a given genre
   * @param genre - The genre name to get color for
   * @returns Hex color code for the genre
   */
  getGenreColor(genre: string): string {
    const colors: { [key: string]: string } = {
      'Action': '#ef4444',
      'Adventure': '#f97316',
      'Animation': '#f59e0b',
      'Children': '#84cc16',
      'Comedy': '#22c55e',
      'Crime': '#10b981',
      'Documentary': '#14b8a6',
      'Drama': '#06b6d4',
      'Fantasy': '#0ea5e9',
      'Film-Noir': '#3b82f6',
      'Horror': '#6366f1',
      'IMAX': '#8b5cf6',
      'Musical': '#a855f7',
      'Mystery': '#d946ef',
      'Romance': '#ec4899',
      'Sci-Fi': '#f43f5e',
      'Thriller': '#fb7185',
      'War': '#fda4af',
      'Western': '#fecdd3'
    };
    return colors[genre] || '#6b7280';
  }

  /**
   * Returns a color for a given cluster ID
   * @param clusterId - The cluster ID to get color for
   * @returns Hex color code for the cluster
   */
  getClusterColor(clusterId: number): string {
    const colors = [
      '#ef4444', '#f97316', '#f59e0b', '#84cc16',
      '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
      '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6'
    ];
    return colors[clusterId % colors.length];
  }

  /**
   * Loads all required data for the presentation
   * Fetches movie stats, cluster interpretations, and movies data
   * Updates charts after data is loaded
   */
  private loadData() {
    console.log('Loading data...');
    
    this.movieLensService.getMovieStats().subscribe({
      next: (stats) => {
        console.log('Movie stats loaded:', stats);
        this.movieStats = stats;
        // Populate genres for dropdown
        if (stats && stats.genreDistribution) {
          this.genres = stats.genreDistribution.map(g => g.genre).sort();
        }
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading movie stats:', error);
      }
    });

    this.movieLensService.getClusterInterpretations().subscribe({
      next: (interpretations) => {
        console.log('Received cluster interpretations:', interpretations);
        this.clusterInterpretations = interpretations;
        console.log('Set cluster interpretations:', this.clusterInterpretations);
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading cluster interpretations:', error);
      }
    });

    // Load movies first and ensure they are available
    this.movieLensService.getMovies().subscribe({
      next: (movies) => {
        console.log('Movies loaded:', movies);
        this.movies = movies;
        if (movies.length > 0) {
          this.selectedMovieId = movies[0].movieId;
          console.log('Selected first movie:', this.selectedMovieId);
        }
        // Force update of charts after movies are loaded
        this.updateCharts();
      },
      error: (error) => {
        console.error('Error loading movies:', error);
      }
    });
  }

  /**
   * Initializes all chart containers and sets up the tooltip
   * Creates SVG elements for each chart type
   */
  private initializeCharts(): void {
    console.log('Initializing charts...');
    
    this.initializeChartContainer('genreChart', this.genreChartContainer);
    this.initializeChartContainer('clustersChart', this.clustersChartContainer);
    this.initializeChartContainer('temporalChart', this.temporalChartContainer);
    this.initializeChartContainer('lifecycleChart', this.lifecycleChartContainer);
    this.initializeChartContainer('clustersPcaChart', this.clustersPcaChartContainer);

    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    this.updateCharts();
  }

  /**
   * Initializes a single chart container
   * @param name - Name of the chart container
   * @param container - Reference to the container element
   */
  private initializeChartContainer(name: string, container: ElementRef): void {
    if (!container?.nativeElement) {
      console.warn(`${name} container not found`);
      return;
    }

    console.log(`Initializing ${name} container:`, container.nativeElement);

    const element = container.nativeElement;
    this.width = element.offsetWidth - this.margin.left - this.margin.right;
    this.height = element.offsetHeight - this.margin.top - this.margin.bottom;

    console.log(`${name} dimensions:`, { width: this.width, height: this.height });

    d3.select(element).selectAll('*').remove();

    const svg = d3.select(element)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`)
      .style('opacity', 0);

    console.log(`Created SVG for ${name}:`, svg.node());

    svg.transition()
      .duration(500)
      .style('opacity', 1);

    switch (name) {
      case 'genreChart':
        this.genreSvg = svg;
        break;
      case 'clustersChart':
        this.clustersSvg = svg;
        break;
      case 'temporalChart':
        this.temporalSvg = svg;
        break;
      case 'lifecycleChart':
        this.lifecycleSvg = svg;
        console.log('Set lifecycleSvg:', this.lifecycleSvg);
        break;
      case 'clustersPcaChart':
        this.clustersPcaSvg = svg;
        break;
    }

    this.resizeObserver.observe(element);
  }

  /**
   * Updates all charts based on the current slide
   * Creates or updates visualizations for the active slide
   */
  private updateCharts(): void {
    console.log('Updating charts, current slide:', this.currentSlide);
    
    switch (this.currentSlide) {
      case 0:
        if (this.genreSvg && this.movieStats) {
          console.log('Updating genre chart...');
          this.createGenreChart();
        }
        break;
      case 1:
        // Pie chart is handled by the component itself
        break;
      case 2:
        if (this.clustersSvg && this.clusterInterpretations.length > 0) {
          console.log('Updating clusters chart...');
          this.createClustersChart();
        }
        break;
      case 3:
        // Pie chart is handled by the component itself
        break;
      case 4:
        if (this.clustersPcaSvg) {
          this.createClustersPcaChart();
        }
        break;
      case 5:
        if (this.temporalSvg) {
          console.log('Updating temporal chart...');
          this.createTemporalChart();
        }
        break;
      case 6:
        console.log('Updating lifecycle chart...');
        console.log('Lifecycle SVG:', this.lifecycleSvg);
        console.log('Movies:', this.movies);
        if (this.lifecycleSvg) {
          // Ensure movies are loaded before creating the chart
          if (!this.movies || this.movies.length === 0) {
            console.log('Loading movies for lifecycle chart...');
            this.movieLensService.getMovies().subscribe({
              next: (movies) => {
                console.log('Movies loaded for lifecycle chart:', movies);
                this.movies = movies;
                this.createLifecycleChart();
              },
              error: (error) => {
                console.error('Error loading movies for lifecycle chart:', error);
              }
            });
          } else {
            console.log('Using existing movies for lifecycle chart');
            this.createLifecycleChart();
          }
        } else {
          console.warn('Lifecycle SVG is null, cannot create chart');
        }
        break;
    }
  }

  /**
   * Creates a bar chart showing genre distribution
   * Displays the count of movies for each genre with interactive features
   */
  private createGenreChart(): void {
    if (!this.genreSvg || !this.movieStats) return;

    this.genreSvg.selectAll('*').remove();

    const data = this.movieStats.genreDistribution;
    const chartWidth = this.width;

    const x = d3.scaleBand()
      .domain(data.map(d => d.genre))
      .range([0, chartWidth])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .range([this.height, 0]);

    const bars = this.genreSvg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.genre) || 0)
      .attr('y', this.height)
      .attr('width', x.bandwidth())
      .attr('height', 0)
      .attr('fill', d => this.getGenreColor(d.genre))
      .attr('fill-opacity', 0.6)
      .attr('class', d => `genre-bar genre-${d.genre.replace(/\s+/g, '-').toLowerCase()}`)
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .style('fill-opacity', 0.8)
          .style('stroke', '#fff')
          .style('stroke-width', 1.5);
      })
      .on('mouseout', (event, d) => {
        if (!d3.select(event.currentTarget).classed('highlighted')) {
          d3.select(event.currentTarget)
            .style('fill-opacity', 0.6)
            .style('stroke', 'none');
        }
      });

    bars.transition()
      .duration(1000)
      .attr('y', d => y(d.count))
      .attr('height', d => this.height - y(d.count));

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    this.genreSvg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .attr('transform', 'rotate(-45)')
      .style('fill', '#6b7280')
      .style('font-size', '12px')
      .attr('dx', '-.8em')
      .attr('dy', '1.5em');

    this.genreSvg.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#6b7280')
      .style('font-size', '12px');

    const legendGroup = this.genreSvg.append('g')
      .attr('class', 'genre-legend')
      .attr('transform', `translate(0, ${this.height + 80})`);

    const itemsPerRow = 5;
    const rows = Math.ceil(data.length / itemsPerRow);
    const rowHeight = 25;
    const itemWidth = chartWidth / itemsPerRow;

    data.forEach((genre, i) => {
      const row = Math.floor(i / itemsPerRow);
      const col = i % itemsPerRow;
      
      const legendItem = legendGroup.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${col * itemWidth}, ${row * rowHeight})`)
        .style('cursor', 'pointer')
        .on('click', () => {
          const isHighlighted = d3.selectAll(`.genre-${genre.genre.replace(/\s+/g, '-').toLowerCase()}`).classed('highlighted');
          
          d3.selectAll('.genre-bar')
            .style('fill-opacity', 0.6)
            .style('stroke', 'none')
            .classed('highlighted', false);

          d3.selectAll('.legend-item')
            .select('rect')
            .style('stroke-width', 1)
            .style('stroke', '#fff');

          if (!isHighlighted) {
            d3.selectAll(`.genre-${genre.genre.replace(/\s+/g, '-').toLowerCase()}`)
              .style('fill-opacity', 1)
              .style('stroke', '#fff')
              .style('stroke-width', 2)
              .classed('highlighted', true);

            d3.selectAll('.genre-bar:not(.highlighted)')
              .style('fill-opacity', 0.2);

            legendItem.select('rect')
              .style('stroke-width', 2)
              .style('stroke', '#000');
          }
        });

      legendItem.append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .style('fill', this.getGenreColor(genre.genre))
        .style('fill-opacity', 0.6)
        .style('stroke', '#fff')
        .style('stroke-width', 1);

      legendItem.append('text')
        .attr('x', 24)
        .attr('y', 12)
        .text(`${genre.genre} (${genre.count})`)
        .style('fill', '#6b7280')
        .style('font-size', '12px');
    });
  }

  /**
   * Creates a scatter plot showing user taste clusters
   * Displays clusters of users based on their rating patterns
   */
  private createClustersChart(): void {
    if (!this.clustersSvg) return;

    this.clustersSvg.selectAll('*').remove();

    this.movieLensService.getUserTasteClusters().subscribe({
      next: (clusters) => {
        if (!clusters || clusters.length === 0) {
          console.warn('No user clusters data received');
          return;
        }

        const chartWidth = this.width;

        const x = d3.scaleLinear()
          .domain([d3.min(clusters, d => d.x) || 0, d3.max(clusters, d => d.x) || 0])
          .range([0, chartWidth]);

        const y = d3.scaleLinear()
          .domain([d3.min(clusters, d => d.y) || 0, d3.max(clusters, d => d.y) || 0])
          .range([this.height, 0]);

        const maxCluster = d3.max(clusters, d => d.cluster) || 0;
        const color = d3.scaleOrdinal<string>()
          .domain(d3.range(maxCluster + 1).map(String))
          .range(d3.schemeCategory10);

        if (this.clustersSvg) {
          const points = this.clustersSvg.selectAll('circle')
            .data(clusters)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 0)
            .attr('class', d => `cluster-point cluster-${d.cluster}`)
            .style('fill', d => color(d.cluster.toString()))
            .style('fill-opacity', 0.6)
            .on('mouseover', (event, d) => {
              d3.select(event.currentTarget)
                .style('fill-opacity', 0.8)
                .style('stroke', '#fff')
                .style('stroke-width', 1.5);
            })
            .on('mouseout', (event, d) => {
              d3.select(event.currentTarget)
                .style('fill-opacity', 0.6)
                .style('stroke', 'none');
            });

          points.transition()
            .duration(1000)
            .attr('r', 4);

          const xAxis = d3.axisBottom(x);
          const yAxis = d3.axisLeft(y);

          this.clustersSvg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(xAxis)
            .selectAll('text')
            .style('fill', '#6b7280')
            .style('font-size', '12px');

          this.clustersSvg.append('g')
            .call(yAxis)
            .selectAll('text')
            .style('fill', '#6b7280')
            .style('font-size', '12px');

          const legendGroup = this.clustersSvg.append('g')
            .attr('class', 'cluster-legend')
            .attr('transform', `translate(0, ${this.height + 80})`);

          const itemsPerRow = 4;
          const rows = Math.ceil((maxCluster + 1) / itemsPerRow);
          const rowHeight = 25;

          d3.range(maxCluster + 1).forEach((clusterId, i) => {
            const row = Math.floor(i / itemsPerRow);
            const col = i % itemsPerRow;
            const legendItem = legendGroup.append('g')
              .attr('class', 'legend-item')
              .attr('transform', `translate(${col * (chartWidth / itemsPerRow)}, ${row * rowHeight})`)
              .style('cursor', 'pointer')
              .on('mouseover', () => {
                d3.selectAll('.cluster-point')
                  .style('fill-opacity', 0.2);
                d3.selectAll(`.cluster-${clusterId}`)
                  .style('fill-opacity', 1)
                  .style('stroke', '#000')
                  .style('stroke-width', 2);
                legendItem.select('circle')
                  .style('stroke-width', 2)
                  .style('stroke', '#000');
              })
              .on('mouseout', () => {
                d3.selectAll('.cluster-point')
                  .style('fill-opacity', 0.6)
                  .style('stroke', 'none');
                legendItem.select('circle')
                  .style('stroke-width', 1)
                  .style('stroke', '#fff');
              })
              .on('click', () => {
                const clusterData = clusters.filter(c => c.cluster === clusterId);
                const genreCounts: { [key: string]: number } = {};
                let total = 0;
                clusterData.forEach(c => {
                  c.sampleRatings.forEach(r => {
                    r.genres.forEach(g => {
                      genreCounts[g] = (genreCounts[g] || 0) + 1;
                      total++;
                    });
                  });
                });
                const genreDistribution = Object.entries(genreCounts).map(([genre, count]) => ({ genre, count }));
                this.clusterPieData = genreDistribution;
                const interpretation = this.clusterInterpretations.find(ci => ci.id === clusterId);
                this.clusterPieTitle = interpretation ? `Cluster ${clusterId}: ${interpretation.description}` : `Cluster ${clusterId}`;
                this.showClusterPieModal = true;
              });

            legendItem.append('circle')
              .attr('r', 6)
              .style('fill', color(clusterId.toString()))
              .style('fill-opacity', 0.6)
              .style('stroke', '#fff')
              .style('stroke-width', 1);

            const interpretation = this.clusterInterpretations.find(ci => ci.id === clusterId);
            const label = interpretation ? 
              `Cluster ${clusterId}: ${interpretation.description}` : 
              `Cluster ${clusterId}`;

            legendItem.append('text')
              .attr('x', 16)
              .attr('y', 4)
              .text(label)
              .style('fill', '#6b7280')
              .style('font-size', '12px');
          });
        }
      },
      error: (error) => {
        console.error('Error loading user clusters:', error);
      }
    });
  }

  /**
   * Creates a heatmap showing temporal rating patterns
   * Displays rating frequency by hour and day of week
   */
  private createTemporalChart(): void {
    if (!this.temporalSvg) return;
    this.temporalSvg.selectAll('*').remove();
    this.updateTemporalChart(this.selectedGenre);
  }

  /**
   * Creates a chart showing movie rating lifecycle
   * Displays individual ratings, average rating, and rating count over time
   */
  private createLifecycleChart(): void {
    if (!this.lifecycleSvg) return;

    this.lifecycleSvg.selectAll('*').remove();

    const chartWidth = this.width;

    const x = d3.scaleLinear()
      .domain([0, 100])
      .range([0, chartWidth]);

    const y = d3.scaleLinear()
      .domain([0, 5])
      .range([this.height, 0]);

    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    this.lifecycleSvg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#6b7280')
      .style('font-size', '12px');

    this.lifecycleSvg.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#6b7280')
      .style('font-size', '12px');

    const legendGroup = this.lifecycleSvg.append('g')
      .attr('class', 'lifecycle-legend')
      .attr('transform', `translate(0, ${this.height + 80})`);

    const legendItems = [
      { label: 'Individual Ratings', color: '#3b82f6', class: 'rating-dot' },
      { label: 'Average Rating', color: '#3b82f6', class: 'rating-line' },
      { label: 'Rating Count', color: '#e5e7eb', class: 'rating-count-bar' }
    ];

    const itemSpacing = chartWidth / (legendItems.length + 1);
    const startX = itemSpacing;

    legendItems.forEach((item, i) => {
      const legendItem = legendGroup.append('g')
        .attr('class', 'legend-item')
        .attr('transform', `translate(${startX + i * itemSpacing}, 0)`)
        .style('cursor', 'pointer')
        .on('click', () => {
          const isVisible = d3.selectAll(`.${item.class}`).style('opacity') !== '0';
          d3.selectAll(`.${item.class}`)
            .style('opacity', isVisible ? 0 : 1);
          legendItem.select('rect')
            .style('fill-opacity', isVisible ? 0.3 : 0.6);
        });

      legendItem.append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .style('fill', item.color)
        .style('fill-opacity', 0.6)
        .style('stroke', '#fff')
        .style('stroke-width', 1);

      legendItem.append('text')
        .attr('x', 24)
        .attr('y', 12)
        .text(item.label)
        .style('fill', '#6b7280')
        .style('font-size', '12px');
    });

    this.updateLifecycleChart(this.selectedMovieId);
  }

  /**
   * Updates the lifecycle chart for a specific movie
   * @param movieId - ID of the movie to display lifecycle data for
   */
  private updateLifecycleChart(movieId: number): void {
    if (!this.lifecycleSvg) return;
    const svg = this.lifecycleSvg;

    svg.selectAll(':not(.movie-selector)').remove();

    svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .attr('text-anchor', 'middle')
      .style('fill', '#6b7280')
      .text('Loading movie data...');

    this.movieLifecycleService.getMovieRatingLifecycle(movieId).subscribe({
      next: (data) => {
        if (!data || !data.ratings || data.ratings.length === 0) {
          svg.selectAll(':not(.movie-selector)').remove();
          svg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', '#6b7280')
            .text('No rating data available for this movie.');
          return;
        }

        svg.selectAll(':not(.movie-selector)').remove();

        const chartWidth = this.width;

        const x = d3.scaleTime()
          .domain([
            new Date(data.timeSegments[0].startTime * 1000),
            new Date(data.timeSegments[data.timeSegments.length - 1].endTime * 1000)
          ])
          .range([0, chartWidth]);

        const y = d3.scaleLinear()
          .domain([0, 5])
          .range([this.height, 0]);

        const y2 = d3.scaleLinear()
          .domain([0, d3.max(data.timeSegments, d => d.ratingCount) || 0])
          .range([this.height, 0]);

        const gradient = svg.append('defs')
          .append('linearGradient')
          .attr('id', 'rating-gradient')
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '0%')
          .attr('y2', '100%');

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', '#3b82f6')
          .attr('stop-opacity', 0.2);

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', '#3b82f6')
          .attr('stop-opacity', 0.05);

        const bars = svg.selectAll('rect')
          .data(data.timeSegments)
          .enter()
          .append('rect')
          .attr('class', 'rating-count-bar')
          .attr('x', d => x(new Date(d.startTime * 1000)))
          .attr('y', this.height)
          .attr('width', d => x(new Date(d.endTime * 1000)) - x(new Date(d.startTime * 1000)))
          .attr('height', 0)
          .style('fill', '#e5e7eb')
          .style('fill-opacity', 0.5)
          .on('mouseover', (event, d) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 0.7)
              .style('stroke', '#fff')
              .style('stroke-width', 1);

            this.tooltip
              .style('opacity', 1)
              .html(`
                <div class="tooltip-content">
                  <h4>Rating Period</h4>
                  <p>Start: ${new Date(d.startTime * 1000).toLocaleDateString()}</p>
                  <p>End: ${new Date(d.endTime * 1000).toLocaleDateString()}</p>
                  <p>Number of Ratings: ${d.ratingCount}</p>
                  <p>Average Rating: ${d.averageRating.toFixed(2)}</p>
                </div>
              `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', (event, d) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 0.5)
              .style('stroke', 'none');
            this.tooltip.style('opacity', 0);
          });

        bars.transition()
          .duration(1000)
          .attr('y', d => y2(d.ratingCount))
          .attr('height', d => this.height - y2(d.ratingCount));

        const dots = svg.selectAll('circle')
          .data(data.ratings)
          .enter()
          .append('circle')
          .attr('class', 'rating-dot')
          .attr('cx', d => x(new Date(d.timestamp * 1000)))
          .attr('cy', d => y(d.rating))
          .attr('r', 0)
          .style('fill', '#3b82f6')
          .style('fill-opacity', 0.6)
          .style('stroke', '#fff')
          .style('stroke-width', 1)
          .on('mouseover', (event, d) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 1)
              .style('stroke-width', 2);

            this.tooltip
              .style('opacity', 1)
              .html(`
                <div class="tooltip-content">
                  <h4>Individual Rating</h4>
                  <p>Rating: ${d.rating}</p>
                  <p>Date: ${new Date(d.timestamp * 1000).toLocaleDateString()}</p>
                </div>
              `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', (event, d) => {
            d3.select(event.currentTarget)
              .style('fill-opacity', 0.6)
              .style('stroke-width', 1);
            this.tooltip.style('opacity', 0);
          });

        dots.transition()
          .duration(1000)
          .attr('r', 3);

        const line = d3.line<{ startTime: number; averageRating: number }>()
          .x(d => x(new Date(d.startTime * 1000)))
          .y(d => y(d.averageRating))
          .curve(d3.curveMonotoneX);

        const path = svg.append('path')
          .datum(data.timeSegments)
          .attr('class', 'rating-line')
          .attr('d', line)
          .style('fill', 'none')
          .style('stroke', '#3b82f6')
          .style('stroke-width', 2);

        const totalLength = path.node()?.getTotalLength() || 0;
        path
          .attr('stroke-dasharray', totalLength)
          .attr('stroke-dashoffset', totalLength)
          .transition()
          .duration(1500)
          .ease(d3.easeLinear)
          .attr('stroke-dashoffset', 0);

        const area = d3.area<{ startTime: number; averageRating: number }>()
          .x(d => x(new Date(d.startTime * 1000)))
          .y0(this.height)
          .y1(d => y(d.averageRating))
          .curve(d3.curveMonotoneX);

        svg.append('path')
          .datum(data.timeSegments)
          .attr('class', 'rating-area')
          .attr('d', area)
          .style('fill', 'url(#rating-gradient)');

        const xAxis = d3.axisBottom(x)
          .ticks(8)
          .tickFormat((d: d3.NumberValue) => {
            const date = new Date(d.valueOf());
            return d3.timeFormat('%b %Y')(date);
          });

        const yAxis = d3.axisLeft(y)
          .ticks(6)
          .tickFormat((d: d3.NumberValue) => d.valueOf().toFixed(1));

        const y2Axis = d3.axisRight(y2)
          .ticks(5)
          .tickFormat((d: d3.NumberValue) => d3.format('d')(d));

        svg.append('g')
          .attr('transform', `translate(0,${this.height})`)
          .call(xAxis)
          .selectAll('text')
          .style('text-anchor', 'end')
          .style('fill', '#6b7280')
          .style('font-size', '12px')
          .attr('dx', '-.8em')
          .attr('dy', '.15em')
          .attr('transform', 'rotate(-45)');

        svg.append('g')
          .call(yAxis)
          .selectAll('text')
          .style('fill', '#6b7280')
          .style('font-size', '12px');

        svg.append('g')
          .attr('transform', `translate(${chartWidth},0)`)
          .call(y2Axis)
          .selectAll('text')
          .style('fill', '#6b7280')
          .style('font-size', '12px');

        svg.append('text')
          .attr('transform', `translate(${chartWidth / 2}, ${this.height + 40})`)
          .style('text-anchor', 'middle')
          .style('fill', '#6b7280')
          .style('font-size', '12px')
          .text('Time');

        svg.append('text')
          .attr('transform', 'rotate(-90)')
          .attr('y', -40)
          .attr('x', -this.height / 2)
          .style('text-anchor', 'middle')
          .style('fill', '#6b7280')
          .style('font-size', '12px')
          .text('Rating');

        svg.append('text')
          .attr('transform', `translate(${chartWidth + 20}, -40)`)
          .style('text-anchor', 'middle')
          .style('fill', '#6b7280')
          .style('font-size', '12px')
          .text('Number of Ratings');
      },
      error: (error) => {
        console.error('Error loading lifecycle data:', error);
        svg.selectAll(':not(.movie-selector)').remove();
        svg.append('text')
          .attr('x', this.width / 2)
          .attr('y', this.height / 2)
          .attr('text-anchor', 'middle')
          .style('fill', '#6b7280')
          .text('Error loading data. Please try again later.');
      }
    });
  }

  /**
   * Updates the temporal chart for a specific genre
   * @param genre - Genre to display temporal patterns for
   */
  private updateTemporalChart(genre: string): void {
    if (!this.temporalSvg) return;

    this.temporalSvg.selectAll(':not(.genre-selector)').remove();

    const tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    this.movieLensService.getTemporalRatingPatterns(genre).subscribe({
      next: (data) => {
        if (!data || data.length === 0) {
          console.warn('No temporal patterns data received');
          return;
        }

        const x = d3.scaleBand()
          .domain(d3.range(24).map(String))
          .range([0, this.width])
          .padding(0.1);

        const y = d3.scaleBand()
          .domain(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'])
          .range([0, this.height])
          .padding(0.1);

        const maxCount = d3.max(data, d => d.count) || 0;
        const color = d3.scaleSequential(d3.interpolateYlOrRd)
          .domain([0, maxCount]);

        const cells = this.temporalSvg!.selectAll('rect')
          .data(data)
          .enter()
          .append('rect')
          .attr('class', d => `heatmap-cell time-${d.hour}-${d.dayOfWeek}`)
          .attr('x', d => x(d.hour.toString()) || 0)
          .attr('y', d => y(['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.dayOfWeek]) || 0)
          .attr('width', x.bandwidth())
          .attr('height', y.bandwidth())
          .attr('fill', '#e5e7eb')
          .attr('fill-opacity', 0)
          .on('mouseover', (event, d) => {
            d3.select(event.currentTarget)
              .style('stroke', '#fff')
              .style('stroke-width', 2);

            this.tooltip
              .style('opacity', 1)
              .html(`
                <div class="tooltip-content">
                  <h4>${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.dayOfWeek]} at ${d.hour}:00</h4>
                  <p>Rating Count: ${d.count}</p>
                </div>
              `)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 28) + 'px');
          })
          .on('mouseout', (event, d) => {
            if (!d3.select(event.currentTarget).classed('highlighted')) {
              d3.select(event.currentTarget)
                .style('stroke', 'none');
            }
            this.tooltip.style('opacity', 0);
          });

        cells.transition()
          .duration(1000)
          .attr('fill', d => color(d.count))
          .attr('fill-opacity', 0.8);

        const xAxis = d3.axisBottom(x).tickFormat(d => `${d}:00`);
        const yAxis = d3.axisLeft(y);

        this.temporalSvg!.append('g')
          .attr('transform', `translate(0,${this.height})`)
          .call(xAxis)
          .selectAll('text')
          .style('fill', '#6b7280')
          .style('font-size', '12px');

        this.temporalSvg!.append('g')
          .call(yAxis)
          .selectAll('text')
          .style('fill', '#6b7280')
          .style('font-size', '12px');

        const timePeriods = [
          { name: 'Morning (6-12)', hours: [6, 7, 8, 9, 10, 11] },
          { name: 'Afternoon (12-18)', hours: [12, 13, 14, 15, 16, 17] },
          { name: 'Evening (18-24)', hours: [18, 19, 20, 21, 22, 23] },
          { name: 'Night (0-6)', hours: [0, 1, 2, 3, 4, 5] }
        ];

        const legendGroup = this.temporalSvg!.append('g')
          .attr('class', 'time-legend')
          .attr('transform', `translate(${this.width - 200}, 20)`);

        timePeriods.forEach((period, i) => {
          const legendItem = legendGroup.append('g')
            .attr('class', 'legend-item')
            .attr('transform', `translate(0, ${i * 30})`)
            .style('cursor', 'pointer')
            .on('click', () => {
              const isHighlighted = d3.selectAll(period.hours.map(h => `.time-${h}-\\d+`).join(',')).classed('highlighted');
              
              d3.selectAll('.heatmap-cell')
                .style('fill-opacity', 0.8)
                .style('stroke', 'none')
                .classed('highlighted', false);

              d3.selectAll('.legend-item')
                .select('rect')
                .style('stroke-width', 1)
                .style('stroke', '#fff');

              if (!isHighlighted) {
                period.hours.forEach(hour => {
                  d3.selectAll(`.time-${hour}-\\d+`)
                    .style('fill-opacity', 1)
                    .style('stroke', '#fff')
                    .style('stroke-width', 2)
                    .classed('highlighted', true);
                });

                d3.selectAll('.heatmap-cell:not(.highlighted)')
                  .style('fill-opacity', 0.2);

                legendItem.select('rect')
                  .style('stroke-width', 2)
                  .style('stroke', '#000');
              }
            });

          legendItem.append('rect')
            .attr('width', 20)
            .attr('height', 20)
            .style('fill', d3.interpolateYlOrRd(0.5))
            .style('fill-opacity', 0.6)
            .style('stroke', '#fff')
            .style('stroke-width', 1);

          legendItem.append('text')
            .attr('x', 30)
            .attr('y', 15)
            .text(period.name)
            .style('fill', '#6b7280')
            .style('font-size', '12px');
        });

        const legendWidth = 200;
        const legendHeight = 20;
        const legendX = this.width - legendWidth - 20;
        const legendY = this.height + 40;

        const gradient = this.temporalSvg!.append('defs')
          .append('linearGradient')
          .attr('id', 'heatmap-gradient')
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '0%');

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', d3.interpolateYlOrRd(0));

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', d3.interpolateYlOrRd(1));

        this.temporalSvg!.append('rect')
          .attr('x', legendX)
          .attr('y', legendY)
          .attr('width', legendWidth)
          .attr('height', legendHeight)
          .style('fill', 'url(#heatmap-gradient)');

        this.temporalSvg!.append('text')
          .attr('x', legendX)
          .attr('y', legendY - 5)
          .text('Rating Frequency')
          .style('fill', '#6b7280')
          .style('font-size', '12px');

        this.temporalSvg!.append('text')
          .attr('x', legendX)
          .attr('y', legendY + legendHeight + 15)
          .text('Low')
          .style('fill', '#6b7280')
          .style('font-size', '12px');

        this.temporalSvg!.append('text')
          .attr('x', legendX + legendWidth)
          .attr('y', legendY + legendHeight + 15)
          .text('High')
          .style('fill', '#6b7280')
          .style('font-size', '12px')
          .style('text-anchor', 'end');
      },
      error: (error: Error) => {
        console.error('Error loading temporal patterns:', error);
        if (this.temporalSvg) {
          this.temporalSvg.append('text')
            .attr('x', this.width / 2)
            .attr('y', this.height / 2)
            .attr('text-anchor', 'middle')
            .style('fill', '#6b7280')
            .text('Error loading data. Please try again later.');
        }
      }
    });
  }

  /**
   * Creates a scatter plot showing PCA-based user clusters
   * Displays clusters of users based on PCA dimensionality reduction
   */
  private createClustersPcaChart(): void {
    if (!this.clustersPcaSvg) return;
    this.clustersPcaSvg.selectAll('*').remove();
    this.movieLensService.getUserTasteClustersPCA().subscribe({
      next: (clusters) => {
        if (!clusters || clusters.length === 0) {
          console.warn('No PCA user clusters data received');
          return;
        }
        const chartWidth = this.width;
        const x = d3.scaleLinear()
          .domain([d3.min(clusters, d => d.x) || 0, d3.max(clusters, d => d.x) || 0])
          .range([0, chartWidth]);
        const y = d3.scaleLinear()
          .domain([d3.min(clusters, d => d.y) || 0, d3.max(clusters, d => d.y) || 0])
          .range([this.height, 0]);
        const maxCluster = d3.max(clusters, d => d.cluster) || 0;
        const color = d3.scaleOrdinal<string>()
          .domain(d3.range(maxCluster + 1).map(String))
          .range(d3.schemeCategory10);
        if (this.clustersPcaSvg) {
          const points = this.clustersPcaSvg.selectAll('circle')
            .data(clusters)
            .enter()
            .append('circle')
            .attr('cx', d => x(d.x))
            .attr('cy', d => y(d.y))
            .attr('r', 0)
            .attr('class', d => `cluster-point cluster-${d.cluster}`)
            .style('fill', d => color(d.cluster.toString()))
            .style('fill-opacity', 0.6)
            .on('mouseover', (event, d) => {
              d3.select(event.currentTarget)
                .style('fill-opacity', 0.8)
                .style('stroke', '#fff')
                .style('stroke-width', 1.5);
            })
            .on('mouseout', (event, d) => {
              d3.select(event.currentTarget)
                .style('fill-opacity', 0.6)
                .style('stroke', 'none');
            });
          points.transition()
            .duration(1000)
            .attr('r', 4);
          const xAxis = d3.axisBottom(x);
          const yAxis = d3.axisLeft(y);
          this.clustersPcaSvg.append('g')
            .attr('transform', `translate(0,${this.height})`)
            .call(xAxis)
            .selectAll('text')
            .style('fill', '#6b7280')
            .style('font-size', '12px');
          this.clustersPcaSvg.append('g')
            .call(yAxis)
            .selectAll('text')
            .style('fill', '#6b7280')
            .style('font-size', '12px');
          const legendGroup = this.clustersPcaSvg.append('g')
            .attr('class', 'cluster-legend')
            .attr('transform', `translate(0, ${this.height + 80})`);
          const itemsPerRow = 4;
          const rows = Math.ceil((maxCluster + 1) / itemsPerRow);
          const rowHeight = 25;
          d3.range(maxCluster + 1).forEach((clusterId, i) => {
            const row = Math.floor(i / itemsPerRow);
            const col = i % itemsPerRow;
            const legendItem = legendGroup.append('g')
              .attr('class', 'legend-item')
              .attr('transform', `translate(${col * (chartWidth / itemsPerRow)}, ${row * rowHeight})`)
              .style('cursor', 'pointer')
              .on('mouseover', () => {
                d3.selectAll('.cluster-point')
                  .style('fill-opacity', 0.2);
                d3.selectAll(`.cluster-${clusterId}`)
                  .style('fill-opacity', 1)
                  .style('stroke', '#000')
                  .style('stroke-width', 2);
                legendItem.select('circle')
                  .style('stroke-width', 2)
                  .style('stroke', '#000');
              })
              .on('mouseout', () => {
                d3.selectAll('.cluster-point')
                  .style('fill-opacity', 0.6)
                  .style('stroke', 'none');
                legendItem.select('circle')
                  .style('stroke-width', 1)
                  .style('stroke', '#fff');
              })
              .on('click', () => {
                const clusterData = clusters.filter(c => c.cluster === clusterId);
                const genreCounts: { [key: string]: number } = {};
                let total = 0;
                clusterData.forEach(c => {
                  c.sampleRatings.forEach(r => {
                    r.genres.forEach(g => {
                      genreCounts[g] = (genreCounts[g] || 0) + 1;
                      total++;
                    });
                  });
                });
                const genreDistribution = Object.entries(genreCounts).map(([genre, count]) => ({ genre, count }));
                this.clusterPieData = genreDistribution;
                this.clusterPieTitle = `PCA Cluster ${clusterId}`;
                this.showClusterPieModal = true;
              });
            legendItem.append('circle')
              .attr('r', 6)
              .style('fill', color(clusterId.toString()))
              .style('fill-opacity', 0.6)
              .style('stroke', '#fff')
              .style('stroke-width', 1);
            legendItem.append('text')
              .attr('x', 16)
              .attr('y', 4)
              .text(`Cluster ${clusterId}`)
              .style('fill', '#6b7280')
              .style('font-size', '12px');
          });
        }
      },
      error: (error) => {
        console.error('Error loading PCA user clusters:', error);
      }
    });
  }

  /**
   * Handles movie selection event
   * @param movieId - ID of the selected movie
   */
  onMovieSelected(movieId: number) {
    console.log('Movie selected:', movieId);
    this.selectedMovieId = movieId;
    if (this.lifecycleSvg) {
      this.updateLifecycleChart(movieId);
    }
  }

  /**
   * Handles genre selection event
   * @param genre - Selected genre
   */
  onGenreChange(genre: string) {
    this.selectedGenre = genre;
    if (this.temporalSvg) {
      this.updateTemporalChart(genre);
    }
  }
} 