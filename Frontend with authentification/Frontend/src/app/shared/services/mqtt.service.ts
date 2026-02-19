import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, catchError, of, throwError } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
// @ts-ignore
import SockJS from 'sockjs-client/dist/sockjs.js';
import { AuthService } from '../../auth/auth.service';

export interface AirQualityData {
  humidity?: number;
  temperature?: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  co: number;
  aqi: number;
}

export type Parameter = 'pm25' | 'pm10' | 'no2' | 'o3' | 'co' | 'aqi' | 'temperature' | 'humidity' | 'wind';

export interface MqttAlert {
details: any;
  id?: number;
  timestamp: Date;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  type: 'air' | 'weather';
  parameter?: Parameter;
  value?: number;
}

export interface UserNotification {
  type: string;
  username: string;
  role?: string;
  timestamp: Date;
  message?: string;
}

export interface Sensor {
  id: string;
  name: string;
  type: string;
  location: string;
  status: 'actif' | 'inactif' | 'maintenance';
  value?: string;
  lastUpdate?: Date;
  
}

@Injectable({
  providedIn: 'root'
})
export class MqttService {
  publish(arg0: string, arg1: string) {
    throw new Error('Method not implemented.');
  }
  private client: Client | null = null;
  private apiUrl = environment.apiUrl || 'http://localhost:8082/api';
  private socketUrl = environment.socketUrl || 'http://localhost:8082/ws-mqtt';
  private airQualitySubject = new BehaviorSubject<AirQualityData>(this.getDefaultAirQualityData());
  private alertsSubject = new Subject<MqttAlert>();
  private userNotificationsSubject = new Subject<UserNotification>();
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  private sensorUpdateSubject = new Subject<Sensor>();
  private allSensorsSubject = new Subject<Sensor[]>();
  private stompSubscriptions: StompSubscription[] = [];
  private reconnectionAttempts = 0;
  private maxReconnectionAttempts = 5;

  constructor(private http: HttpClient, private authService: AuthService) {
    console.log('[MQTT] Service initialized');
    this.setupConnection();
  }

  private getDefaultAirQualityData(): AirQualityData {
    return {
      pm25: 0,
      pm10: 0,
      no2: 0,
      o3: 0,
      co: 0,
      aqi: 0
    };
  }

  private setupConnection(): void {
    console.log('[MQTT] Setting up connection');
    try {
      const socket = new SockJS('http://localhost:8082/ws-mqtt');
      this.client = new Client({
        webSocketFactory: () => socket,
        debug: (msg) => console.debug('[MQTT] ' + msg),
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        connectHeaders: {
          Authorization: `Bearer ${this.authService.getToken()}`
        }
      });
      this.client.onConnect = this.onConnected.bind(this);
      this.client.onStompError = this.onStompError.bind(this);
      this.client.onWebSocketError = this.onWebSocketError.bind(this);
      this.client.onWebSocketClose = this.onWebSocketClose.bind(this);
      console.log('[MQTT] Activating client');
      this.client.activate();
    } catch (err) {
      console.error('[MQTT] Error setting up connection:', err);
      this.sendAlert('danger', 'Failed to setup MQTT connection', 'air');
    }
  }

  private sendAlert(severity: 'info' | 'warning' | 'danger', message: string, type: 'air' | 'weather', parameter?: Parameter, value?: number): void {
    const alert: MqttAlert = {
      timestamp: new Date(),
      severity,
      message,
      type,
      parameter,
      value,
      details: undefined
    };
    this.alertsSubject.next(alert);
  }

  private onConnected(): void {
    console.log('[MQTT] Connected to broker');
    this.isConnectedSubject.next(true);
    this.reconnectionAttempts = 0;
    this.sendAlert('info', 'Connected to MQTT broker', 'air');
    this.subscribeToTopics();
  }

  private subscribeToTopics(): void {
    console.log('[MQTT] Subscribing to topics');
    if (!this.client || !this.client.connected) {
      console.warn('[MQTT] Cannot subscribe, client not connected');
      return;
    }

    this.stompSubscriptions.forEach(sub => sub.unsubscribe());
    this.stompSubscriptions = [];

    // Air quality topic
    const airQualitySub = this.client.subscribe('/topic/airquality', (message: IMessage) => {
      try {
        const data: AirQualityData = JSON.parse(message.body);
        console.log('[MQTT] Received air quality data:', data);
        const completeData: AirQualityData = {
          ...this.getDefaultAirQualityData(),
          ...data
        };
        this.airQualitySubject.next(completeData);
      } catch (e) {
        console.error('[MQTT] Error parsing message:', e);
      }
    });
    this.stompSubscriptions.push(airQualitySub);

    // Alerts topic
    const alertsSub = this.client.subscribe('/topic/alerts', (message: IMessage) => {
      try {
        const alert = JSON.parse(message.body);
        console.log('[MQTT] Received alert:', alert);

        const parameter = this.isValidParameter(alert.parameter) ? alert.parameter : undefined;

        if (!alert.type) {
          alert.type = this.determineAlertType(alert.message, parameter);
        }

        this.alertsSubject.next({
          ...alert,
          timestamp: new Date(alert.timestamp),
          parameter
        });
      } catch (e) {
        console.error('[MQTT] Error parsing alert:', e);
      }
    });
    this.stompSubscriptions.push(alertsSub);

    // User notifications topic (for admin)
    const userNotificationsSub = this.client.subscribe('/topic/admin/notifications', (message: IMessage) => {
      try {
        const notification = JSON.parse(message.body);
        console.log('[MQTT] Received user notification:', notification);
        this.userNotificationsSubject.next({
          ...notification,
          timestamp: new Date(notification.timestamp)
        });
      } catch (e) {
        console.error('[MQTT] Error parsing user notification:', e);
      }
    });
    this.stompSubscriptions.push(userNotificationsSub);

    // Sensor updates
    const sensorsSub = this.client.subscribe('/topic/sensors/+', (message: IMessage) => {
      try {
        const sensor = JSON.parse(message.body);
        console.log('[MQTT] Received sensor update:', sensor);
        this.sensorUpdateSubject.next(sensor);
      } catch (e) {
        console.error('[MQTT] Error parsing sensor update:', e);
      }
    });
    this.stompSubscriptions.push(sensorsSub);
  }

  private isValidParameter(value: string): value is Parameter {
    const validParameters: Parameter[] = [
      'pm25', 'pm10', 'no2', 'o3', 'co', 'aqi',
      'temperature', 'humidity', 'wind'
    ];
    return validParameters.includes(value as Parameter);
  }

  private determineAlertType(message: string, parameter?: Parameter): 'air' | 'weather' {
    const weatherParams: Parameter[] = ['temperature', 'humidity', 'wind'];
    const weatherKeywords = ['tempête', 'chaleur', 'vent', 'humidity', 'temperature', 'météo', 'weather'];

    if (parameter && weatherParams.includes(parameter)) {
      return 'weather';
    }

    if (weatherKeywords.some(keyword => message.toLowerCase().includes(keyword))) {
      return 'weather';
    }

    return 'air';
  }

  private onStompError(frame: any): void {
    console.error('[MQTT] STOMP error:', frame);
    if (frame.headers['message']?.includes('401')) {
      console.log('[MQTT] Authentication error, attempting to reconnect...');
      setTimeout(() => this.setupConnection(), 5000);
    } else {
      this.sendAlert('danger', `STOMP error: ${frame.headers?.message || 'Unknown error'}`, 'air');
    }
  }

  private onWebSocketError(event: Event): void {
    console.error('[MQTT] WebSocket error:', event);
    this.isConnectedSubject.next(false);
    this.sendAlert('danger', 'WebSocket connection error', 'air');
  }

  private onWebSocketClose(): void {
    console.warn('[MQTT] WebSocket connection closed');
    this.isConnectedSubject.next(false);

    if (this.reconnectionAttempts < this.maxReconnectionAttempts) {
      this.reconnectionAttempts++;
      console.log(`[MQTT] Attempting to reconnect (${this.reconnectionAttempts}/${this.maxReconnectionAttempts})`);
      this.sendAlert('warning', `Connection lost. Reconnecting (${this.reconnectionAttempts}/${this.maxReconnectionAttempts})...`, 'air');
      setTimeout(() => this.setupConnection(), 5000);
    } else {
      console.error('[MQTT] Max reconnection attempts reached');
      this.sendAlert('danger', 'Failed to reconnect after multiple attempts', 'air');
    }
  }

  public getAirQualityData(): Observable<AirQualityData> {
    return this.airQualitySubject.asObservable();
  }

  public getAlerts(): Observable<MqttAlert> {
    return this.alertsSubject.asObservable();
  }

  public getUserNotifications(): Observable<UserNotification> {
    return this.userNotificationsSubject.asObservable();
  }

  public getConnectionStatus(): Observable<boolean> {
    return this.isConnectedSubject.asObservable();
  }

  public getSensorUpdates(): Observable<Sensor> {
    return this.sensorUpdateSubject.asObservable();
  }

  public isConnected(): boolean {
    return this.client?.connected || false;
  }

  public reconnect(): void {
    console.log('[MQTT] Manual reconnection initiated');
    this.disconnect();
    setTimeout(() => {
      this.setupConnection();
    }, 1000);
  }

  public disconnect(): void {
    console.log('[MQTT] Disconnecting...');
    if (this.client) {
      this.stompSubscriptions.forEach(sub => {
        try {
          sub.unsubscribe();
        } catch (e) {
          console.warn('[MQTT] Error unsubscribing:', e);
        }
      });
      this.stompSubscriptions = [];
      try {
        this.client.deactivate();
        console.log('[MQTT] Disconnected');
      } catch (e) {
        console.error('[MQTT] Error disconnecting:', e);
      }
      this.client = null;
    }
    this.isConnectedSubject.next(false);
  }

  public fetchAirQualityDataFromApi(): Observable<AirQualityData> {
    console.log('[MQTT] Fetching air quality data from API');
    return this.http.get<AirQualityData>(`${this.apiUrl}/airquality/current`).pipe(  // Updated path from /capteurs/current to /airquality/current
      tap(data => {
        console.log('[MQTT] Fetched current air quality:', data);
        const completeData = {
          ...this.getDefaultAirQualityData(),
          ...data
        };
        this.airQualitySubject.next(completeData);
      }),
      catchError(error => {
        console.error('[MQTT] Failed to fetch current air quality:', error);
        this.sendAlert('warning', 'Failed to fetch current air quality data', 'air');
        return of(this.getDefaultAirQualityData());
      })
    );
  }

  public getAllSensors(): Observable<Sensor[]> {
    return this.http.get<Sensor[]>(`${this.apiUrl}/capteurs/all`).pipe(
      tap(sensors => {
        console.log('[MQTT] Fetched all sensors:', sensors);
        this.allSensorsSubject.next(sensors);
      }),
      catchError(error => {
        console.error('[MQTT] Failed to fetch sensors:', error);
        return of([]);
      })
    );
  }

  public addSensor(sensor: Omit<Sensor, 'id'>): Observable<Sensor> {
    return this.http.post<Sensor>(`${this.apiUrl}/capteurs/add`, sensor).pipe(
      catchError(error => {
        console.error('[MQTT] Failed to add sensor:', error);
        throw error;
      })
    );
  }

  public updateSensor(sensor: Sensor): Observable<Sensor> {
    return this.http.put<Sensor>(`${this.apiUrl}/capteurs/${sensor.id}`, sensor).pipe(
      catchError(error => {
        console.error('[MQTT] Failed to update sensor:', error);
        throw error;
      })
    );
  }

  public deleteSensor(sensorId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/capteurs/${sensorId}`).pipe(
      catchError(error => {
        console.error('[MQTT] Failed to delete sensor:', error);
        throw error;
      })
    );
  }

  public simulateSensorData(sensorId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/capteurs/simulate/${sensorId}`, {}).pipe(
      catchError(error => {
        console.error('[MQTT] Failed to simulate sensor data:', error);
        throw error;
      })
    );
  }

  public sendCustomAlert(severity: 'info' | 'warning' | 'danger', message: string, type: 'air' | 'weather', parameter?: string, value?: number): void {
    this.sendAlert(severity, message, type, parameter as Parameter, value);
  }
}