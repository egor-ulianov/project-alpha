import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MovieService } from '../../services/movie.service';
import * as d3 from 'd3';

interface DirectorStats {
  director: string;
  averageRating: number;
  totalMovies: number;
  genres: { genre: string; count: number }[];
  moviesByYear: { year: number; count: number }[];
  topMovies: {
    title: string;
    year: number;
    rating: number;
    genres: string[];
  }[];
}

interface GenreData {
  [key: string]: number;
}

interface GenreItem {
  genre: string;
  count: number;
}

interface CareerData {
  year: number;
  title: string;
  rating: number;
  genres: string[];
}

@Component({
  selector: 'app-director-analysis',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div class="container">
      <h2>Director Analysis</h2>
      <div class="controls">
        <mat-form-field>
          <mat-label>Start Year</mat-label>
          <input matInput type="number" [(ngModel)]="startYear" (change)="updateVisualization()">
        </mat-form-field>
        <mat-form-field>
          <mat-label>End Year</mat-label>
          <input matInput type="number" [(ngModel)]="endYear" (change)="updateVisualization()">
        </mat-form-field>
        <mat-form-field>
          <mat-label>Minimum Movies</mat-label>
          <input matInput type="number" [(ngModel)]="minMovies" (change)="updateVisualization()">
        </mat-form-field>
      </div>
      <div class="charts-container">
        <div class="chart" #topDirectorsChart></div>
        <div class="chart" #genreDistributionChart></div>
        <div class="chart" #careerProgressionChart></div>
      </div>
    </div>
  `,
  styles: [`
    .container {
      padding: 20px;
    }
    .controls {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
    }
    .charts-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }
    .chart {
      width: 100%;
      height: 400px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
    }
  `]
})
export class DirectorAnalysisComponent implements OnInit {
  @ViewChild('topDirectorsChart') private topDirectorsChart!: ElementRef;
  @ViewChild('genreDistributionChart') private genreDistributionChart!: ElementRef;
  @ViewChild('careerProgressionChart') private careerProgressionChart!: ElementRef;

  startYear: number = 1980;
  endYear: number = new Date().getFullYear();
  minMovies: number = 3;
  selectedDirector: string = '';

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.updateVisualization();
  }

  updateVisualization() {
    this.movieService.getDirectorStats(this.startYear, this.endYear, this.minMovies).subscribe((data: DirectorStats[]) => {
      this.createTopDirectorsChart(data);
      this.createGenreDistributionChart(data);
      if (this.selectedDirector) {
        this.updateCareerProgression(this.selectedDirector);
      }
    });
  }

  private createTopDirectorsChart(data: DirectorStats[]) {
    const margin = { top: 20, right: 30, bottom: 90, left: 60 };
    const width = this.topDirectorsChart.nativeElement.offsetWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous visualization
    d3.select(this.topDirectorsChart.nativeElement).selectAll('*').remove();

    const svg = d3.select(this.topDirectorsChart.nativeElement)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Take top 10 directors
    const topDirectors = data.slice(0, 10);

    // Create scales
    const x = d3.scaleBand()
      .domain(topDirectors.map(d => d.director))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(topDirectors, d => d.averageRating) || 10])
      .range([height, 0]);

    // Add bars
    svg.selectAll('rect')
      .data(topDirectors)
      .enter()
      .append('rect')
      .attr('x', d => x(d.director) || 0)
      .attr('y', d => y(d.averageRating))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.averageRating))
      .attr('fill', '#2196f3')
      .on('click', (event, d) => {
        this.selectedDirector = d.director;
        this.updateCareerProgression(d.director);
      })
      .append('title')
      .text(d => `${d.director}\nAverage Rating: ${d.averageRating.toFixed(2)}\nMovies: ${d.totalMovies}`);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5));

    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text('Top Directors by Average Rating');
  }

  private createGenreDistributionChart(data: DirectorStats[]) {
    const margin = { top: 20, right: 30, bottom: 90, left: 60 };
    const width = this.genreDistributionChart.nativeElement.offsetWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous visualization
    d3.select(this.genreDistributionChart.nativeElement).selectAll('*').remove();

    const svg = d3.select(this.genreDistributionChart.nativeElement)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Aggregate genre data across all directors
    const genreData: GenreData = {};
    data.forEach(director => {
      director.genres.forEach(genre => {
        genreData[genre.genre] = (genreData[genre.genre] || 0) + genre.count;
      });
    });

    const genreArray: GenreItem[] = Object.entries(genreData)
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Create scales
    const x = d3.scaleBand()
      .domain(genreArray.map(d => d.genre))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(genreArray, d => d.count) || 100])
      .range([height, 0]);

    // Add bars
    svg.selectAll('rect')
      .data(genreArray)
      .enter()
      .append('rect')
      .attr('x', d => x(d.genre) || 0)
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.count))
      .attr('fill', '#4caf50')
      .append('title')
      .text(d => `${d.genre}\nMovies: ${d.count}`);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5));

    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text('Top Genres by Movie Count');
  }

  private updateCareerProgression(director: string) {
    this.movieService.getDirectorCareerProgression(director).subscribe((data: CareerData[]) => {
      this.createCareerProgressionChart(data, director);
    });
  }

  private createCareerProgressionChart(data: CareerData[], director: string) {
    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const width = this.careerProgressionChart.nativeElement.offsetWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Clear previous visualization
    d3.select(this.careerProgressionChart.nativeElement).selectAll('*').remove();

    const svg = d3.select(this.careerProgressionChart.nativeElement)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
      .domain(d3.extent(data, d => d.year) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.rating) || 10])
      .range([height, 0]);

    // Create line generator
    const line = d3.line<any>()
      .x(d => x(d.year))
      .y(d => y(d.rating))
      .curve(d3.curveMonotoneX);

    // Add the line path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#ff4081')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    svg.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.rating))
      .attr('r', 4)
      .attr('fill', '#ff4081')
      .append('title')
      .text(d => `${d.title} (${d.year})\nRating: ${d.rating.toFixed(2)}`);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(data.length))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end');

    svg.append('g')
      .call(d3.axisLeft(y).ticks(5));

    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text(`${director}'s Career Progression`);

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .attr('text-anchor', 'middle')
      .text('Rating');
  }
} 