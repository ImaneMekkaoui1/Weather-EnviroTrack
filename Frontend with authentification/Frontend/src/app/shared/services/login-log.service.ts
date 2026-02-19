// login-log.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';

export interface LoginLog {
  id: number;
  username: string;
  ipAddress: string;
  loginTime: string;
  status: 'SUCCESS' | 'FAILURE';
  userAgent?: string;
  path?: string;
  failureReason?: string;
}

export interface LoginLogPage {
  content: LoginLog[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface LoginLogFilters {
  username?: string;
  ipAddress?: string;
  status?: 'SUCCESS' | 'FAILURE' | '';
  startDate?: string;
  endDate?: string;
}

export interface LoginStats {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsersToday: number;
  suspiciousIps: string[];
}

export interface DeleteResponse {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class LoginLogService {
  private readonly baseUrl = 'http://localhost:8082/api/admin/login-logs';

  constructor(private http: HttpClient) {}

  // ===============================
  // MÉTHODES PRINCIPALES
  // ===============================

  getLogs(page: number = 0, size: number = 20): Observable<LoginLogPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<LoginLogPage>(this.baseUrl, { params });
  }

  getLogsWithFilters(filters: LoginLogFilters, page: number = 0, size: number = 20): Observable<LoginLogPage> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters.username) {
      params = params.set('username', filters.username);
    }
    if (filters.ipAddress) {
      params = params.set('ipAddress', filters.ipAddress);
    }
    if (filters.status) {
      params = params.set('status', filters.status);
    }
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<LoginLogPage>(`${this.baseUrl}/search`, { params });
  }

  // ===============================
  // STATISTIQUES
  // ===============================

  getStats(): Observable<LoginStats> {
  return this.http.get<LoginStats>(`${this.baseUrl}/stats`).pipe(
    catchError(error => {
      console.error('Error loading stats:', error);
      // Retournez des statistiques par défaut ou lancez une erreur spécifique
      return of({
        totalLogins: 0,
        successfulLogins: 0,
        failedLogins: 0,
        uniqueUsersToday: 0,
        suspiciousIps: []
      });
    })
  );
}

  getDailyLoginStats(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/stats/daily`);
  }

  getPeakHours(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/stats/peak-hours`);
  }

  getMostActiveUsers(limit: number = 10): Observable<any[]> {
    const params = new HttpParams().set('limit', limit.toString());
    return this.http.get<any[]>(`${this.baseUrl}/stats/active-users`, { params });
  }

  // ===============================
  // SÉCURITÉ
  // ===============================

  getSuspiciousIps(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/security/suspicious-ips`);
  }

  getRecentFailures(hours: number = 24): Observable<LoginLog[]> {
    const params = new HttpParams().set('hours', hours.toString());
    return this.http.get<LoginLog[]>(`${this.baseUrl}/security/recent-failures`, { params });
  }

  checkIpSuspicious(ipAddress: string): Observable<{ suspicious: boolean; attemptCount: number }> {
    const params = new HttpParams().set('ip', ipAddress);
    return this.http.get<{ suspicious: boolean; attemptCount: number }>(`${this.baseUrl}/security/check-ip`, { params });
  }

  // ===============================
  // GESTION DES DONNÉES
  // ===============================

  cleanOldLogs(daysToKeep: number): Observable<{ deletedCount: number }> {
    const params = new HttpParams().set('daysToKeep', daysToKeep.toString());
    return this.http.delete<{ deletedCount: number }>(`${this.baseUrl}/cleanup`, { params });
  }

  exportToCsv(filters?: LoginLogFilters): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.username) params = params.set('username', filters.username);
      if (filters.ipAddress) params = params.set('ipAddress', filters.ipAddress);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
    }

    return this.http.get(`${this.baseUrl}/export/csv`, { 
      params, 
      responseType: 'blob' 
    });
  }

  // ===============================
  // MÉTHODES UTILITAIRES
  // ===============================

  getUserLogs(username: string, page: number = 0, size: number = 20): Observable<LoginLogPage> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<LoginLogPage>(`${this.baseUrl}/user/${username}`, { params });
  }

  getTodayLogs(): Observable<LoginLog[]> {
    return this.http.get<LoginLog[]>(`${this.baseUrl}/today`);
  }

  getLastUserLogin(username: string): Observable<LoginLog | null> {
    return this.http.get<LoginLog | null>(`${this.baseUrl}/user/${username}/last`);
  }

  deleteLog(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(
      catchError(error => {
        console.error('Error deleting log:', error);
        return of({ success: false, message: 'Erreur lors de la suppression' });
      })
    );
  }

  exportToPdf(filters?: LoginLogFilters): Observable<Blob> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.username) params = params.set('username', filters.username);
      if (filters.ipAddress) params = params.set('ipAddress', filters.ipAddress);
      if (filters.status) params = params.set('status', filters.status);
      if (filters.startDate) params = params.set('startDate', filters.startDate);
      if (filters.endDate) params = params.set('endDate', filters.endDate);
    }

    return this.http.get(`${this.baseUrl}/export/pdf`, { 
      params, 
      responseType: 'blob',
      headers: {
        'Accept': 'application/pdf'
      }
    });
  }
}