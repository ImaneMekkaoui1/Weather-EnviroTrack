import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { tap, catchError } from 'rxjs/operators';

// Interface alignée avec le backend
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'WEATHER_ALERT' | 'AIR_QUALITY_ALERT' | 'SYSTEM_ALERT' | 'ACCOUNT_VALIDATION' | 'ACCOUNT_APPROVED' | 'ACCOUNT_REJECTED' | 'NEW_USER' | 'CRITICAL_THRESHOLD_ALERT';
  status: 'UNREAD' | 'READ';
  createdAt: string; // Format ISO string du backend
  readAt?: string;
  referenceId?: number;
  referenceType?: string;
  user: {
    id: number;
    email: string;
    username: string;
  };
  // Propriétés calculées côté frontend
  read?: boolean;
  timestamp?: Date;
  threshold?: {
    type: string;
    value: number;
    limit: number;
  };
}

export interface NotificationPage {
  content: Notification[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

export interface NotificationPreferences {
  id?: number;
  emailNotifications: boolean;
  webNotifications: boolean;
  weatherAlerts: boolean;
  airQualityAlerts: boolean;
  accountNotifications: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API_URL = 'http://localhost:8082/api/notifications';
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);

  notifications$ = this.notificationsSubject.asObservable();
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadInitialData();
  }

  // Charger les données initiales
  private loadInitialData(): void {
    this.loadNotifications();
    this.loadUnreadCount();
  }

  // Charger les notifications avec pagination
  loadNotifications(page: number = 0, size: number = 10): Observable<NotificationPage> {
    return this.http.get<NotificationPage>(`${this.API_URL}?page=${page}&size=${size}`);
  }

  // Charger le nombre de notifications non lues
  loadUnreadCount(): void {
    this.http.get<{unreadCount: number}>(`${this.API_URL}/unread-count`)
      .subscribe(response => {
        this.unreadCountSubject.next(response.unreadCount);
      });
  }

  // Marquer une notification comme lue (méthode corrigée)
  markAsRead(id: number): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}/read`, {});
  }

  // Marquer toutes les notifications comme lues (méthode corrigée)
  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.API_URL}/mark-all-read`, {});
  }

  // Obtenir les préférences de notification
  getPreferences(): Observable<NotificationPreferences> {
    return this.http.get<NotificationPreferences>(`${this.API_URL}/preferences`);
  }

  // Mettre à jour les préférences
  updatePreferences(preferences: NotificationPreferences): Observable<NotificationPreferences> {
    return this.http.put<NotificationPreferences>(`${this.API_URL}/preferences`, preferences);
  }

  // Méthodes utilitaires
  getNotificationTypeLabel(type: string): string {
    const labels: {[key: string]: string} = {
      'WEATHER_ALERT': 'Alerte Météo',
      'AIR_QUALITY_ALERT': 'Alerte Qualité Air',
      'SYSTEM_ALERT': 'Alerte Système',
      'ACCOUNT_VALIDATION': 'Validation Compte',
      'ACCOUNT_APPROVED': 'Compte Approuvé',
      'ACCOUNT_REJECTED': 'Compte Rejeté',
      'NEW_USER': 'Nouveau Compte',
      'CRITICAL_THRESHOLD_ALERT': 'Alerte Seuil Critique'
    };
    return labels[type] || type;
  }

  getNotificationIcon(type: string): string {
    const icons: {[key: string]: string} = {
      'WEATHER_ALERT': 'cloud-rain',
      'AIR_QUALITY_ALERT': 'wind',
      'SYSTEM_ALERT': 'alert-triangle',
      'ACCOUNT_VALIDATION': 'user-check',
      'ACCOUNT_APPROVED': 'check-circle',
      'ACCOUNT_REJECTED': 'x-circle',
      'NEW_USER': 'person_add',
      'CRITICAL_THRESHOLD_ALERT': 'warning'
    };
    return icons[type] || 'bell';
  }

  // Transformer les données backend vers frontend si nécessaire
  private transformNotification(backendNotif: any): Notification {
    return {
      ...backendNotif,
      read: backendNotif.status === 'READ',
      timestamp: new Date(backendNotif.createdAt)
    };
  }

  // Méthode pour créer une notification de nouveau compte
  createNewUserNotification(user: any): Observable<Notification> {
    const notification = {
      title: 'Nouveau compte utilisateur',
      message: `Un nouvel utilisateur (${user.username}) a créé un compte et attend validation`,
      type: 'NEW_USER',
      status: 'UNREAD',
      user: user
    };
    return this.http.post<Notification>(`${this.API_URL}/new-user`, notification).pipe(
      tap(newNotification => {
        // Mettre à jour la liste des notifications
        const currentNotifications = this.notificationsSubject.value;
        this.notificationsSubject.next([newNotification, ...currentNotifications]);
        
        // Mettre à jour le compteur de notifications non lues
        this.unreadCountSubject.next(this.unreadCountSubject.value + 1);
        
        console.log('Notification créée avec succès:', newNotification);
      }),
      catchError(error => {
        console.error('Erreur lors de la création de la notification:', error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour créer une notification d'alerte de seuil critique
  createThresholdAlertNotification(alert: any): Observable<Notification> {
    const notification = {
      title: 'Alerte de seuil critique',
      message: `Le seuil critique a été dépassé pour ${alert.type}: ${alert.value} (limite: ${alert.limit})`,
      type: 'CRITICAL_THRESHOLD_ALERT',
      status: 'UNREAD',
      threshold: {
        type: alert.type,
        value: alert.value,
        limit: alert.limit
      }
    };
    return this.http.post<Notification>(`${this.API_URL}/threshold-alert`, notification);
  }

  // Méthode pour approuver l'inscription d'un utilisateur
  approveUserRegistration(userId: number): Observable<any> {
    return this.http.put(`${this.API_URL}/approve-user/${userId}`, {}).pipe(
      tap(() => {
        // Mettre à jour les notifications après l'approbation
        this.refreshNotifications();
      }),
      catchError(error => {
        console.error('Erreur lors de l\'approbation de l\'utilisateur:', error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour rejeter l'inscription d'un utilisateur
  rejectUserRegistration(userId: number): Observable<any> {
    return this.http.put(`${this.API_URL}/reject-user/${userId}`, {}).pipe(
      tap(() => {
        // Mettre à jour les notifications après le rejet
        this.refreshNotifications();
      }),
      catchError(error => {
        console.error('Erreur lors du rejet de l\'utilisateur:', error);
        return throwError(() => error);
      })
    );
  }

  // Méthode pour rafraîchir les notifications
  refreshNotifications(): void {
    this.loadNotifications(0, 10).subscribe(
      response => {
        this.notificationsSubject.next(response.content);
        this.loadUnreadCount();
      },
      error => {
        console.error('Erreur lors du rafraîchissement des notifications:', error);
      }
    );
  }
}