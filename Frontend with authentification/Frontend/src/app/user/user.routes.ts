import { Routes } from '@angular/router';

export const userRoutes: Routes = [
  { 
    path: 'dashboard', 
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Tableau de bord'
  },
  { 
    path: 'alerts', 
    loadComponent: () => import('./alerts/alerts.component').then(m => m.AlertsComponent),
    title: 'Alertes'
  },
 
  { 
    path: 'sensors', 
    loadComponent: () => import('./sensors/sensors.component').then(m => m.SensorsComponent),
    title: 'Capteurs'
  },
  { 
    path: 'meteo', 
    loadComponent: () => import('./meteo/meteo.component').then(m => m.MeteoComponent),
    title: 'Météo'
  },
  { 
    path: 'meteo/compare-weather', 
    loadComponent: () => import('./meteo/compare-weather/compare-weather.component').then(m => m.CompareWeatherComponent),
    title: 'Comparaison Météo'
  },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];