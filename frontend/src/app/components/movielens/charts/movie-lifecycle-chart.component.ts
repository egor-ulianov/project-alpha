import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import { MovieLensMovie } from '../../../models/movielens-movie.model';
import { MovieLensService } from '../../../services/movielens.service';
import { FormsModule, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';

interface TimeSegment {
  startTime: number;
  endTime: number;
  ratingCount: number;
  averageRating: number;
}

interface Rating {
  timestamp: number;
  rating: number;
}

interface MovieLifecycleData {
  timeSegments: TimeSegment[];
  ratings: Rating[];
}

@Component({
  selector: 'app-movie-lifecycle-chart',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, MatAutocompleteModule, MatInputModule, MatFormFieldModule, CommonModule],
  template: `
    <div class="movie-selector">
      <mat-form-field style="width: 100%;">
        <input type="text" matInput placeholder="Search for a movie" [formControl]="movieControl" [matAutocomplete]="auto">
        <mat-autocomplete #auto="matAutocomplete" (optionSelected)="onMovieAutocompleteSelect($event)">
          <mat-option *ngFor="let movie of filteredMovies" [value]="movie.title">
            {{movie.title}}
          </mat-option>
        </mat-autocomplete>
      </mat-form-field>
    </div>
    <div #chartContainer></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .movie-selector {
      margin-bottom: 20px;
      padding: 0 20px;
    }

    select {
      width: 100%;
      padding: 8px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      background-color: white;
      font-size: 14px;
      color: #374151;
    }

    select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
    }
  `]
})
export class MovieLifecycleChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') private chartContainer!: ElementRef;
  @Input() movies: MovieLensMovie[] = [];
  @Input() selectedMovieId: number | null = null;
  @Output() movieSelected = new EventEmitter<number>();

  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private margin = { top: 20, right: 20, bottom: 180, left: 60 };
  private width = 0;
  private height = 300;
  private resizeObserver: ResizeObserver;
  private tooltip!: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

  movieControl = new FormControl('');
  filteredMovies: MovieLensMovie[] = [];

  constructor(private movieLensService: MovieLensService) {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateChart();
    });
  }

  ngOnInit() {
    console.log('MovieLifecycleChartComponent initialized');
    console.log('Initial movies:', this.movies);
    
    this.filteredMovies = this.movies.slice(10);

    console.log('Filtered movies:', this.filteredMovies);
    
    if (this.movies.length === 0) {
      console.log('No movies provided, loading from service...');
      this.movieLensService.getMovies().subscribe({
        next: (movies) => {
          console.log('Movies loaded from service:', movies);
          this.setMoviesAndFilter(movies);
          this.filterMovies('');
        },
        error: (error) => {
          console.error('Error loading movies:', error);
        }
      });
    } else {
      console.log('Using provided movies:', this.movies);
      if (this.movies.length > 0) {
        this.selectedMovieId = this.movies[0].movieId;
        console.log('Selected first movie:', this.selectedMovieId);
      }
    }

    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0);

    this.movieControl.valueChanges.subscribe(value => {
      this.filterMovies(value ?? '');
    });
  }

  ngAfterViewInit() {
    console.log('AfterViewInit called');
    this.initializeChart();
  }

  ngOnDestroy() {
    this.resizeObserver.disconnect();
    this.tooltip.remove();
  }

  setMoviesAndFilter(movies: MovieLensMovie[]) {
    this.movies = movies;
    this.filteredMovies = this.movies.slice();
    if (this.movies.length > 0) {
      this.selectedMovieId = this.movies[0].movieId;
      this.movieControl.setValue(this.movies[0].title, { emitEvent: false });
    }
  }

  filterMovies(value: string) {
    const filterValue = value ? value.toLowerCase() : '';
    this.filteredMovies = this.movies.filter(movie => movie.title.toLowerCase().includes(filterValue));
  }

  onMovieAutocompleteSelect(event: any) {
    const selectedTitle = event.option.value;
    const selected = this.movies.find(m => m.title === selectedTitle);
    if (selected) {
      this.selectedMovieId = selected.movieId;
      this.movieSelected.emit(this.selectedMovieId);
      this.createChart();
    }
  }

  private initializeChart(): void {
    const element = this.chartContainer?.nativeElement;
    if (!element) {
      console.warn('Chart container not found, retrying in 100ms...');
      setTimeout(() => this.initializeChart(), 100);
      return;
    }

    this.resizeObserver.observe(element);
    this.width = element.offsetWidth - this.margin.left - this.margin.right;

    this.svg = d3.select(element)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    if (this.selectedMovieId) {
      this.createChart();
    }
  }

  private updateChart(): void {
    const element = this.chartContainer?.nativeElement;
    if (!element || !this.svg) return;

    this.width = element.offsetWidth - this.margin.left - this.margin.right;
    this.svg.select('svg')
      .attr('viewBox', `0 0 ${this.width + this.margin.left + this.margin.right} ${this.height + this.margin.top + this.margin.bottom}`);

    this.createChart();
  }

  private createChart(): void {
    if (!this.svg || !this.selectedMovieId) return;

    this.movieLensService.getMovieRatingLifecycle(this.selectedMovieId).subscribe({
      next: (data: MovieLifecycleData) => {
        this.renderChart(data);
      },
      error: (error: Error) => {
        console.error('Error loading movie lifecycle data:', error);
        this.renderError();
      }
    });
  }

  private renderChart(data: MovieLifecycleData): void {
    if (!this.svg) return;

    // Clear previous chart
    this.svg.selectAll('*').remove();

    // Create scales
    const x = d3.scaleTime()
      .domain([
        new Date(data.timeSegments[0].startTime * 1000),
        new Date(data.timeSegments[data.timeSegments.length - 1].endTime * 1000)
      ])
      .range([0, this.width]);

    const y = d3.scaleLinear()
      .domain([0, 5])
      .range([this.height, 0]);

    const y2 = d3.scaleLinear()
      .domain([0, d3.max(data.timeSegments, d => d.ratingCount) || 0])
      .range([this.height, 0]);

    // Add gradient for rating area
    const gradient = this.svg.append('defs')
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

    // Add rating count bars
    const bars = this.svg.selectAll('rect')
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
      .on('mouseover', (event: MouseEvent, d: TimeSegment) => {
        d3.select(event.currentTarget as Element)
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
            </div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', (event: MouseEvent) => {
        d3.select(event.currentTarget as Element)
          .style('fill-opacity', 0.5)
          .style('stroke', 'none');
        this.tooltip.style('opacity', 0);
      });

    bars.transition()
      .duration(1000)
      .attr('y', d => y2(d.ratingCount))
      .attr('height', d => this.height - y2(d.ratingCount));

    // Add individual ratings
    const dots = this.svg.selectAll('circle')
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
      .on('mouseover', (event: MouseEvent, d: Rating) => {
        d3.select(event.currentTarget as Element)
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
      .on('mouseout', (event: MouseEvent) => {
        d3.select(event.currentTarget as Element)
          .style('fill-opacity', 0.6)
          .style('stroke-width', 1);
        this.tooltip.style('opacity', 0);
      });

    dots.transition()
      .duration(1000)
      .attr('r', 3);

    // Add smoothed rating line
    const line = d3.line<TimeSegment>()
      .x(d => x(new Date(d.startTime * 1000)))
      .y(d => y(d.averageRating))
      .curve(d3.curveMonotoneX);

    const path = this.svg.append('path')
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

    // Add area under the line
    const area = d3.area<TimeSegment>()
      .x(d => x(new Date(d.startTime * 1000)))
      .y0(this.height)
      .y1(d => y(d.averageRating))
      .curve(d3.curveMonotoneX);

    this.svg.append('path')
      .datum(data.timeSegments)
      .attr('class', 'rating-area')
      .attr('d', area)
      .style('fill', 'url(#rating-gradient)');

    // Add axes
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

    this.svg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .style('text-anchor', 'end')
      .style('fill', '#6b7280')
      .style('font-size', '12px')
      .attr('dx', '-.8em')
      .attr('dy', '1.5em')
      .attr('transform', 'rotate(-45)');

    this.svg.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#6b7280')
      .style('font-size', '12px');

    this.svg.append('g')
      .attr('transform', `translate(${this.width},0)`)
      .call(y2Axis)
      .selectAll('text')
      .style('fill', '#6b7280')
      .style('font-size', '12px');

    // Add axis labels
    this.svg.append('text')
      .attr('transform', `translate(${this.width / 2}, ${this.height + 60})`)
      .style('text-anchor', 'middle')
      .style('fill', '#6b7280')
      .style('font-size', '12px')
      .text('Time');

    this.svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -40)
      .attr('x', -this.height / 2)
      .style('text-anchor', 'middle')
      .style('fill', '#6b7280')
      .style('font-size', '12px')
      .text('Rating');

    this.svg.append('text')
      .attr('transform', `translate(${this.width + 20}, -40)`)
      .style('text-anchor', 'middle')
      .style('fill', '#6b7280')
      .style('font-size', '12px')
      .text('Number of Ratings');

    // Add legend below the chart
    const legendGroup = this.svg.append('g')
      .attr('class', 'lifecycle-legend')
      .attr('transform', `translate(0, ${this.height + 100})`);

    const legendItems = [
      { label: 'Individual Ratings', color: '#3b82f6', class: 'rating-dot' },
      { label: 'Average Rating', color: '#3b82f6', class: 'rating-line' },
      { label: 'Rating Count', color: '#e5e7eb', class: 'rating-count-bar' }
    ];

    const itemSpacing = this.width / (legendItems.length + 1);
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
  }

  private renderError(): void {
    if (!this.svg) return;

    this.svg.selectAll('*').remove();
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', this.height / 2)
      .attr('text-anchor', 'middle')
      .style('fill', '#6b7280')
      .text('Error loading data. Please try again later.');
  }
} 