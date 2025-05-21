import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { GenreTrendsComponent } from './components/genre-trends/genre-trends.component';
import { DataImportComponent } from './components/data-import/data-import.component';
import { CountryComparisonComponent } from './components/country-comparison/country-comparison.component';
import { RatingTrendsComponent } from './components/rating-trends/rating-trends.component';
import { DirectorAnalysisComponent } from './components/director-analysis/director-analysis.component';
import { MovieClustersComponent } from './components/movie-clusters/movie-clusters.component';
import { MovieLensPresentationComponent } from './components/movielens/movielens-presentation.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    GenreTrendsComponent,
    DataImportComponent,
    CountryComparisonComponent,
    RatingTrendsComponent,
    DirectorAnalysisComponent,
    MovieClustersComponent,
    MovieLensPresentationComponent
  ],
  template: `
    <div class="app-container">
      <header class="app-header">
        <h1>Movie Data Visualization</h1>
        <p class="subtitle">Explore trends, patterns, and insights from the movie industry</p>
      </header>
      <section class="about-section">
        <h2>About the project</h2>
        <p>
          This dashboard is designed to help you explore and analyze movie data interactively. Visualize genre distributions, user clusters, rating patterns, and the lifecycle of individual movies. Use the search and filter features to dive deep into the data and uncover trends and insights.
        </p>
        <p>
          The data used in this project is from the MovieLens dataset, which contains a collection of movie ratings and user reviews. The dataset includes information about movies, users, and their ratings, which allows us to explore and analyze movie data interactively. First I thought about using the IMDB dataset, but it was too large to handle with not enough columns to process and provide insights.
        </p>
      </section>
      <section class="about-section">
        <h2>Main Technologies & Libraries Used</h2>
        <ul>
          <li><strong>Backend:</strong> NestJS (Node.js framework), TypeORM, csv-parse, ml-pca (Principal Component Analysis), cache-manager, TensorFlow JS</li>
          <li><strong>Frontend:</strong> Angular (framework), Angular Material, D3.js, TypeScript</li>
        </ul>
        <p style="font-size: 0.95em; color: #374151; margin-top: 0.5em;">
          The backend handles data processing, clustering, and API endpoints, while the frontend provides interactive visualizations and user interface using modern web technologies.
        </p>
      </section>

      <section class="about-section">
        <h2>Further Development</h2>
        <p>
          The initial aim of the project was to dive into D3.js and see how it works. However, the long-term goal is to create a LLM-powered dashboard with generated charts based on provided structure of the data and user's request.
        </p>
      </section>
      <main class="main-content">
        <section class="visualizations">
          <div class="visualization-card full-width">
            <app-movielens-presentation></app-movielens-presentation>
          </div>
        </section>
      </main>
      <footer class="app-footer">
        <p>Egor Ulianov © 2024</p>
      </footer>
    </div>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');

    * {
      font-family: 'Poppins', sans-serif;
    }

    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background-color: #f5f7fa;
    }

    .app-header {
      background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%);
      color: white;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
    }

    .subtitle {
      margin: 0.5rem 0 0;
      font-size: 1.1rem;
      opacity: 0.9;
      font-weight: 300;
    }

    .main-content {
      flex: 1;
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      width: 100%;
    }

    .import-section {
      margin-bottom: 2rem;
    }

    .visualizations {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
      gap: 2rem;
    }

    .visualization-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      overflow: hidden;
    }

    .visualization-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .app-footer {
      background: #1a237e;
      color: white;
      text-align: center;
      padding: 1rem;
      margin-top: 2rem;
      font-weight: 300;
    }

    @media (max-width: 768px) {
      .visualizations {
        grid-template-columns: 1fr;
      }

      .app-header {
        padding: 1.5rem;
      }

      h1 {
        font-size: 2rem;
      }

      .main-content {
        padding: 1rem;
      }
    }

    .about-section {
      background: #e0e7ef;
      border-radius: 10px;
      margin: 2rem 2rem 0 2rem;
      padding: 1.5rem 2rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      color: #1e293b;
      font-size: 1.1rem;
    }
    .about-section h2 {
      margin-top: 0;
      font-size: 1.5rem;
      color: #0d47a1;
    }
  `]
})
export class AppComponent {
  title = 'movie-visualization';
}
