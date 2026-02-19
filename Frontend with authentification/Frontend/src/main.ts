// Importer les polyfills en premier
import './polyfills';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Réinitialise le state d'authentification au démarrage
async function clearAuthState() {
  const token = localStorage.getItem('auth_token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Date.now() / 1000) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
      }
    } catch {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
  }
}

async function initializeApp() {
  await clearAuthState();
  try {
    await bootstrapApplication(AppComponent, appConfig);
    console.log('Application démarrée avec succès');
  } catch (err) {
    console.error('Application bootstrap failed', err);
  }
}

initializeApp();