import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="error-container">
      <h1>404 - Page non trouvée</h1>
      <p>La page que vous recherchez n'existe pas ou a été déplacée.</p>
      <a routerLink="/" class="home-link">Retour à l'accueil</a>
    </div>
  `,
  styles: [`
    .error-container {
      text-align: center;
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }
    .home-link {
      display: inline-block;
      margin-top: 1rem;
      padding: 0.5rem 1rem;
      background: #3f51b5;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
  `]
})
export class NotFoundComponent {}