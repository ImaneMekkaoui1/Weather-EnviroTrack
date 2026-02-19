import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';
import { provideHttpClient, withFetch } from '@angular/common/http';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    // Configuration spécifique au serveur
    provideHttpClient(withFetch()), // Essential pour SSR
    // Ajoutez d'autres providers spécifiques au serveur si nécessaire
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);