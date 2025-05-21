import { Component } from '@angular/core';

@Component({
  selector: 'app-movielens',
  template: `
    <app-movielens-presentation></app-movielens-presentation>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
    }
  `]
})
export class MovieLensComponent {} 