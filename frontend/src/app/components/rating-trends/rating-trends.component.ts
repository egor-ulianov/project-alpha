import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MovieService } from '../../services/movie.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-rating-trends',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="container">
      <h2>Movie Rating Trends Over Time</h2>
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
      <div class="chart-container" #chartContainer></div>
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
    .chart-container {
      width: 100%;
      height: 600px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class RatingTrendsComponent implements OnInit {
  @ViewChild('chartContainer') private chartContainer!: ElementRef;
  startYear: number = 1980;
  endYear: number = new Date().getFullYear();

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.updateVisualization();
  }

  updateVisualization() {
    this.movieService.getRatingTrends(this.startYear, this.endYear).subscribe(data => {
      this.createVisualization(data);
    });
  }

  private createVisualization(data: any[]) {
    const margin = { top: 50, right: 30, bottom: 60, left: 60 };
    const width = this.chartContainer.nativeElement.offsetWidth - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Clear previous visualization
    d3.select(this.chartContainer.nativeElement).selectAll('*').remove();

    const svg = d3.select(this.chartContainer.nativeElement)
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const x = d3.scaleLinear()
      .domain([this.startYear, this.endYear])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.averageRating) || 10])
      .range([height, 0]);

    // Create line generator
    const line = d3.line<any>()
      .x(d => x(d.year))
      .y(d => y(d.averageRating))
      .curve(d3.curveMonotoneX);

    // Add the line path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#2196f3')
      .attr('stroke-width', 2)
      .attr('d', line);

    // Add dots
    svg.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.year))
      .attr('cy', d => y(d.averageRating))
      .attr('r', 4)
      .attr('fill', '#2196f3')
      .append('title')
      .text(d => `Year: ${d.year}\nAverage Rating: ${d.averageRating.toFixed(2)}`);

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(this.endYear - this.startYear))
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
      .text('Average Movie Rating Over Time');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .attr('text-anchor', 'middle')
      .text('Average Rating');

    // Add trend line
    const trendLine = d3.line<any>()
      .x(d => x(d.year))
      .y(d => y(d.averageRating));

    const trendData = this.calculateTrendLine(data);
    svg.append('path')
      .datum(trendData)
      .attr('fill', 'none')
      .attr('stroke', '#ff4081')
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '5,5')
      .attr('d', trendLine);

    // Add trend line label
    svg.append('text')
      .attr('x', width - 100)
      .attr('y', 20)
      .attr('fill', '#ff4081')
      .text('Trend Line');
  }

  private calculateTrendLine(data: any[]) {
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.year, 0);
    const sumY = data.reduce((sum, d) => sum + d.averageRating, 0);
    const sumXY = data.reduce((sum, d) => sum + d.year * d.averageRating, 0);
    const sumXX = data.reduce((sum, d) => sum + d.year * d.year, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return data.map(d => ({
      year: d.year,
      averageRating: slope * d.year + intercept
    }));
  }
} 