import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { AppComponent } from './app.component';
import { MovieLensComponent } from './components/movielens/movielens.component';
import { MovieLensPresentationComponent } from './components/movielens/movielens-presentation.component';
import { GenreDistributionChartComponent } from './components/movielens/charts/genre-distribution-chart.component';
import { GenreEvolutionChartComponent } from './components/movielens/charts/genre-evolution-chart.component';
import { UserClustersChartComponent } from './components/movielens/charts/user-clusters-chart.component';
import { TemporalPatternsChartComponent } from './components/movielens/charts/temporal-patterns-chart.component';
import { MovieLifecycleChartComponent } from './components/movielens/charts/movie-lifecycle-chart.component';

@NgModule({
  declarations: [
    AppComponent,
    MovieLensComponent,
    MovieLensPresentationComponent,
    GenreDistributionChartComponent,
    GenreEvolutionChartComponent,
    TemporalPatternsChartComponent,
    MovieLifecycleChartComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 