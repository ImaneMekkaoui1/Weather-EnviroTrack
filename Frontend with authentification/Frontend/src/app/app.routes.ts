import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { noAuthGuard } from './auth/guards/no-auth.guard';

export const appRoutes: Routes = [
  { 
    path: '', 
    loadComponent: () => import('./user/home/home.component').then(m => m.HomeComponent),
    title: 'Accueil'
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    loadChildren: () => import('./auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'forgot-password',  // Nouvelle route directe
    canActivate: [noAuthGuard],
    loadComponent: () => import('./auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Mot de passe oublié'
  },
  {
    path: 'reset-password',  // Nouvelle route directe
    loadComponent: () => import('./auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'Réinitialisation du mot de passe'
  },
  {
    path: 'user',
    canActivate: [authGuard],
    data: { requiredRole: 'USER' },
    loadChildren: () => import('./user/user.routes').then(m => m.userRoutes)
  },
  {
    path: 'admin',
    canActivate: [authGuard],
    data: { requiredRole: 'ADMIN' },
    loadChildren: () => import('./admin/admin-routing.module').then(m => m.adminRoutes)
  },
  {
    path: 'air-quality',
    loadComponent: () => 
      import('./air-quality/air-quality.component').then(m => m.AirQualityComponent)
  },
  {
    path: 'SeasonalThresholds',
    loadComponent: () => 
      import('./seasonal-thresholds/seasonal-thresholds.component').then(m => m.SeasonalThresholdsComponent)
  },
  { 
    path: 'unauthorized', 
    loadComponent: () => import('./core/unauthorized.component').then(m => m.UnauthorizedComponent),
    title: 'Accès non autorisé'
  },
  { 
    path: '**', 
    loadComponent: () => import('./core/not-found/not-found.component').then(m => m.NotFoundComponent),
    title: 'Page non trouvée'
  },
 
   {
    path: 'notifications',
    canActivate: [authGuard],
    loadComponent: () => import('./notification.component').then(m => m.NotificationComponent),
    title: 'Notifications'
  }
];