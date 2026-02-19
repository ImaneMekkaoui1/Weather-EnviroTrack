import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  console.log('Admin Guard - Checking route:', state.url);
  console.log('Is authenticated:', authService.isAuthenticated());
  
  if (!authService.isAuthenticated()) {
    console.log('Not authenticated, redirecting to login');
    return router.createUrlTree(['/auth/login'], {
      queryParams: { returnUrl: state.url }
    });
  }
  
  console.log('Checking if user is admin');
  const isAdmin = authService.isAdmin();
  console.log('Is admin:', isAdmin);
  
  if (!isAdmin) {
    console.log('User is not admin, redirecting to unauthorized');
    return router.createUrlTree(['/unauthorized']);
  }
  
  console.log('User is admin, allowing access');
  return true;
};