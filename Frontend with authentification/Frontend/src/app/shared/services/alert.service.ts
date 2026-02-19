import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface Alert {
  id: number;
  timestamp: Date;
  severity: 'info' | 'warning' | 'danger';
  message: string;
  parameter?: 'pm25' | 'pm10' | 'no2' | 'o3' | 'co' | 'aqi' | 'temperature' | 'humidity' | 'wind';
  value?: number;
  type: 'air' | 'weather';
}

export interface AlertThreshold {
  id: number;
  parameter: 'pm25' | 'pm10' | 'no2' | 'o3' | 'co' | 'aqi' | 'temperature' | 'humidity' | 'wind';
  warningThreshold: number;
  criticalThreshold: number;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AlertService {
  private apiUrl = 'http://localhost:8082/api/alerts';
  private thresholdsUrl = 'http://localhost:8082/api/alerts/thresholds';

  // Seuils par défaut pour le développement
  private defaultThresholds: AlertThreshold[] = [
    { id: 1, parameter: 'temperature', warningThreshold: 30, criticalThreshold: 35, updatedAt: new Date() },
    { id: 2, parameter: 'humidity', warningThreshold: 70, criticalThreshold: 80, updatedAt: new Date() },
    { id: 3, parameter: 'pm25', warningThreshold: 35, criticalThreshold: 55, updatedAt: new Date() },
    { id: 4, parameter: 'pm10', warningThreshold: 50, criticalThreshold: 80, updatedAt: new Date() },
    { id: 5, parameter: 'no2', warningThreshold: 100, criticalThreshold: 200, updatedAt: new Date() },
    { id: 6, parameter: 'o3', warningThreshold: 100, criticalThreshold: 180, updatedAt: new Date() },
    { id: 7, parameter: 'co', warningThreshold: 5, criticalThreshold: 10, updatedAt: new Date() },
    { id: 8, parameter: 'wind', warningThreshold: 30, criticalThreshold: 50, updatedAt: new Date() },
    { id: 9, parameter: 'aqi', warningThreshold: 50, criticalThreshold: 100, updatedAt: new Date() }
  ];

  constructor(private http: HttpClient) { }

  // Méthode privée pour obtenir les headers d'authentification
  private getAuthHeaders(): HttpHeaders {
    // Si vous utilisez un token JWT stocké dans localStorage
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Méthode pour recalculer les alertes en fonction des nouveaux seuils
  recalculateAlerts(): Observable<void> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.post<void>(`${this.apiUrl}/recalculate`, {}, httpOptions).pipe(
      tap(() => console.log('Alerts recalculated based on new thresholds')),
      catchError(this.handleError<void>('recalculateAlerts'))
    );
  }

  // Gestion des alertes
  createAlert(alertData: Omit<Alert, 'id'>): Observable<Alert> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.post<Alert>(this.apiUrl, alertData, httpOptions).pipe(
      tap((newAlert) => console.log('Alert created:', newAlert)),
      catchError(this.handleError<Alert>('createAlert'))
    );
  }

  getAlerts(): Observable<Alert[]> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.get<Alert[]>(this.apiUrl, httpOptions).pipe(
      map(alerts => alerts.map(alert => ({
        ...alert,
        timestamp: new Date(alert.timestamp)
      }))),
      catchError(this.handleError<Alert[]>('getAlerts', []))
    );
  }

  getAirQualityAlerts(): Observable<Alert[]> {
    return this.getAlerts().pipe(
      map(alerts => alerts.filter(a => a.type === 'air'))
    );
  }

  getWeatherAlerts(): Observable<Alert[]> {
    return this.getAlerts().pipe(
      map(alerts => alerts.filter(a => a.type === 'weather'))
    );
  }

  getAlert(id: number): Observable<Alert> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.get<Alert>(`${this.apiUrl}/${id}`, httpOptions).pipe(
      map(alert => ({
        ...alert,
        timestamp: new Date(alert.timestamp)
      })),
      catchError(this.handleError<Alert>('getAlert'))
    );
  }

  deleteAlert(alertId: number): Observable<void> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.delete<void>(`${this.apiUrl}/${alertId}`, httpOptions).pipe(
      tap(() => console.log('Alert deleted:', alertId)),
      catchError(this.handleError<void>('deleteAlert'))
    );
  }

  clearAllAlerts(): Observable<void> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.delete<void>(`${this.apiUrl}/clear`, httpOptions).pipe(
      tap(() => console.log('All alerts cleared')),
      catchError(this.handleError<void>('clearAllAlerts'))
    );
  }

  // Gestion des seuils
  getThresholds(): Observable<AlertThreshold[]> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.get<AlertThreshold[]>(`${this.thresholdsUrl}`, httpOptions).pipe(
      map(thresholds => thresholds.map(t => ({
        ...t,
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date()
      }))),
      catchError((error: any) => {
        console.error('Failed to fetch thresholds, using defaults', error);
        return of(this.defaultThresholds);
      })
    );
  }

  updateThreshold(threshold: AlertThreshold): Observable<AlertThreshold> {
    const httpOptions = {
      headers: this.getAuthHeaders()
    };
    
    return this.http.put<AlertThreshold>(
      `${this.thresholdsUrl}/${threshold.id}`,
      threshold,
      httpOptions
    ).pipe(
      tap(updated => {
        console.log('Threshold updated:', updated);
        // Mettre à jour les valeurs par défaut si on les utilise
        const index = this.defaultThresholds.findIndex(t => t.id === threshold.id);
        if (index !== -1) {
          this.defaultThresholds[index] = {
            ...threshold,
            updatedAt: new Date()
          };
        }
      }),
      catchError((error: any) => {
        console.error('Failed to update threshold, updating locally', error);
        // Mettre à jour localement en cas d'erreur
        const index = this.defaultThresholds.findIndex(t => t.id === threshold.id);
        if (index !== -1) {
          this.defaultThresholds[index] = {
            ...threshold,
            updatedAt: new Date()
          };
        }
        return of(this.defaultThresholds[index]);
      })
    );
  }

  // Export des données
  exportAlerts(format: 'csv' | 'json' | 'pdf', type: 'all' | 'air' | 'weather' = 'all'): Observable<Alert[]> {
    return this.getAlerts().pipe(
      map(alerts => {
        if (type === 'air') return alerts.filter(a => a.type === 'air');
        if (type === 'weather') return alerts.filter(a => a.type === 'weather');
        return alerts;
      }),
      tap(alerts => {
        switch (format) {
          case 'csv':
            this.exportToCSV(alerts);
            break;
          case 'json':
            this.exportToJSON(alerts);
            break;
          case 'pdf':
            this.exportToPDF(alerts);
            break;
        }
      }),
      catchError(this.handleError<Alert[]>('exportAlerts', []))
    );
  }

  private exportToCSV(alerts: Alert[]): void {
    const headers = ['ID', 'Date', 'Type', 'Severity', 'Parameter', 'Value', 'Message'];
    const rows = alerts.map(a => [
      a.id,
      a.timestamp.toISOString(),
      a.type,
      a.severity,
      a.parameter || '',
      a.value || '',
      `"${a.message.replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `alerts_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  private exportToJSON(alerts: Alert[]): void {
    const data = JSON.stringify(alerts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    saveAs(blob, `alerts_${new Date().toISOString().slice(0, 10)}.json`);
  }

  private exportToPDF(alerts: Alert[]): void {
    const doc = new jsPDF();
    doc.text('Alertes - Historique', 14, 16);
    
    autoTable(doc, {
      startY: 20,
      head: [['ID', 'Date', 'Type', 'Sévérité', 'Paramètre', 'Valeur', 'Message']],
      body: alerts.map(a => [
        a.id,
        a.timestamp.toLocaleString(),
        a.type,
        a.severity.toUpperCase(),
        a.parameter || 'N/A',
        a.value?.toString() || 'N/A',
        a.message
      ]),
      styles: {
        cellPadding: 3,
        fontSize: 8,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 15 },
        3: { cellWidth: 15 },
        4: { cellWidth: 15 },
        5: { cellWidth: 15 },
        6: { cellWidth: 'auto' }
      }
    });
    
    doc.save(`alerts_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }
}