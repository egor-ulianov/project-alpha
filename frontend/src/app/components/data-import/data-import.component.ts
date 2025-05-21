import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MovieService } from '../../services/movie.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-data-import',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatProgressBarModule
  ],
  template: `
    <div class="import-container">
      <div class="import-card">
        <div class="import-header">
          <mat-icon class="import-icon">cloud_upload</mat-icon>
          <h2>Import Movie Data</h2>
        </div>
        
        <div class="upload-section">
          <input
            type="file"
            accept=".csv"
            (change)="onFileSelected($event)"
            #fileInput
            style="display: none"
          />
          <button 
            mat-raised-button 
            color="primary" 
            (click)="fileInput.click()"
            class="select-button"
          >
            <mat-icon>folder_open</mat-icon>
            Select CSV File
          </button>
          
          <div *ngIf="selectedFile" class="file-info">
            <mat-icon>description</mat-icon>
            <span class="file-name">{{ selectedFile.name }}</span>
            <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
          </div>
        </div>

        <div class="actions" *ngIf="selectedFile">
          <button
            mat-raised-button
            color="accent"
            (click)="uploadFile()"
            [disabled]="uploading"
            class="upload-button"
          >
            <mat-icon>{{ uploading ? 'hourglass_empty' : 'cloud_upload' }}</mat-icon>
            {{ uploading ? 'Uploading...' : 'Upload' }}
          </button>
        </div>

        <mat-progress-bar
          *ngIf="uploading"
          mode="indeterminate"
          class="progress-bar"
        ></mat-progress-bar>
      </div>
    </div>
  `,
  styles: [`
    .import-container {
      padding: 1rem;
    }

    .import-card {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .import-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .import-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #1a237e;
    }

    h2 {
      margin: 0;
      color: #1a237e;
      font-size: 1.5rem;
    }

    .upload-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 2rem;
      border: 2px dashed #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
      transition: all 0.3s ease;
    }

    .upload-section:hover {
      border-color: #1a237e;
      background: #f5f7fa;
    }

    .select-button {
      padding: 0.5rem 1.5rem;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #666;
      font-size: 0.9rem;
    }

    .file-name {
      font-weight: 500;
    }

    .file-size {
      color: #999;
    }

    .actions {
      margin-top: 1.5rem;
      display: flex;
      justify-content: center;
    }

    .upload-button {
      padding: 0.5rem 2rem;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .progress-bar {
      margin-top: 1rem;
    }

    @media (max-width: 600px) {
      .import-card {
        padding: 1rem;
      }

      .upload-section {
        padding: 1rem;
      }

      .file-info {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class DataImportComponent {
  selectedFile: File | null = null;
  uploading = false;

  constructor(
    private movieService: MovieService,
    private snackBar: MatSnackBar
  ) {}

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  uploadFile() {
    if (!this.selectedFile) return;

    this.uploading = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.movieService.importMovies(formData).subscribe({
      next: (response) => {
        this.snackBar.open(response.message, 'Close', {
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.selectedFile = null;
        this.uploading = false;
      },
      error: (error) => {
        this.snackBar.open(
          `Error uploading file: ${error.message}`,
          'Close',
          { 
            duration: 5000,
            panelClass: ['error-snackbar']
          }
        );
        this.uploading = false;
      }
    });
  }
} 