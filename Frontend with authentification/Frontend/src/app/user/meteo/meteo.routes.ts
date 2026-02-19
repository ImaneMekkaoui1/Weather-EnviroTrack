import { Routes } from '@angular/router';
import { authGuard } from '../../auth/auth.guard';

export const meteoRoutes: Routes = [
  { 
    path: 'compare', 
    loadComponent: () => import('./compare-weather/compare-weather.component').then(m => m.CompareWeatherComponent),
    title: 'Comparaison Météo',
    canActivate: [authGuard]
  }
];