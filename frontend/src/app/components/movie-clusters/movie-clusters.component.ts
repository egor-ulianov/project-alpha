import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MovieService } from '../../services/movie.service';
import * as d3 from 'd3';

interface MoviePoint {
  id: string;
  title: string;
  year: number;
  rating: number;
  genres: string[];
  directors: string;
  country: string;
  x: number;
  y: number;
}

type ColorScale = d3.ScaleSequential<string, never> | d3.ScaleOrdinal<string, string>;

@Component({
  selector: 'app-movie-clusters',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="container">
      <h2>Movie Clusters Analysis</h2>
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
          <mat-label>Technique</mat-label>
          <mat-select [(ngModel)]="selectedTechnique" (selectionChange)="updateVisualization()">
            <mat-option value="pca">PCA</mat-option>
            <mat-option value="mds">MDS</mat-option>
            <mat-option value="tsne">t-SNE</mat-option>
            <mat-option value="umap">UMAP</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Color By</mat-label>
          <mat-select [(ngModel)]="colorBy" (selectionChange)="updateVisualization()">
            <mat-option value="year">Year</mat-option>
            <mat-option value="rating">Rating</mat-option>
            <mat-option value="country">Country</mat-option>
          </mat-select>
        </mat-form-field>
      </div>
      <div class="chart-container" #chartContainer></div>
      <div class="tooltip" #tooltip></div>
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
      flex-wrap: wrap;
    }
    .chart-container {
      width: 100%;
      height: 600px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      position: relative;
    }
    .tooltip {
      position: absolute;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 4px;
      font-size: 14px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    }
  `]
})
export class MovieClustersComponent implements OnInit {
  @ViewChild('chartContainer') private chartContainer!: ElementRef;
  @ViewChild('tooltip') private tooltip!: ElementRef;

  startYear: number = 1980;
  endYear: number = new Date().getFullYear();
  selectedTechnique: 'pca' | 'mds' | 'tsne' | 'umap' = 'umap';
  colorBy: 'year' | 'rating' | 'country' = 'year';
  private data: MoviePoint[] = [];

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.updateVisualization();
  }

  updateVisualization() {
    this.movieService.getDimensionalityReduction(
      this.selectedTechnique,
      this.startYear,
      this.endYear
    ).subscribe(data => {
      this.data = this.processData(data);
      this.createVisualization();
    });
  }

  private processData(data: any): MoviePoint[] {
    return data.points.map((point: number[], i: number) => ({
      ...data.metadata[i],
      x: point[0],
      y: point[1]
    }));
  }

  private createVisualization() {
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
      .domain(d3.extent(this.data, d => d.x) as [number, number])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain(d3.extent(this.data, d => d.y) as [number, number])
      .range([height, 0]);

    // Create color scale
    let colorScale: ColorScale;
    if (this.colorBy === 'year') {
      colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(this.data, d => d.year) as [number, number]);
    } else if (this.colorBy === 'rating') {
      colorScale = d3.scaleSequential(d3.interpolateViridis)
        .domain(d3.extent(this.data, d => d.rating) as [number, number]);
    } else {
      const countries = [...new Set(this.data.map(d => d.country))];
      colorScale = d3.scaleOrdinal(d3.schemeCategory10)
        .domain(countries);
    }

    // Add points
    svg.selectAll('circle')
      .data(this.data)
      .enter()
      .append('circle')
      .attr('cx', d => x(d.x))
      .attr('cy', d => y(d.y))
      .attr('r', 4)
      .attr('fill', d => {
        if (this.colorBy === 'country') {
          return (colorScale as d3.ScaleOrdinal<string, string>)(d.country);
        }
        return (colorScale as d3.ScaleSequential<string, never>)(d[this.colorBy]);
      })
      .on('mouseover', (event, d) => {
        const tooltip = d3.select(this.tooltip.nativeElement);
        tooltip
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px')
          .html(`
            <strong>${d.title}</strong><br>
            Year: ${d.year}<br>
            Rating: ${d.rating.toFixed(1)}<br>
            Director: ${d.directors}<br>
            Country: ${d.country}<br>
            Genres: ${d.genres.join(', ')}
          `)
          .style('opacity', 1);
      })
      .on('mouseout', () => {
        d3.select(this.tooltip.nativeElement)
          .style('opacity', 0);
      });

    // Add axes
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x));

    svg.append('g')
      .call(d3.axisLeft(y));

    // Add labels
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .text(`${this.selectedTechnique.toUpperCase()} Visualization of Movies`);

    // Add color legend
    if (this.colorBy === 'country') {
      const legend = svg.append('g')
        .attr('transform', `translate(${width - 100}, 0)`);

      const countries = [...new Set(this.data.map(d => d.country))];
      countries.forEach((country, i) => {
        const legendRow = legend.append('g')
          .attr('transform', `translate(0, ${i * 20})`);

        legendRow.append('rect')
          .attr('width', 15)
          .attr('height', 15)
          .attr('fill', (colorScale as d3.ScaleOrdinal<string, string>)(country));

        legendRow.append('text')
          .attr('x', 20)
          .attr('y', 12)
          .text(country);
      });
    } else {
      const legend = svg.append('g')
        .attr('transform', `translate(${width - 100}, 0)`);

      const gradient = legend.append('defs')
        .append('linearGradient')
        .attr('id', 'colorGradient')
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%');

      const domain = this.colorBy === 'year' 
        ? d3.extent(this.data, d => d.year) as [number, number]
        : d3.extent(this.data, d => d.rating) as [number, number];

      gradient.selectAll('stop')
        .data(d3.range(0, 1.1, 0.1))
        .enter()
        .append('stop')
        .attr('offset', d => `${d * 100}%`)
        .attr('stop-color', d => d3.interpolateViridis(d));

      legend.append('rect')
        .attr('width', 100)
        .attr('height', 15)
        .style('fill', 'url(#colorGradient)');

      legend.append('text')
        .attr('x', 0)
        .attr('y', -5)
        .text(this.colorBy === 'year' ? 'Year' : 'Rating');

      const scale = d3.scaleLinear()
        .domain(domain)
        .range([0, 100]);

      const axis = d3.axisBottom(scale)
        .ticks(5);

      legend.append('g')
        .attr('transform', 'translate(0, 15)')
        .call(axis);
    }
  }
} 