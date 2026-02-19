import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  // Allow public endpoints without token
  const isPublicRequest = 
    req.url.includes('/api/auth/') ||
    (req.url.endsWith('/api/users') && req.method === 'POST') || // Allow user registration
    req.url.includes('/api/users/test') ||
    req.url.endsWith('/api/capteurs') && req.method === 'GET' ||
    req.url.includes('/api/capteurs/current') || 
    req.url.includes('/api/weather') ||
    req.url.includes('/api/airquality') ||
    req.url.includes('/ws-mqtt') ||
    req.url.includes('/topic/') ||
    req.url.includes('/app/');

  if (isPublicRequest) {
    return next(req);
  }

  // Add token to authenticated requests
  if (token) {
    console.log('[auth.interceptor] Token envoyé:', token);
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }
  
  return next(req);
};