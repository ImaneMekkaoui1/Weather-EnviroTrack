import { Routes } from '@angular/router';
import { adminGuard } from './admin-auth.guard';

export const adminRoutes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
    title: 'Tableau de bord Admin',
    canActivate: [adminGuard]
  },
  {
    path: 'manage-users',
    loadComponent: () => import('./manage-users/manage-users.component').then(m => m.ManageUsersComponent),
    title: 'Gestion Utilisateurs',
    canActivate: [adminGuard]
  },
   {
    path: 'ocp-zone',
    loadComponent: () => import('./ocp-zone/ocp-zone.component').then(m => m.OcpZoneComponent),
    title: 'ocp-zone',
    canActivate: [adminGuard]
  },
  {
    path: 'manage-sensors',
    loadComponent: () => 
      import('./manage-sensors/manage-sensors.component')
        .then(m => m.ManageSensorsComponent)
        .catch(err => {
          console.error('Erreur chargement ManageSensorsComponent:', err);
          throw err;
        }),
    title: 'Gestion Capteurs',
    canActivate: [adminGuard]
  },
  {
    path: 'manage-alerts',
    loadComponent: () => import('./manage-alerts/manage-alerts.component').then(m => m.ManageAlertsComponent),
    title: 'Gestion Alertes',
    canActivate: [adminGuard]
  },
  {
  path: 'notifications',
  loadComponent: () => import('../notification.component').then(m => m.NotificationComponent),
  title: 'Notifications'
},
{
  path: 'login-logs',
  loadComponent: () => import('./Login-logs/login-logs.component').then(m => m.LoginLogsComponent),
  title: 'login-logs'
},
  {
    path: 'weather',
    loadComponent: () => 
      import('./weather-details/weather-details.component')
        .then(m => m.WeatherDetailsComponent)
        .catch(err => {
          console.error('Erreur chargement WeatherDetailsComponent:', err);
          throw err;
        }),
    title: 'Détails Météo',
    canActivate: [adminGuard]
  }
];