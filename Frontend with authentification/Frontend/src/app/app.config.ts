import { ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withRouterConfig } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideClientHydration, withHttpTransferCacheOptions } from '@angular/platform-browser';
import { appRoutes } from './app.routes';
import { authInterceptor } from './auth.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      appRoutes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      }),
      withRouterConfig({
        paramsInheritanceStrategy: 'always',
        onSameUrlNavigation: 'reload'
      })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    provideClientHydration(
      withHttpTransferCacheOptions({
        includePostRequests: true,
        filter: request => request.method === 'GET'
      })
    ),
    provideAnimations(),
    provideAnimationsAsync(),
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(
              '122636862530-04q5vhc4ko7juhv7e21gfkl0hg6aqa1q.apps.googleusercontent.com'
            )
          }
        ],
        onError: (err) => {
          console.error('SocialAuthService error:', err);
        }
      } as SocialAuthServiceConfig,
    }
  ]
};