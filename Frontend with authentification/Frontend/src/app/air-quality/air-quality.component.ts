import { Component, OnInit, OnDestroy } from '@angular/core';
import { MqttService, AirQualityData, MqttAlert } from '../shared/services/mqtt.service';
import { Subscription, timer } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';
import { Chart, registerables } from 'chart.js';
import { Router } from '@angular/router';
import { AlertService } from '../shared/services/alert.service';

@Component({
  selector: 'app-air-quality',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './air-quality.component.html',
  styleUrls: ['./air-quality.component.css']
})
export class AirQualityComponent implements OnInit, OnDestroy {
  // Current data
  airQualityData: AirQualityData = {
    pm25: 0, pm10: 0, no2: 0, o3: 0, co: 0, aqi: 0
  };
  
  // Alerts and connection
  alerts: MqttAlert[] = [];
  isConnected = false;
  isAdmin = false;
  isReconnecting = false;
  reconnectAttempts = 0;
  lastUpdateTime?: Date;
  
  // Chart
  historyChart?: Chart;
  showHistory = false;
  chartData: any = { labels: [], datasets: [] };
  private chartRefreshInterval = 30000;
  private maxDataPoints = 20;

  private subscriptions: Subscription[] = [];
  private chartRefreshTimer?: Subscription;

  constructor(
    private mqttService: MqttService,
    private authService: AuthService,
    private router: Router,
    private alertService: AlertService
  ) {
    Chart.register(...registerables);
    this.isAdmin = this.authService.isAdmin();
  }

  ngOnInit() {
    console.log('[AirQuality] Initializing component');
    this.initSubscriptions();
    this.initChart();
    this.fetchInitialData();
  }

  private initSubscriptions() {
    this.subscriptions.push(
      this.mqttService.getAirQualityData().subscribe({
        next: data => {
          this.airQualityData = data;
          this.lastUpdateTime = new Date();
          this.updateChartData(data);
        },
        error: err => console.error('[AirQuality] Error in air quality subscription:', err)
      })
    );

    this.subscriptions.push(
      this.mqttService.getAlerts().subscribe({
        next: alert => {
          // Ajout d'un type par défaut si non défini
          if (!alert.type) {
            alert.type = this.isWeatherAlert(alert.message) ? 'weather' : 'air';
          }
          this.alerts.unshift(alert);
          if (this.alerts.length > 5) this.alerts.pop();
        },
        error: err => console.error('[AirQuality] Error in alert subscription:', err)
      })
    );

    this.subscriptions.push(
      this.mqttService.getConnectionStatus().subscribe({
        next: status => {
          this.isConnected = status;
          if (status) {
            this.isReconnecting = false;
            this.reconnectAttempts = 0;
          }
        },
        error: err => console.error('[AirQuality] Error in connection status subscription:', err)
      })
    );
  }

  private isWeatherAlert(message: string): boolean {
    const weatherKeywords = ['tempête', 'chaleur', 'vent', 'humidity', 'temperature', 'météo', 'weather'];
    return weatherKeywords.some(keyword => message.toLowerCase().includes(keyword));
  }

  private fetchInitialData() {
    this.subscriptions.push(
      this.mqttService.fetchAirQualityDataFromApi().subscribe({
        next: data => {
          if (data && data.aqi !== 0) {
            this.airQualityData = data;
            this.lastUpdateTime = new Date();
            this.updateChartData(data);
          }
        },
        error: err => console.error('[AirQuality] Failed to fetch initial data:', err)
      })
    );
  }

  private initChart() {
    this.chartData = {
      labels: Array(this.maxDataPoints).fill(''),
      datasets: [
        {
          label: 'AQI Index',
          data: Array(this.maxDataPoints).fill(0),
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    this.chartRefreshTimer = timer(this.chartRefreshInterval, this.chartRefreshInterval).subscribe(() => {
      if (this.historyChart) {
        this.historyChart.update();
      }
    });
  }

  private updateChartData(newData: AirQualityData) {
    if (this.chartData.labels.length >= this.maxDataPoints) {
      this.chartData.labels.shift();
      this.chartData.datasets[0].data.shift();
    }
    
    const now = new Date();
    this.chartData.labels.push(now.toLocaleTimeString());
    this.chartData.datasets[0].data.push(newData.aqi);
    
    if (this.historyChart) {
      this.historyChart.update();
    } else if (this.showHistory) {
      this.createChart();
    }
  }

  private createChart() {
    const ctx = document.getElementById('historyChart') as HTMLCanvasElement;
    if (ctx) {
      this.historyChart = new Chart(ctx, {
        type: 'line',
        data: this.chartData,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              max: 500,
              title: {
                display: true,
                text: 'AQI Value'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Time'
              }
            }
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: (context) => `AQI: ${context.parsed.y}`
              }
            }
          }
        }
      });
    }
  }

  toggleHistory() {
    this.showHistory = !this.showHistory;
    if (this.showHistory && !this.historyChart) {
      this.createChart();
    }
  }

  clearAlerts() {
    this.alerts = [];
  }

  reconnect() {
    this.isReconnecting = true;
    this.reconnectAttempts++;
    this.mqttService.reconnect();
    
    setTimeout(() => {
      if (!this.isConnected) {
        this.isReconnecting = false;
      }
    }, 10000);
  }

  configureAlerts() {
    this.router.navigate(['/admin/manage-alerts']);
  }

  exportData() {
    this.alertService.exportAlerts('csv').subscribe({
      next: () => console.log('Export réussi'),
      error: (err) => console.error('Erreur export', err)
    });
  }

  getAqiLabel(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }
  
  getAlertTypeClass(type: string): string {
    switch (type) {
      case 'air': return 'bg-blue-100 text-blue-800';
      case 'weather': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  getParameterLabel(parameter: string): string {
    switch (parameter) {
      case 'pm25': return 'PM2.5';
      case 'pm10': return 'PM10';
      case 'no2': return 'NO₂';
      case 'o3': return 'O₃';
      case 'co': return 'CO';
      case 'aqi': return 'AQI';
      case 'temperature': return 'Température';
      case 'humidity': return 'Humidité';
      case 'wind': return 'Vent';
      default: return parameter;
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.chartRefreshTimer) {
      this.chartRefreshTimer.unsubscribe();
    }
    if (this.historyChart) {
      this.historyChart.destroy();
    }
  }
}