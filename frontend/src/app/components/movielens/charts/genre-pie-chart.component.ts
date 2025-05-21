import { Component, ElementRef, Input, OnInit, ViewChild, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import * as d3 from 'd3';
import { CommonModule } from '@angular/common';

/**
 * Component for displaying a pie chart of genre distribution
 * Shows the proportion of movies in each genre with interactive features
 * and tooltips showing detailed statistics
 */
@Component({
  selector: 'app-genre-pie-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div #pieChart class="chart-container"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    
    .chart-container {
      width: 100%;
      height: 100%;
      min-height: 400px;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      padding: 20px;
      box-sizing: border-box;
    }
  `]
})
export class GenrePieChartComponent implements OnInit, AfterViewInit, OnChanges {
  @ViewChild('pieChart') private chartContainer!: ElementRef;
  @Input() genreDistribution: { genre: string; count: number }[] = [];

  private svg: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private margin = { top: 20, right: 20, bottom: 20, left: 20 };
  private width = 720;
  private height = 600;
  private radius = 250;
  private tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;

  constructor() {
    this.tooltip = d3.select('body')
      .append('div')
      .attr('class', 'tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('background-color', 'white')
      .style('border', '1px solid #ddd')
      .style('padding', '10px')
      .style('border-radius', '4px')
      .style('pointer-events', 'none')
      .style('z-index', '1000');
  }

  /**
   * Initializes the component
   */
  ngOnInit() {
    console.log('Pie chart component initialized');
  }

  /**
   * Called after view initialization
   * Creates and updates the chart
   */
  ngAfterViewInit() {
    console.log('Pie chart after view init');
    this.createChart();
    this.updateChart();
  }

  /**
   * Handles changes to input data
   * Updates the chart when genre distribution changes
   * @param changes - Object containing information about the changes
   */
  ngOnChanges(changes: SimpleChanges) {
    if (changes['genreDistribution'] && !changes['genreDistribution'].firstChange) {
      console.log('Genre distribution changed:', this.genreDistribution);
      this.updateChart();
    }
  }

  /**
   * Creates the initial chart structure
   * Sets up SVG container and positioning
   */
  private createChart(): void {
    if (!this.chartContainer) {
      console.warn('Chart container not found');
      return;
    }

    const element = this.chartContainer.nativeElement;
    d3.select(element).selectAll('*').remove();
    this.svg = d3.select(element)
      .append('svg')
      .attr('width', this.width + this.margin.left + this.margin.right)
      .attr('height', this.height + this.margin.top + this.margin.bottom)
      .append('g')
      .attr('transform', `translate(${(this.width + this.margin.left + this.margin.right) / 2},${(this.height + this.margin.top + this.margin.bottom) / 2})`);

    console.log('Chart created with dimensions:', {
      width: this.width,
      height: this.height,
      radius: this.radius
    });
  }

  /**
   * Updates the chart with current genre distribution data
   * Creates pie slices, labels, and interactive elements
   */
  private updateChart(): void {
    if (!this.svg || !this.genreDistribution.length) {
      console.warn('Cannot update chart: svg or data not available');
      return;
    }

    console.log('Updating chart with data:', this.genreDistribution);

    const total = d3.sum(this.genreDistribution, d => d.count);
    const sorted = [...this.genreDistribution].sort((a, b) => b.count - a.count);
    const threshold = total * 0.03;
    const mainGenres = sorted.filter(d => d.count >= threshold);
    const others = sorted.filter(d => d.count < threshold);
    let data = [...mainGenres];
    if (others.length > 0) {
      data.push({
        genre: 'Others',
        count: d3.sum(others, d => d.count)
      });
    }

    const color = d3.scaleOrdinal<string>()
      .domain(data.map(d => d.genre))
      .range(d3.schemeCategory10.concat(['#b0b0b0']));

    const pie = d3.pie<{ genre: string; count: number }>()
      .value(d => d.count)
      .sort(null);

    const arc = d3.arc<d3.PieArcDatum<{ genre: string; count: number }>>()
      .innerRadius(0)
      .outerRadius(this.radius);

    const outerArc = d3.arc<d3.PieArcDatum<{ genre: string; count: number }>>()
      .innerRadius(this.radius * 0.9)
      .outerRadius(this.radius * 0.9);

    this.svg.selectAll('*').remove();

    this.svg.selectAll('path')
      .data(pie(data))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', d => color(d.data.genre))
      .attr('stroke', 'white')
      .style('stroke-width', '2px')
      .style('opacity', 0.7)
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget)
          .style('opacity', 1)
          .style('stroke', '#fff')
          .style('stroke-width', 2);

        this.tooltip
          .style('opacity', 1)
          .html(`
            <div class="tooltip-content">
              <h4>${d.data.genre}</h4>
              <p>Count: ${d.data.count}</p>
              <p>Percentage: ${((d.data.count / total) * 100).toFixed(1)}%</p>
            </div>
          `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget)
          .style('opacity', 0.7)
          .style('stroke', 'white')
          .style('stroke-width', '2px');
        this.tooltip.style('opacity', 0);
      });

    this.svg.selectAll('polyline')
      .data(pie(data))
      .enter()
      .append('polyline')
      .attr('points', d => {
        const pos = outerArc.centroid(d);
        pos[0] = this.radius * 0.95 * (this.midAngle(d) < Math.PI ? 1 : -1);
        return `${arc.centroid(d).join(',')} ${outerArc.centroid(d).join(',')} ${pos.join(',')}`;
      })
      .style('fill', 'none')
      .style('stroke', '#6b7280')
      .style('stroke-width', '1px');

    this.svg.selectAll('text')
      .data(pie(data))
      .enter()
      .append('text')
      .attr('transform', d => {
        const pos = outerArc.centroid(d);
        pos[0] = this.radius * 1.05 * (this.midAngle(d) < Math.PI ? 1 : -1);
        return `translate(${pos})`;
      })
      .attr('dy', '.35em')
      .style('text-anchor', d => this.midAngle(d) < Math.PI ? 'start' : 'end')
      .text(d => `${d.data.genre} (${((d.data.count / total) * 100).toFixed(1)}%)`)
      .style('font-size', '12px')
      .style('fill', '#6b7280');
  }

  /**
   * Calculates the middle angle of a pie slice
   * @param d - Pie arc datum containing angle information
   * @returns The middle angle of the slice in radians
   */
  private midAngle(d: d3.PieArcDatum<{ genre: string; count: number }>): number {
    return d.startAngle + (d.endAngle - d.startAngle) / 2;
  }
} 