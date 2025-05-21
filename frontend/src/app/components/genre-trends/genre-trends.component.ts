import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MovieService } from '../../services/movie.service';
import * as d3 from 'd3';

interface GenreData {
  year: number;
  value: number;
}

interface GenreTrends {
  [genre: string]: {
    [year: number]: number;
  };
}

@Component({
  selector: 'app-genre-trends',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="container">
      <h2>Genre Trends Over Time</h2>
      <div class="controls">
        <mat-form-field>
          <mat-label>Start Year</mat-label>
          <input matInput type="number" [(ngModel)]="startYear" (change)="updateVisualization()">
        </mat-form-field>
        <mat-form-field>
          <mat-label>End Year</mat-label>
          <input matInput type="number" [(ngModel)]="endYear" (change)="updateVisualization()">
        </mat-form-field>
      </div>
      <div #chart></div>
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
    mat-form-field {
      width: 150px;
    }
  `]
})
export class GenreTrendsComponent implements OnInit {
  @ViewChild('chart') private chartContainer!: ElementRef;
  private data!: GenreTrends;
  startYear: number = 1980;
  endYear: number = new Date().getFullYear();

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.updateVisualization();
  }

  updateVisualization() {
    this.movieService.getGenreTrends(this.startYear, this.endYear).subscribe(data => {
      this.data = data;
      this.createVisualization();
    });
  }

  private createVisualization() {
    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 30, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select(element)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const years = Object.keys(this.data[Object.keys(this.data)[0]]).map(Number);
    const genres = Object.keys(this.data);

    const x = d3.scaleLinear()
      .domain([this.startYear, this.endYear])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(genres, genre => 
        d3.max(years, year => this.data[genre][year] || 0)
      ) || 0])
      .range([height, 0]);

    const color = d3.scaleOrdinal<string>()
      .domain(genres)
      .range(d3.schemeCategory10);

    const line = d3.line<GenreData>()
      .x(d => x(d.year))
      .y(d => y(d.value))
      .curve(d3.curveMonotoneX);

    genres.forEach(genre => {
      const genreData: GenreData[] = years.map(year => ({
        year,
        value: this.data[genre][year] || 0
      }));

      svg.append('path')
        .datum(genreData)
        .attr('fill', 'none')
        .attr('stroke', color(genre) || '')
        .attr('stroke-width', 2)
        .attr('d', line);
    });

    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(5));

    svg.append('g')
      .call(d3.axisLeft(y));

    const legend = svg.append('g')
      .attr('font-family', 'sans-serif')
      .attr('font-size', 10)
      .attr('text-anchor', 'start')
      .selectAll('g')
      .data(genres)
      .enter().append('g')
      .attr('transform', (d, i) => `translate(0,${i * 20})`);

    legend.append('rect')
      .attr('x', width - 19)
      .attr('width', 19)
      .attr('height', 19)
      .attr('fill', d => color(d) || '');

    legend.append('text')
      .attr('x', width - 24)
      .attr('y', 9.5)
      .attr('dy', '0.32em')
      .text(d => d);
  }
} 