import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, tap, throwError } from 'rxjs';
import { SocialAuthService, SocialUser, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { NotificationService } from '../shared/services/notification.service';

interface User {
  id?: number;
  username: string;
  email: string;
  role: string;
  enabled?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8082/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  public authState$ = new BehaviorSubject<boolean>(false);
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'user_data';

  constructor(
    private http: HttpClient, 
    private router: Router,
    private socialAuthService: SocialAuthService,
    private injector: Injector
  ) {
    this.initializeAuthState();
    this.setupGoogleAuthListener();
  }

  private setupGoogleAuthListener(): void {
    this.socialAuthService.authState.subscribe({
      next: (user: SocialUser) => {
        if (user) {
          this.handleGoogleAuth(user);
        }
      },
      error: (error) => {
        console.error('Google auth state error:', error);
      }
    });
  }

  private handleGoogleAuth(user: SocialUser): void {
    if (!user || !user.idToken) {
      console.error('Invalid Google user data');
      return;
    }

    this.http.post(`${this.apiUrl}/google`, {
      token: user.idToken,
      email: user.email,
      name: user.name,
      provider: 'google'
    }).pipe(
      catchError(this.handleError)
    ).subscribe({
      next: (response: any) => {
        this.storeAuthData(response);
        this.navigateBasedOnRole();
      },
      error: (error) => {
        console.error('Google login backend error:', error);
        this.socialAuthService.signOut();
      }
    });
  }

  public loginWithGoogle(): Observable<void> {
    return new Observable(observer => {
      this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID)
        .then(() => {
          observer.next();
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public isAuthenticated(): boolean {
    return !!this.getToken();
  }

  public getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  public hasRole(requiredRole: string): boolean {
    const user = this.getCurrentUser();
    if (!user || !user.role) {
      return false;
    }
    
    // Convert to uppercase and compare to handle case differences
    return user.role.toUpperCase() === requiredRole.toUpperCase();
  }

  public isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  public login(credentials: { email: string; password: string; rememberMe?: boolean }): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        this.storeAuthData(response);
        this.navigateBasedOnRole();
      }),
      catchError(this.handleError)
    );
  }

  public register(userData: any): Observable<any> {
    const notificationService = this.injector.get(NotificationService);
    return this.http.post(`${this.apiUrl}/register`, userData).pipe(
      tap((response: any) => {
        // Créer une notification pour le nouvel utilisateur
        notificationService.createNewUserNotification({
          id: response.id,
          username: userData.username,
          email: userData.email
        }).subscribe(
          notification => {
            console.log('Notification créée pour le nouvel utilisateur:', notification);
          },
          error => {
            console.error('Erreur lors de la création de la notification:', error);
          }
        );

        // Rediriger vers la page de login avec un message
        this.router.navigate(['/auth/login'], {
          queryParams: { registered: 'true' }
        });
      }),
      catchError(this.handleError)
    );
  }

  public requestPasswordReset(email: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  
    return this.http.post(
      `${this.apiUrl}/password/forgot`,
      { email },
      { headers }
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Password reset error:', error);
        let errorMsg = 'Erreur lors de la demande de réinitialisation';
        
        if (error.status === 404) {
          errorMsg = 'Aucun compte associé à cet email';
        } else if (error.error && typeof error.error === 'object') {
          errorMsg = error.error.message || error.error.error || errorMsg;
        }
        
        return throwError(() => new Error(errorMsg));
      })
    );
  }

  public validateResetToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/password/validate-token?token=${token}`).pipe(
      catchError(this.handleError)
    );
  }

  public resetPassword(token: string, newPassword: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post(
      `${this.apiUrl}/password/reset`,
      { token, password: newPassword },
      { headers }
    ).pipe(
      catchError(this.handleError)
    );
  }

  public navigateBasedOnRole(): void {
    const user = this.getCurrentUser();
    console.log('[navigateBasedOnRole] user:', user);
    if (!user) {
      console.log('[navigateBasedOnRole] Pas de user, redirection vers /auth/login');
      this.router.navigate(['/auth/login']);
      return;
    }
    if (this.isAdmin()) {
      console.log('[navigateBasedOnRole] User est admin, redirection vers /admin/dashboard');
      this.router.navigate(['/admin/dashboard'], { replaceUrl: true });
    } else {
      if (user.enabled === false) {
        console.log('[navigateBasedOnRole] User non activé, redirection vers /auth/waiting-approval');
        this.router.navigate(['/auth/waiting-approval']);
      } else {
        console.log('[navigateBasedOnRole] User normal, redirection vers /user/dashboard');
        this.router.navigate(['/user/dashboard'], { replaceUrl: true });
      }
    }
  }

  public logout(): void {
    this.clearAuthData();
    this.socialAuthService.signOut().catch(err => {
      console.error('Google sign out error:', err);
    });
    this.router.navigate(['/auth/login']);
  }

  public clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSubject.next(null);
    this.authState$.next(false);
  }

  private initializeAuthState(): void {
    const token = this.getToken();
    const userData = localStorage.getItem(this.USER_KEY);
    if (token && userData) {
      try {
        if (userData !== 'undefined' && userData !== '') {
          const user = JSON.parse(userData);
          this.currentUserSubject.next(user);
          this.authState$.next(true);
        } else {
          this.clearAuthData();
        }
      } catch (e) {
        console.error('Failed to parse user data', e);
        this.clearAuthData();
      }
    } else {
      this.authState$.next(false);
    }
  }

  private storeAuthData(response: any): void {
    if (!response?.token) {
      console.error('Invalid auth response - no token found:', response);
      throw new Error('Invalid auth response');
    }
    const user = response.user ? response.user : response;
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.authState$.next(true);
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('AuthService error:', error);
    
    let errorMessage = 'Une erreur est survenue';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.error && error.error.error) {
        errorMessage = error.error.error;
      } else {
        errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }
}