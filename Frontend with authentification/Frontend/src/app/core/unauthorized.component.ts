import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="error-container">
      <h1>403 - Accès refusé</h1>
      <p>Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
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
export class UnauthorizedComponent {}