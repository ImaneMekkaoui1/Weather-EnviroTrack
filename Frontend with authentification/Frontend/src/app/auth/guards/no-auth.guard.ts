import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../auth.service';

export const noAuthGuard: CanActivateFn = (route, state): boolean | UrlTree => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    const isAuthRoute = route.routeConfig?.data?.['isAuthRoute'];
    
    if (isAuthRoute) {
      const user = authService.getCurrentUser();
      
      if (user?.role.toUpperCase() === 'ADMIN') {
        return router.createUrlTree(['/admin/dashboard']);
      } else {
        return router.createUrlTree(['/user/dashboard']);
      }
    }
    return true;
  }
  
  return true;
};