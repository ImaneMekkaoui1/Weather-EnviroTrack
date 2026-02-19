import { Component, OnInit } from '@angular/core';
import { AlertService, Alert } from '../../shared/services/alert.service';
import { AuthService } from '../../auth/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.css']
})
export class AlertsComponent implements OnInit {
  alerts: Alert[] = [];
  filteredAlerts: Alert[] = [];
  
  alertTypeFilter: 'all' | 'air' | 'weather' = 'all';
  severityFilter: 'all' | 'danger' | 'warning' | 'info' = 'all';
  searchText: string = '';
  
  isLoading: boolean = false;

  constructor(
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  private loadAlerts(): void {
    this.isLoading = true;
    
    this.alertService.getAlerts().subscribe({
      next: (alerts: Alert[]) => {
        this.alerts = alerts.map(a => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load alerts', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredAlerts = this.alerts.filter(alert => {
      if (this.alertTypeFilter !== 'all' && alert.type !== this.alertTypeFilter) {
        return false;
      }
      
      if (this.severityFilter !== 'all' && alert.severity !== this.severityFilter) {
        return false;
      }
      
      if (this.searchText && 
          !alert.message.toLowerCase().includes(this.searchText.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }

  getParameterLabel(parameter: string | undefined): string {
    const labels: Record<string, string> = {
      temperature: 'Température (°C)',
      humidity: 'Humidité (%)',
      pm25: 'PM2.5 (µg/m³)',
      pm10: 'PM10 (µg/m³)',
      no2: 'NO₂ (ppb)',
      o3: 'O₃ (ppb)',
      co: 'CO (ppm)',
      wind: 'Vent (km/h)',
      aqi: 'Indice Qualité Air'
    };
    return parameter ? labels[parameter] ?? parameter : 'Inconnu';
  }

  getSeverityIconClass(severity: string): string {
    return {
      danger: 'text-red-500 fas fa-exclamation-circle',
      warning: 'text-yellow-500 fas fa-exclamation-triangle',
      info: 'text-blue-500 fas fa-info-circle'
    }[severity] ?? 'fas fa-question-circle';
  }

  getSeverityBadgeClass(severity: string): string {
    return {
      danger: 'bg-red-100 text-red-800 px-2 py-1 text-xs rounded-full',
      warning: 'bg-yellow-100 text-yellow-800 px-2 py-1 text-xs rounded-full',
      info: 'bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded-full'
    }[severity] ?? 'bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-full';
  }

  getTypeBadgeClass(type: string): string {
    return {
      air: 'bg-blue-100 text-blue-800 px-2 py-1 text-xs rounded-full',
      weather: 'bg-green-100 text-green-800 px-2 py-1 text-xs rounded-full'
    }[type] ?? 'bg-gray-100 text-gray-800 px-2 py-1 text-xs rounded-full';
  }

  getAlertsCount(severity: string): number {
    return this.alerts.filter(a => a.severity === severity).length;
  }
}