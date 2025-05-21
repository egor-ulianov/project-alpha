import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import * as d3 from 'd3';
import { MovieStats } from '../../../models/movie-stats.model';
import { MovieService } from '../../../services/movie.service';

@Component({
  selector: 'app-temporal-patterns-chart',
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
export class TemporalPatternsChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') private chartContainer!: ElementRef;
  @Input() movieStats: MovieStats | null = null;

  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private margin = { top: 20, right: 20, bottom: 90, left: 60 };
  private width = 0;
  private height = 400;
  private resizeObserver: ResizeObserver;

  constructor(private movieService: MovieService) {
    this.resizeObserver = new ResizeObserver(() => {
      this.updateChart();
    });
  }

  ngOnInit() {
    if (!this.movieStats) {
      this.movieService.getMovieStats().subscribe(stats => {
        this.movieStats = stats;
        this.createChart();
      });
    }
  }

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

    // Create scales
    const x = d3.scaleTime()
      .domain([
        new Date(this.movieStats.ratingPatterns[0].timestamp * 1000),
        new Date(this.movieStats.ratingPatterns[this.movieStats.ratingPatterns.length - 1].timestamp * 1000)
      ])
      .range([0, this.width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(this.movieStats.ratingPatterns, d => d.count) || 0])
      .range([this.height, 0]);

    // Add area
    const area = d3.area<{ timestamp: number; count: number }>()
      .x(d => x(new Date(d.timestamp * 1000)))
      .y0(this.height)
      .y1(d => y(d.count));

    this.svg.append('path')
      .datum(this.movieStats.ratingPatterns)
      .attr('fill', '#3b82f6')
      .attr('fill-opacity', 0.2)
      .attr('d', area);

    // Add line
    const line = d3.line<{ timestamp: number; count: number }>()
      .x(d => x(new Date(d.timestamp * 1000)))
      .y(d => y(d.count));

    this.svg.append('path')
      .datum(this.movieStats.ratingPatterns)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 2)
      .attr('d', line);

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

    // Add title
    this.svg.append('text')
      .attr('x', this.width / 2)
      .attr('y', -this.margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#374151')
      .text('Rating Patterns Over Time');
  }
} 