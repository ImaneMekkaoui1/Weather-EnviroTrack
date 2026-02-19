import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  { 
    path: 'login', 
    loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
    title: 'Connexion',
    data: { isAuthRoute: true }
  },
  { 
    path: 'register', 
    loadComponent: () => import('./register/register.component').then(m => m.RegisterComponent),
    title: 'Inscription',
    data: { isAuthRoute: true }
  },
  { 
    path: 'forgot-password',
    loadComponent: () => import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
    title: 'Mot de passe oublié',
    data: { isAuthRoute: true }
  },
  { 
    path: 'reset-password',
    loadComponent: () => import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
    title: 'reset',
    data: { isAuthRoute: true }
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];