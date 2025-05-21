import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import * as d3 from 'd3';
import { MovieStats } from '../../../models/movie-stats.model';

@Component({
  selector: 'app-genre-evolution-chart',
  template: `
    <div #chartContainer></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class GenreEvolutionChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') private chartContainer!: ElementRef;
  @Input() movieStats: MovieStats | null = null;
  @Input() getGenreColor: (genre: string) => string = () => '#000';

  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private margin = { top: 20, right: 20, bottom: 90, left: 60 };
  private width = 0;
  private height = 400;
  private resizeObserver: ResizeObserver;

  constructor() {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateChart();
    });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.initializeChart();
  }

  ngOnDestroy() {
    this.resizeObserver.disconnect();
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

    if (this.movieStats) {
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
    if (!this.svg || !this.movieStats) return;

    // Clear previous chart
    this.svg.selectAll('*').remove();

    const data = this.movieStats.genreEvolution;

    // Create scales
    const x = d3.scaleTime()
      .domain([
        new Date(data[0].year, 0, 1),
        new Date(data[data.length - 1].year, 0, 1)
      ])
      .range([0, this.width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d3.max(Object.values(d.genres)) || 0) || 0])
      .range([this.height, 0]);

    // Create line generator
    const line = d3.line<{ year: number; genres: { [key: string]: number } }>()
      .x(d => x(new Date(d.year, 0, 1)))
      .y(d => y(d3.max(Object.values(d.genres)) || 0));

    // Add lines for each genre
    const genres = Object.keys(data[0].genres);
    genres.forEach(genre => {
      const lineData = data.map(d => ({
        year: d.year,
        value: d.genres[genre] || 0
      }));

      const genreLine = d3.line<{ year: number; value: number }>()
        .x(d => x(new Date(d.year, 0, 1)))
        .y(d => y(d.value));

      this.svg?.append('path')
        .datum(lineData)
        .attr('fill', 'none')
        .attr('stroke', this.getGenreColor(genre))
        .attr('stroke-width', 2)
        .attr('d', genreLine);
    });

    // Add axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    this.svg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', '#6b7280')
      .style('font-size', '12px');

    this.svg.append('g')
      .call(yAxis)
      .selectAll('text')
      .style('fill', '#6b7280')
      .style('font-size', '12px');

    // Add legend
    const legend = this.svg.append('g')
      .attr('transform', `translate(${this.width - 100}, 0)`);

    genres.forEach((genre, i) => {
      const legendItem = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendItem.append('line')
        .attr('x1', 0)
        .attr('y1', 0)
        .attr('x2', 20)
        .attr('y2', 0)
        .attr('stroke', this.getGenreColor(genre))
        .attr('stroke-width', 2);

      legendItem.append('text')
        .attr('x', 25)
        .attr('y', 4)
        .text(genre)
        .style('font-size', '12px')
        .style('fill', '#6b7280');
    });

    // Add title
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', -this.margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#374151')
      .text('Genre Evolution Over Time');
  }
} 