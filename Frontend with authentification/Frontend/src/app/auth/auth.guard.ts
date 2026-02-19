import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Auth Guard - Checking route:', state.url);
  
  if (!authService.isAuthenticated()) {
    console.log('Not authenticated, redirecting to login');
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  const requiredRole = route.data?.['requiredRole'];
  console.log('Required role:', requiredRole);
  
  if (requiredRole && !authService.hasRole(requiredRole)) {
    console.log('User does not have required role');
    return router.createUrlTree(['/unauthorized']);
  }

  console.log('Access granted');
  return true;
};