import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { WeatherService } from '../../shared/services/weather.service';
import { AirQualityService } from '../../shared/services/air-quality.service';
import { MqttService } from '../../shared/services/mqtt.service';
import { CapteurService, Capteur } from '../../shared/services/sensor.service';
import { Chart, registerables } from 'chart.js';
import { Subscription, interval } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

interface WeatherData {
  openWeather?: {
    weather?: Array<{ id: number; main: string; description: string; icon: string; }>;
    main?: { temp: number; feels_like: number; humidity: number; pressure: number; };
    wind?: { speed: number; deg: number; };
  };
  temp?: number;
  feels_like?: number;
  humidity?: number;
  pressure?: number;
  wind_speed?: number;
}

interface SensorData {
  id: string;
  type: string;
  value: number;
  unit: string;
  timestamp: Date;
  status: 'active' | 'inactive' | 'warning' | 'error';
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface Reading {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  icon: string;
  trend: string;
}

interface AlertLog {
  id: string;
  type: 'info' | 'warning' | 'danger';
  message: string;
  timestamp: Date;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy, AfterViewInit {
  userName: string = '';
  currentLocation: string = 'El Jadida';
  currentWeather: any = {
    temp: 0,
    feelsLike: 0,
    humidity: 0,
    pressure: 0,
    wind_speed: 0,
    condition: '',
    icon: ''
  };
  weatherDescription: string = '';
  weatherIcon: string = '';
  airQualityData: any = { aqi: 0, pm25: 0, pm10: 0, status: 'loading...' };
  sensors: SensorData[] = [];
  activeSensorsCount: number = 0;
  alerts: Alert[] = [];
  unreadAlertsCount: number = 0;
  weatherChart: Chart | null = null;
  recentReadings: Reading[] = [];
  alertsLog: AlertLog[] = [];
  weatherChartType: 'temp' | 'precip' | 'wind' = 'temp';
  lastUpdate = new Date();
  dailyForecast: any[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private authService: AuthService,
    private weatherService: WeatherService,
    private airQualityService: AirQualityService,
    private mqttService: MqttService,
    private capteurService: CapteurService,
    private router: Router
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.loadUserData();
    this.loadInitialData();
    this.setupRealTimeUpdates();
    this.loadDynamicData();

    // Sidebar toggles
    document.getElementById('mobileSidebarToggle')?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('-translate-x-full');
    });
    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
      const sidebar = document.getElementById('sidebar');
      if (sidebar) sidebar.classList.toggle('-translate-x-full');
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initWeatherChart(), 500); // Wait for data
  }

  private loadUserData(): void {
    const user = this.authService.getCurrentUser();
    this.userName = user?.email || 'Utilisateur';
  }

  private loadInitialData(): void {
    // Météo dynamique avec getDetailedWeather
    this.subscriptions.push(
      this.weatherService.getDetailedWeather(this.currentLocation).subscribe({
        next: (data) => {
          if (!data) return;
          
          this.currentWeather = {
            temp: data.current.temp,
            feelsLike: data.current.feelsLike,
            humidity: data.current.humidity,
            pressure: data.current.pressure,
            wind_speed: data.wind.speed,
            condition: data.current.condition,
            icon: data.current.icon
          };
          
          this.weatherDescription = data.current.condition;
          this.weatherIcon = this.getWeatherIcon(data.current.icon);
          this.dailyForecast = data.daily || [];
          
          this.updateRecentReadings();
          this.updateWeatherChart();
          this.lastUpdate = new Date();
        },
        error: (err) => {
          console.error('Erreur météo:', err);
          this.generateMockData();
        }
      })
    );

    // Qualité de l'air dynamique
    this.subscriptions.push(
      this.airQualityService.getCurrentAirQuality().subscribe({
        next: (data) => {
          this.airQualityData = {
            aqi: data.aqi,
            pm25: data.pm25,
            pm10: data.pm10,
            status: this.getAqiStatus(data.aqi)
          };
          this.lastUpdate = new Date();
        },
        error: (err) => console.error('Erreur qualité air:', err)
      })
    );
  }

  private loadDynamicData(): void {
    this.subscriptions.push(
      this.capteurService.getCurrentCapteurs().subscribe({
        next: (capteurs: Capteur[]) => {
          this.sensors = capteurs.map(capteur => ({
            id: capteur.id.toString(),
            type: capteur.type,
            value: this.parseValue(capteur.valeur || '0'),
            unit: this.getUnitByType(capteur.type),
            timestamp: capteur.derniereMiseAJour ? new Date(capteur.derniereMiseAJour) : new Date(),
            status: this.mapCapteurStatus(capteur.statut)
          }));
          this.activeSensorsCount = this.sensors.filter(s => s.status === 'active').length;
          this.updateRecentReadings();
          this.generateDynamicAlerts();
        },
        error: (err) => {
          console.error('Erreur chargement capteurs:', err);
          this.sensors = [];
          this.activeSensorsCount = 0;
          this.updateRecentReadings();
        }
      })
    );
  }

  private parseValue(valeur: string): number {
    const numericValue = parseFloat(valeur.replace(/[^\d.-]/g, ''));
    return isNaN(numericValue) ? 0 : numericValue;
  }

  private getUnitByType(type: string): string {
    const unitMap: Record<string, string> = {
      'temperature': '°C',
      'humidity': '%',
      'pressure': 'hPa',
      'wind': 'km/h',
      'pm25': 'µg/m³',
      'pm10': 'µg/m³',
      'co2': 'ppm',
      'light': 'lux'
    };
    return unitMap[type?.toLowerCase()] || '';
  }

  private mapCapteurStatus(statut: string): 'active' | 'inactive' | 'warning' | 'error' {
    switch (statut?.toLowerCase()) {
      case 'actif':
      case 'active':
        return 'active';
      case 'inactif':
      case 'inactive':
        return 'inactive';
      case 'warning':
      case 'attention':
        return 'warning';
      case 'error':
      case 'erreur':
        return 'error';
      default:
        return 'inactive';
    }
  }

  private updateRecentReadings(): void {
    // Capteurs triés par dernière mise à jour
    const sortedSensors = [...this.sensors].sort((a, b) =>
      (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0)
    );
    this.recentReadings = sortedSensors.slice(0, 4).map(sensor => ({
      id: sensor.id,
      name: this.getSensorDisplayName(sensor.type),
      value: sensor.value,
      unit: sensor.unit,
      timestamp: sensor.timestamp,
      icon: this.getSensorIcon(sensor.type),
      trend: this.getTrend(sensor.value, this.sensors.find(s => s.type === sensor.type)?.value || 0)
    }));

    // Ajouter la température météo si elle n'est pas déjà dans les capteurs
    if (
      this.currentWeather.temp !== undefined &&
      !this.recentReadings.some(r => r.name === 'Température')
    ) {
      this.recentReadings.unshift({
        id: 'weather-temp',
        name: 'Température',
        value: this.currentWeather.temp,
        unit: '°C',
        timestamp: new Date(),
        icon: 'temperature-high',
        trend: this.getTrend(this.currentWeather.temp, this.sensors.find(s => s.type === 'temperature')?.value || 0)
      });
    }

    // Ajouter l'humidité si elle n'est pas déjà dans les capteurs
    if (
      this.currentWeather.humidity !== undefined &&
      !this.recentReadings.some(r => r.name === 'Humidité')
    ) {
      this.recentReadings.unshift({
        id: 'weather-humidity',
        name: 'Humidité',
        value: this.currentWeather.humidity,
        unit: '%',
        timestamp: new Date(),
        icon: 'tint',
        trend: this.getTrend(this.currentWeather.humidity, this.sensors.find(s => s.type === 'humidity')?.value || 0)
      });
    }

    // Ajouter la qualité de l'air si elle n'est pas déjà dans les capteurs
    if (
      this.airQualityData.aqi !== undefined &&
      !this.recentReadings.some(r => r.name === 'Qualité de l\'air')
    ) {
      this.recentReadings.unshift({
        id: 'air-quality',
        name: 'Qualité de l\'air',
        value: this.airQualityData.aqi,
        unit: '',
        timestamp: new Date(),
        icon: 'wind',
        trend: ''
      });
    }

    this.recentReadings = this.recentReadings.slice(0, 4);
  }

  private getSensorDisplayName(type: string): string {
    const nameMap: Record<string, string> = {
      'temperature': 'Température',
      'humidity': 'Humidité',
      'pressure': 'Pression',
      'wind': 'Vent',
      'pm25': 'PM2.5',
      'pm10': 'PM10',
      'co2': 'CO2',
      'light': 'Luminosité'
    };
    return nameMap[type?.toLowerCase()] || type;
  }

  private getSensorIcon(type: string): string {
    const iconMap: Record<string, string> = {
      'temperature': 'temperature-high',
      'humidity': 'tint',
      'pressure': 'compress-alt',
      'wind': 'wind',
      'pm25': 'smog',
      'pm10': 'smog',
      'co2': 'leaf',
      'light': 'sun'
    };
    return iconMap[type?.toLowerCase()] || 'circle';
  }

  private generateDynamicAlerts(): void {
    this.alerts = [];
    this.sensors.forEach(sensor => {
      if (sensor.type === 'temperature' && sensor.value > 30) {
        this.alerts.push({
          id: `temp-${sensor.id}`,
          type: sensor.value > 35 ? 'danger' : 'warning',
          title: 'Température élevée',
          message: `Capteur ${sensor.id}: ${sensor.value}${sensor.unit}`,
          timestamp: new Date(),
          read: false
        });
      }
      if (sensor.type === 'humidity' && sensor.value > 70) {
        this.alerts.push({
          id: `hum-${sensor.id}`,
          type: sensor.value > 80 ? 'danger' : 'warning',
          title: 'Humidité élevée',
          message: `Capteur ${sensor.id}: ${sensor.value}${sensor.unit}`,
          timestamp: new Date(),
          read: false
        });
      }
      if (sensor.status === 'error' || sensor.status === 'inactive') {
        this.alerts.push({
          id: `status-${sensor.id}`,
          type: 'warning',
          title: 'Capteur hors ligne',
          message: `Le capteur ${sensor.id} (${this.getSensorDisplayName(sensor.type)}) est ${sensor.status === 'error' ? 'en erreur' : 'inactif'}`,
          timestamp: new Date(),
          read: false
        });
      }
    });
    if (this.airQualityData.aqi > 100) {
      this.alerts.push({
        id: 'air-quality',
        type: this.airQualityData.aqi > 150 ? 'danger' : 'warning',
        title: 'Qualité d\'air dégradée',
        message: `AQI: ${this.airQualityData.aqi} - ${this.airQualityData.status}`,
        timestamp: new Date(),
        read: false
      });
    }
    this.unreadAlertsCount = this.alerts.filter(a => !a.read).length;
    this.updateAlertsLog();
  }

  private updateAlertsLog(): void {
    const newLogEntries = this.alerts.map(alert => ({
      id: alert.id + '-log',
      type: alert.type,
      message: `${alert.title}: ${alert.message}`,
      timestamp: alert.timestamp
    }));
    this.alertsLog = [...newLogEntries, ...this.alertsLog]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);
  }

  private setupRealTimeUpdates(): void {
    this.subscriptions.push(
      this.mqttService.getAirQualityData().subscribe(data => {
        this.airQualityData = {
          aqi: data.aqi,
          pm25: data.pm25,
          pm10: data.pm10,
          status: this.getAqiStatus(data.aqi)
        };
      })
    );
    this.subscriptions.push(
      this.mqttService.getAlerts().subscribe(alert => {
        this.addNewAlert(alert);
      })
    );
    this.subscriptions.push(
      interval(300000).subscribe(() => {
        this.loadInitialData();
        this.loadDynamicData();
      })
    );
    this.subscriptions.push(
      interval(60000).subscribe(() => {
        this.loadDynamicData();
      })
    );
  }

  private updateWeatherChart(): void {
    if (!this.weatherChart) {
      this.initWeatherChart();
      return;
    }

    const labels = this.dailyForecast.map(forecast => 
      new Date(forecast.date).toLocaleDateString('fr-FR', { weekday: 'short' })
    );

    let data: number[] = [];
    let color: string = '';
    let label: string = '';

    switch (this.weatherChartType) {
      case 'temp':
        data = this.dailyForecast.map(forecast => forecast.maxTemp);
        color = '#3b82f6';
        label = 'Température (°C)';
        break;
      case 'precip':
        data = this.dailyForecast.map(forecast => forecast.precipitation);
        color = '#0ea5e9';
        label = 'Précipitations (mm)';
        break;
      case 'wind':
        data = this.dailyForecast.map(forecast => forecast.windSpeed);
        color = '#6366f1';
        label = 'Vent (km/h)';
        break;
    }

    this.weatherChart.data.labels = labels;
    this.weatherChart.data.datasets[0].data = data;
    this.weatherChart.data.datasets[0].borderColor = color;
    this.weatherChart.data.datasets[0].backgroundColor = `${color}20`;
    this.weatherChart.data.datasets[0].label = label;
    this.weatherChart.update();
  }

  private initWeatherChart(): void {
    const weatherCtx = document.getElementById('weatherChart') as HTMLCanvasElement;
    if (!weatherCtx) return;

    const labels = this.dailyForecast.map(forecast => 
      new Date(forecast.date).toLocaleDateString('fr-FR', { weekday: 'short' })
    );

    const data = this.dailyForecast.map(forecast => forecast.maxTemp);

    this.weatherChart = new Chart(weatherCtx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Température (°C)',
          data: data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: false } }
      }
    });
  }

  private generateMockData(): void {
    const now = new Date();
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    
    this.dailyForecast = Array(6).fill(0).map((_, i) => {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      return {
        date: date,
        day: days[date.getDay()],
        maxTemp: Math.round(20 + Math.random() * 8),
        minTemp: Math.round(12 + Math.random() * 5),
        precipitation: Math.round(Math.random() * 60),
        windSpeed: Math.round(5 + Math.random() * 10)
      };
    });

    this.currentWeather = {
      temp: 22,
      feelsLike: 23,
      humidity: 65,
      pressure: 1013,
      wind_speed: 15,
      condition: 'Ensoleillé',
      icon: '01d'
    };

    this.weatherDescription = 'Ensoleillé';
    this.weatherIcon = 'sun';
    this.updateWeatherChart();
  }

  changeWeatherChartType(type: 'temp' | 'precip' | 'wind'): void {
    this.weatherChartType = type;
    if (!this.weatherChart) return;
    let data: number[] = [];
    let color: string = '';
    let label: string = '';
    switch (type) {
      case 'temp':
        const baseTemp = this.currentWeather.temp || 25;
        data = Array(6).fill(0).map(() => Math.floor(Math.random() * 8 - 4 + baseTemp));
        color = '#3b82f6';
        label = 'Température (°C)';
        break;
      case 'precip':
        data = Array(6).fill(0).map(() => Math.floor(Math.random() * 50));
        color = '#0ea5e9';
        label = 'Précipitations (mm)';
        break;
      case 'wind':
        const baseWind = this.currentWeather.wind_speed || 15;
        data = Array(6).fill(0).map(() => Math.floor(Math.random() * 10 - 5 + baseWind));
        color = '#6366f1';
        label = 'Vent (km/h)';
        break;
    }
    this.weatherChart.data.datasets[0].data = data;
    this.weatherChart.data.datasets[0].borderColor = color;
    this.weatherChart.data.datasets[0].backgroundColor = `${color}20`;
    this.weatherChart.data.datasets[0].label = label;
    this.weatherChart.update();
  }

  private addNewAlert(alert: any): void {
    const newAlert: Alert = {
      id: Date.now().toString(),
      type: alert.level === 'critical' ? 'danger' : 'warning',
      title: `Alerte ${alert.level}`,
      message: alert.message,
      timestamp: new Date(),
      read: false
    };
    this.alerts.unshift(newAlert);
    this.unreadAlertsCount++;
  }

  private getAqiStatus(aqi: number): string {
    if (aqi <= 50) return 'Bon';
    if (aqi <= 100) return 'Modéré';
    if (aqi <= 150) return 'Mauvais pour groupes sensibles';
    if (aqi <= 200) return 'Mauvais';
    if (aqi <= 300) return 'Très mauvais';
    return 'Dangereux';
  }

  getWeatherIcon(iconCode: string): string {
    const icons: Record<string, string> = {
      '01d': 'sun', '01n': 'moon',
      '02d': 'cloud-sun', '02n': 'cloud-moon',
      '03d': 'cloud', '03n': 'cloud',
      '04d': 'cloud', '04n': 'cloud',
      '09d': 'cloud-rain', '09n': 'cloud-rain',
      '10d': 'cloud-sun-rain', '10n': 'cloud-moon-rain',
      '11d': 'bolt', '11n': 'bolt',
      '13d': 'snowflake', '13n': 'snowflake',
      '50d': 'smog', '50n': 'smog'
    };
    return icons[iconCode] || 'cloud';
  }

  private getTrend(currentValue: number, previousValue: number): string {
    if (currentValue > previousValue) {
      return '↑';
    } else if (currentValue < previousValue) {
      return '↓';
    } else {
      return '';
    }
  }

  markAlertAsRead(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.read) {
      alert.read = true;
      this.unreadAlertsCount--;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.weatherChart?.destroy();
  }
}