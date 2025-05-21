import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MovieService } from '../../services/movie.service';
import * as d3 from 'd3';

@Component({
  selector: 'app-country-comparison',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <div class="container">
      <h2>Movie Statistics by Country</h2>
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
export class CountryComparisonComponent implements OnInit {
  @ViewChild('chartContainer') private chartContainer!: ElementRef;
  startYear: number = 1980;
  endYear: number = new Date().getFullYear();

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.updateVisualization();
  }

  updateVisualization() {
    this.movieService.getCountryComparison(this.startYear, this.endYear).subscribe(data => {
      this.createVisualization(data);
    });
  }

  private createVisualization(data: any[]) {
    const margin = { top: 50, right: 30, bottom: 100, left: 60 };
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

    // Sort data by average rating
    data.sort((a, b) => b.averageRating - a.averageRating);

    // Create scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.country))
      .range([0, width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.averageRating) || 10])
      .range([height, 0]);

    const color = d3.scaleSequential()
      .domain([0, d3.max(data, d => d.movieCount) || 100])
      .interpolator(d3.interpolateViridis);

    // Add bars
    svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.country) || 0)
      .attr('y', d => y(d.averageRating))
      .attr('width', x.bandwidth())
      .attr('height', d => height - y(d.averageRating))
      .attr('fill', d => color(d.movieCount))
      .append('title')
      .text(d => `${d.country}\nAverage Rating: ${d.averageRating.toFixed(2)}\nMovies: ${d.movieCount}`);

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
      .text('Average Movie Rating by Country');

    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -margin.left + 15)
      .attr('text-anchor', 'middle')
      .text('Average Rating');

    // Add color legend
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, 0)`);

    const legendScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.movieCount) || 100])
      .range([0, 100]);

    const legendAxis = d3.axisRight(legendScale)
      .ticks(5);

    legend.append('g')
      .call(legendAxis);

    legend.append('text')
      .attr('x', 30)
      .attr('y', -10)
      .text('Number of Movies');
  }
} 