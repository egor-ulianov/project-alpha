import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, OnDestroy, Input } from '@angular/core';
import * as d3 from 'd3';
import { MovieStats } from '../../../models/movie-stats.model';
import { MovieService } from '../../../services/movie.service';

@Component({
  selector: 'app-genre-distribution-chart',
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
export class GenreDistributionChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartContainer') private chartContainer!: ElementRef;
  @Input() movieStats: MovieStats | null = null;
  @Input() getGenreColor: (genre: string) => string = () => '#000';

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

    const data = this.movieStats.genreDistribution;

    // Create scales
    const x = d3.scaleBand()
      .domain(data.map(d => d.genre))
      .range([0, this.width])
      .padding(0.1);

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 0])
      .range([this.height, 0]);

    // Add bars
    this.svg.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => x(d.genre) || 0)
      .attr('y', d => y(d.count))
      .attr('width', x.bandwidth())
      .attr('height', d => this.height - y(d.count))
      .attr('fill', d => this.getGenreColor(d.genre))
      .attr('fill-opacity', 0.8);

    // Add axes
    const xAxis = d3.axisBottom(x);
    const yAxis = d3.axisLeft(y);

    this.svg.append('g')
      .attr('transform', `translate(0,${this.height})`)
      .call(xAxis)
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
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
      .text('Genre Distribution');
  }
} 