import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { AuthService } from './auth/auth.service';
import { WebSocketService } from './shared/services/WebSocket.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <router-outlet></router-outlet>
  `
})
export class AppComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private webSocketService: WebSocketService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    console.log('AppComponent initializing...');
    
    // Gestion de la navigation
    this.subscriptions.push(
      this.router.events.subscribe((event) => {
        if (event instanceof NavigationEnd) {
          console.log('Navigated to:', event.url);
          window.scrollTo(0, 0);
        }
      })
    );

    // Gestion de l'authentification et des WebSockets
    this.subscriptions.push(
      this.authService.authState$.subscribe(isAuthenticated => {
        console.log('Auth state changed:', isAuthenticated);
        if (isAuthenticated) {
          this.webSocketService.connect();
          this.webSocketService.connectToNotifications();
        } else {
          this.webSocketService.disconnect();
        }
      })
    );

    // Connexion initiale si déjà authentifié
    if (this.authService.isAuthenticated()) {
      this.webSocketService.connect();
      this.webSocketService.connectToNotifications();
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.webSocketService.disconnect();
  }
}