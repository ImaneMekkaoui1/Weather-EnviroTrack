import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs.js';
import { environment } from '../../../environments/environment';
import { Notification, NotificationStatus, NotificationType } from '../../models/notification.model';

export interface AlertSummary {
  total: number;
  danger: number;
  warning: number;
  info: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private client: Client | null = null;
  private notificationClient: Client | null = null;
  private serverUrl = environment.apiUrl + '/ws-mqtt';
  private notificationUrl = environment.apiUrl + '/ws-notifications';
  private connected = false;
  private notificationConnected = false;
  
  // Sujets pour les données
  private airQualitySubject = new BehaviorSubject<any>(null);
  private weatherSubject = new BehaviorSubject<any>(null);
  private alertsSubject = new Subject<any>();
  private criticalAlertsSubject = new Subject<any>();
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private alertSummarySubject = new BehaviorSubject<AlertSummary>({ total: 0, danger: 0, warning: 0, info: 0 });
  private connectionStateSubject = new BehaviorSubject<boolean>(false);

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.connected) return;

    const socket = new SockJS('http://localhost:8082/ws-mqtt');
    
    this.client = new Client({
      webSocketFactory: () => socket,
      debug: (msg) => console.debug('[WebSocket] ' + msg),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        Authorization: `Bearer ${this.authService.getToken()}`
      }
    });

    this.client.onConnect = () => {
      console.log('WebSocket connected');
      this.connected = true;
      this.connectionStateSubject.next(true);
      this.subscribeToTopics();
    };

    this.client.onStompError = (frame) => {
      console.error('WebSocket STOMP error:', frame);
      if (frame.headers['message']?.includes('401')) {
        console.log('Authentication error, attempting to reconnect...');
        setTimeout(() => this.connect(), 5000);
      } else {
        this.handleConnectionError();
      }
    };

    this.client.onWebSocketError = (event) => {
      console.error('WebSocket error:', event);
      this.handleConnectionError();
    };

    this.client.onDisconnect = () => {
      console.log('WebSocket disconnected');
      this.connected = false;
      this.connectionStateSubject.next(false);
    };

    this.client.activate();
  }

  connectToNotifications(): void {
    if (this.notificationConnected) return;

    console.log('Connecting to Notification WebSocket...');
    const socket = new SockJS('http://localhost:8082/api/ws-notifications');
    
    this.notificationClient = new Client({
      webSocketFactory: () => socket,
      debug: (msg) => console.debug('[Notification WebSocket] ' + msg),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      connectHeaders: {
        Authorization: `Bearer ${this.authService.getToken()}`
      }
    });

    this.notificationClient.onConnect = () => {
      console.log('Notification WebSocket connected');
      this.notificationConnected = true;
      this.subscribeToNotificationTopics();
    };

    this.notificationClient.onStompError = (frame) => {
      console.error('Notification WebSocket STOMP error:', frame);
      if (frame.headers['message']?.includes('401')) {
        console.log('Authentication error, attempting to reconnect...');
        setTimeout(() => this.connectToNotifications(), 5000);
      } else {
        this.handleNotificationConnectionError();
      }
    };

    this.notificationClient.onWebSocketError = (event) => {
      console.error('Notification WebSocket error:', event);
      this.handleNotificationConnectionError();
    };

    this.notificationClient.onDisconnect = () => {
      console.log('Notification WebSocket disconnected');
      this.notificationConnected = false;
    };

    this.notificationClient.activate();
  }

  private subscribeToTopics(): void {
    if (!this.client) return;

    // Subscribe to notifications
    this.client.subscribe('/topic/notifications', message => {
      const notification = JSON.parse(message.body);
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    });

    // Subscribe to admin notifications
    this.client.subscribe('/topic/admin/notifications', message => {
      const notification = JSON.parse(message.body);
      const currentNotifications = this.notificationsSubject.value;
      this.notificationsSubject.next([notification, ...currentNotifications]);
    });

    this.client.subscribe('/topic/airquality', (message) => {
      try {
        const data = JSON.parse(message.body);
        this.airQualitySubject.next(data);
      } catch (e) {
        console.error('Error parsing air quality data:', e);
      }
    });

    this.client.subscribe('/topic/weather', (message) => {
      try {
        const data = JSON.parse(message.body);
        this.weatherSubject.next(data);
      } catch (e) {
        console.error('Error parsing weather data:', e);
      }
    });

    this.client.subscribe('/topic/alerts', (message) => {
      try {
        const alertData = JSON.parse(message.body);
        this.alertsSubject.next(alertData);
      } catch (e) {
        console.error('Error parsing alert data:', e);
      }
    });

    this.client.subscribe('/topic/critical-alerts', (message) => {
      try {
        const alertData = JSON.parse(message.body);
        this.criticalAlertsSubject.next(alertData);
      } catch (e) {
        console.error('Error parsing critical alert data:', e);
      }
    });

    this.client.subscribe('/topic/alert-summary', (message) => {
      try {
        const summary = JSON.parse(message.body);
        this.alertSummarySubject.next(summary);
      } catch (e) {
        console.error('Error parsing alert summary data:', e);
      }
    });
  }

  private subscribeToNotificationTopics(): void {
    if (!this.notificationClient || !this.notificationConnected) return;

    // Abonnement aux notifications globales (broadcast)
    this.notificationClient.subscribe('/topic/notifications', (message) => {
      try {
        const notification: Notification = JSON.parse(message.body);
        this.notificationsSubject.next(this.notificationsSubject.value.concat([notification]));
      } catch (e) {
        console.error('Error parsing notification:', e);
      }
    });

    // Abonnement aux notifications personnelles (user-specific)
    this.notificationClient.subscribe('/user/topic/notifications', (message) => {
      try {
        const notification: Notification = JSON.parse(message.body);
        this.notificationsSubject.next(this.notificationsSubject.value.concat([notification]));
      } catch (e) {
        console.error('Error parsing user notification:', e);
      }
    });
  }

  private handleConnectionError(): void {
    this.connected = false;
    this.connectionStateSubject.next(false);
  }

  private handleNotificationConnectionError(): void {
    this.notificationConnected = false;
  }

  disconnect(): void {
    if (this.client && this.connected) {
      this.client.deactivate();
      this.connected = false;
      this.connectionStateSubject.next(false);
    }
    if (this.notificationClient && this.notificationConnected) {
      this.notificationClient.deactivate();
      this.notificationConnected = false;
    }
  }

  getAirQualityUpdates(): Observable<any> {
    return this.airQualitySubject.asObservable();
  }

  getWeatherUpdates(): Observable<any> {
    return this.weatherSubject.asObservable();
  }

  getAlerts(): Observable<any> {
    return this.alertsSubject.asObservable();
  }

  getCriticalAlerts(): Observable<any> {
    return this.criticalAlertsSubject.asObservable();
  }

  getNotifications(): Observable<Notification[]> {
    return this.notificationsSubject.asObservable();
  }

  getAlertSummary(): Observable<AlertSummary> {
    return this.alertSummarySubject.asObservable();
  }

  getConnectionState(): Observable<boolean> {
    return this.connectionStateSubject.asObservable();
  }

  sendMessage(destination: string, body: any): void {
    if (!this.client || !this.connected) {
      console.error('Cannot send message: WebSocket not connected');
      return;
    }

    try {
      this.client.publish({
        destination: destination,
        body: JSON.stringify(body)
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  isNotificationConnected(): boolean {
    return this.notificationConnected;
  }
}