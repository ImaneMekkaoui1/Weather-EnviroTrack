import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { Chart, ChartTypeRegistry, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { Subscription, interval } from 'rxjs';
import { MqttService } from '../../shared/services/mqtt.service';
import { AirQualityService } from '../../shared/services/air-quality.service';
// AJOUT IMPORTANT : Import du NotificationService
import { NotificationService, Notification } from '../../shared/services/notification.service';
import { CapteurService, Capteur } from '../../shared/services/sensor.service';
import { WebSocketService } from '../../shared/services/WebSocket.service';
import type { Notification as ServiceNotification } from '../../shared/services/notification.service';

declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable?: {
      finalY: number;
    };
    autoTable: (options: UserOptions) => jsPDF;
  }
}

interface SensorStatus {
  online: number;
  offline: number;
  maintenance: number;
}

interface AlertData {
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp?: number;
  aqi?: number;
  parameter?: string;
}

interface UserNotification {
  type: string;
  username: string;
  role?: string;
  timestamp: Date;
  message?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  lastUpdate = new Date();
  unreadNotifications = 0;
  showNotificationsPanel = false;
  activeTab: 'users' | 'alerts' = 'alerts';
  private dataSubscriptions: Subscription[] = [];
  
  // AJOUT : Liste des notifications système
  systemNotifications: Notification[] = [];
  
  sensors: Capteur[] = [];
  stats = {
    activeSensors: 0,
    sensorsChange: 0,
    monthlyAlerts: 0,
    alertsChange: 0,
    dataPoints: 0,
    dataPointsChange: 0
  };
  sensorStatus = {
    online: 0,
    offline: 0,
    maintenance: 0
  };

  recentAlerts: AlertData[] = [];
  criticalAlerts: AlertData[] = [];
  userNotifications: UserNotification[] = [];

  airQualityData = {
    current: 0,
    pm25: 0,
    pm10: 0,
    co: 0,
    no2: 0,
    o3: 0,
    temperature: 0,
    humidity: 0,
    levels: [0, 0, 0, 0, 0, 0, 0]
  };

  currentUser = {
    name: 'Imane Admin',
    role: 'Administrateur',
    initials: 'IA'
  };

  private charts: { [key: string]: Chart<keyof ChartTypeRegistry, number[], string> | null } = {};

  constructor(
    private mqttService: MqttService,
    private airQualityService: AirQualityService,
    private router: Router,
    // AJOUT IMPORTANT : Injection du NotificationService
    private notificationService: NotificationService,
    private capteurService: CapteurService,
    private webSocketService: WebSocketService
  ) {
    Chart.register(...registerables);
  }

  ngOnInit(): void {
    this.initializeData();
    this.setupMqttSubscriptions();
    this.setupNotificationSubscriptions();
    setTimeout(() => {
      this.createMiniCharts();
      this.createActivityChart();
      this.updateAirQualityChart();
    }, 100);
    this.dataSubscriptions.push(
      interval(30000).subscribe(() => {
        this.updateCharts();
        this.lastUpdate = new Date();
        this.loadSystemNotifications();
      })
    );
    this.loadSystemNotifications();
    this.loadSensorsStats();
    // Connexion WebSocket notifications temps réel
    this.webSocketService.connectToNotifications();
    this.dataSubscriptions.push(
      this.webSocketService.getNotifications().subscribe((notif: any) => {
        // Transformation pour garantir la présence du champ 'user' et forcer le typage
        const notifWithUser: ServiceNotification = {
          user: notif.user || { id: 0, email: '', username: '' },
          ...notif
        };
        this.systemNotifications = [notifWithUser, ...this.systemNotifications].slice(0, 10);
        this.unreadNotifications++;
      })
    );
  }
  
  ngOnDestroy(): void {
    this.dataSubscriptions.forEach(sub => sub.unsubscribe());
    Object.values(this.charts).forEach(chart => chart?.destroy());
  }

  // Configuration des abonnements aux notifications
  private setupNotificationSubscriptions(): void {
    // Abonnement au compteur de notifications non lues
    this.dataSubscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadNotifications = count;
        console.log('Nombre de notifications non lues:', count);
      })
    );

    // Abonnement aux notifications
    this.dataSubscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        console.log('Nouvelles notifications reçues:', notifications);
        this.systemNotifications = notifications.slice(0, 10); // Garder seulement les 10 dernières
        
        // Vérifier les nouvelles notifications de type NEW_USER
        notifications.forEach(notification => {
          if (notification.type === 'NEW_USER' && notification.status === 'UNREAD') {
            this.handleNewUserNotification(notification);
          }
        });
      })
    );
  }

  // Charger les notifications système
  private loadSystemNotifications(): void {
    this.notificationService.loadNotifications(0, 10).subscribe(
      response => {
        console.log('Notifications chargées:', response);
        this.systemNotifications = response.content;
        // Mettre à jour le compteur d'alertes basé sur les notifications
        const criticalCount = response.content.filter(n => 
          n.type === 'CRITICAL_THRESHOLD_ALERT' || 
          n.type === 'NEW_USER'
        ).length;
        
        if (criticalCount > this.stats.monthlyAlerts) {
          this.stats.monthlyAlerts = criticalCount;
        }
      },
      error => {
        console.error('Erreur lors du chargement des notifications:', error);
      }
    );
  }

  // Gérer une nouvelle notification utilisateur
  private handleNewUserNotification(notification: Notification): void {
    console.log('Traitement d\'une nouvelle notification utilisateur:', notification);
    const userNotification: UserNotification = {
      type: 'NEW_USER_REGISTRATION',
      username: notification.user.username,
      role: 'En attente de validation',
      timestamp: new Date(notification.createdAt),
      message: notification.message
    };

    // Ajouter à la liste des notifications utilisateur
    this.userNotifications.unshift(userNotification);
    if (this.userNotifications.length > 20) {
      this.userNotifications.pop();
    }

    // Afficher un toast de notification
    this.showToast({
      title: 'Nouveau compte utilisateur',
      message: `${notification.user.username} demande une validation de compte`,
      severity: 'medium'
    });
  }

  // MÉTHODE MODIFIÉE : Approuver un utilisateur depuis le dashboard
  approveUserFromDashboard(notification: Notification): void {
    if (notification.user?.id) {
      this.notificationService.approveUserRegistration(notification.user.id).subscribe(
        () => {
          console.log('Utilisateur approuvé avec succès');
          // Marquer la notification comme lue
          this.notificationService.markAsRead(notification.id).subscribe();
          // Recharger les notifications
          this.loadSystemNotifications();
          
          this.showToast({
            title: 'Utilisateur approuvé',
            message: `${notification.user.username} a été approuvé`,
            severity: 'low'
          });
        },
        error => {
          console.error('Erreur lors de l\'approbation:', error);
          this.showToast({
            title: 'Erreur',
            message: 'Erreur lors de l\'approbation de l\'utilisateur',
            severity: 'high'
          });
        }
      );
    }
  }

  // MÉTHODE MODIFIÉE : Rejeter un utilisateur depuis le dashboard
  rejectUserFromDashboard(notification: Notification): void {
    if (notification.user?.id) {
      this.notificationService.rejectUserRegistration(notification.user.id).subscribe(
        () => {
          console.log('Utilisateur rejeté');
          // Marquer la notification comme lue
          this.notificationService.markAsRead(notification.id).subscribe();
          // Recharger les notifications
          this.loadSystemNotifications();
          
          this.showToast({
            title: 'Utilisateur rejeté',
            message: `${notification.user.username} a été rejeté`,
            severity: 'medium'
          });
        },
        error => {
          console.error('Erreur lors du rejet:', error);
          this.showToast({
            title: 'Erreur',
            message: 'Erreur lors du rejet de l\'utilisateur',
            severity: 'high'
          });
        }
      );
    }
  }

  // NOUVELLE MÉTHODE : Marquer une notification comme lue
  markNotificationAsRead(notification: Notification): void {
    if (notification.status === 'UNREAD') {
      this.notificationService.markAsRead(notification.id).subscribe(
        () => {
          // Mettre à jour localement
          notification.status = 'READ';
          this.loadSystemNotifications();
        },
        error => {
          console.error('Erreur lors du marquage comme lu:', error);
        }
      );
    }
  }

  // NOUVELLE MÉTHODE : Obtenir l'icône pour une notification système
  getSystemNotificationIcon(notification: Notification): string {
    switch (notification.type) {
      case 'NEW_USER':
        return '👤';
      case 'CRITICAL_THRESHOLD_ALERT':
        return '⚠️';
      case 'WEATHER_ALERT':
        return '🌦️';
      case 'AIR_QUALITY_ALERT':
        return '💨';
      case 'ACCOUNT_APPROVED':
        return '✅';
      case 'ACCOUNT_REJECTED':
        return '❌';
      default:
        return '🔔';
    }
  }

  // NOUVELLE MÉTHODE : Obtenir la couleur pour une notification système
  getSystemNotificationColor(notification: Notification): string {
    switch (notification.type) {
      case 'NEW_USER':
        return 'bg-blue-100 border-blue-200';
      case 'CRITICAL_THRESHOLD_ALERT':
        return 'bg-red-100 border-red-200';
      case 'WEATHER_ALERT':
      case 'AIR_QUALITY_ALERT':
        return 'bg-orange-100 border-orange-200';
      case 'ACCOUNT_APPROVED':
        return 'bg-green-100 border-green-200';
      case 'ACCOUNT_REJECTED':
        return 'bg-gray-100 border-gray-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  }

  logout(): void {
    console.log('Déconnexion en cours...');
    this.router.navigate(['/auth/login']);
  }

  toggleNotifications(): void {
    this.showNotificationsPanel = !this.showNotificationsPanel;
    if (!this.showNotificationsPanel) {
      // Ne pas remettre à zéro le compteur ici, le laisser au service
    }
  }

  viewAllNotifications(): void {
    this.router.navigate(['/admin/manage-alerts']);
    this.showNotificationsPanel = false;
  }

  viewAlertDetails(alert: AlertData): void {
    console.log('Viewing alert:', alert);
  }

  private initializeData(): void {
    this.airQualityService.getCurrentAirQuality().subscribe(data => {
      this.updateAirQualityData(data);
    });
  }

  private setupMqttSubscriptions(): void {
    this.dataSubscriptions.push(
      this.mqttService.getAirQualityData().subscribe(data => {
        this.updateAirQualityData(data);
      })
    );

    this.dataSubscriptions.push(
      this.mqttService.getAlerts().subscribe(alert => {
        const severityMap = {
          'info': 'low',
          'warning': 'medium',
          'danger': 'high'
        };
        this.handleNewAlert({
          title: alert.severity.toUpperCase() + ' Alert',
          message: alert.message,
          severity: severityMap[alert.severity] as 'low' | 'medium' | 'high',
          timestamp: alert.timestamp.getTime(),
          aqi: alert.value,
          parameter: alert.parameter
        });
      })
    );

    this.dataSubscriptions.push(
      this.mqttService.getUserNotifications().subscribe(notification => {
        this.handleUserNotification(notification);
      })
    );

    this.dataSubscriptions.push(
      this.mqttService.getConnectionStatus().subscribe(connected => {
        if (!connected) {
          console.warn('MQTT connection lost');
        }
      })
    );
  }

  private handleUserNotification(notification: any): void {
    const userNotification: UserNotification = {
      type: notification.type,
      username: notification.username,
      role: notification.role,
      timestamp: new Date(notification.timestamp),
      message: notification.message
    };

    this.userNotifications.unshift(userNotification);
    if (this.userNotifications.length > 20) {
      this.userNotifications.pop();
    }

    this.showToast({
      title: notification.type === 'USER_CONNECTED' ? 'Nouvelle connexion' : 'Déconnexion',
      message: `${notification.username} (${notification.role}) ${notification.type === 'USER_CONNECTED' ? 's\'est connecté' : 's\'est déconnecté'}`,
      severity: 'medium'
    });
  }

  private updateAirQualityData(data: any): void {
    this.airQualityData = {
      ...this.airQualityData,
      current: data.aqi || 0,
      pm25: data.pm25 || 0,
      pm10: data.pm10 || 0,
      co: data.co || 0,
      no2: data.no2 || 0,
      o3: data.o3 || 0,
      temperature: data.temperature || 0,
      humidity: data.humidity || 0
    };

    this.airQualityData.levels.shift();
    this.airQualityData.levels.push(this.airQualityData.current);
    this.updateAirQualityChart();
  }

  sendCommand(command: string, payload: any = {}): void {
    console.log(`Command sent: ${command}`, payload);
  }

  private handleNewAlert(alert: AlertData): void {
    const newAlert: AlertData = {
      title: alert.title,
      message: alert.message,
      severity: alert.severity || 'medium',
      timestamp: alert.timestamp || Date.now(),
      parameter: alert.parameter
    };
    
    this.recentAlerts.unshift(newAlert);
    if (this.recentAlerts.length > 5) {
      this.recentAlerts.pop();
    }
    
    if (alert.severity === 'high') {
      this.criticalAlerts.unshift(newAlert);
      if (this.criticalAlerts.length > 10) {
        this.criticalAlerts.pop();
      }
    }
    
    if (!this.showNotificationsPanel || this.activeTab !== 'alerts') {
      this.unreadNotifications++;
    }
    
    this.stats.monthlyAlerts++;
    
    if (alert.severity === 'high' && alert.aqi) {
      this.airQualityData.current = alert.aqi;
      this.updateAirQualityChart();
    }

    if (alert.severity === 'high') {
      this.showToast({
        title: 'Alerte Critique',
        message: alert.message,
        severity: 'high'
      });
    }
  }

  private showToast(notification: { title: string, message: string, severity: 'low' | 'medium' | 'high' }): void {
    // Implémentation temporaire - vous pouvez utiliser Angular Material Snackbar ici
    console.log('Toast Notification:', notification);
    
    // Exemple d'implémentation simple avec setTimeout pour affichage temporaire
    const toastElement = document.createElement('div');
    toastElement.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      notification.severity === 'high' ? 'bg-red-500' : 
      notification.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
    } text-white`;
    toastElement.innerHTML = `
      <div class="font-bold">${notification.title}</div>
      <div class="text-sm">${notification.message}</div>
    `;
    
    document.body.appendChild(toastElement);
    
    setTimeout(() => {
      if (document.body.contains(toastElement)) {
        document.body.removeChild(toastElement);
      }
    }, 5000);
  }

  generateReport(): void {
    const doc = new jsPDF();
    const now = new Date();
    
    doc.setFontSize(18);
    doc.text('Rapport de qualité de l\'air', 14, 22);
    doc.setFontSize(12);
    doc.text(`Généré le: ${now.toLocaleDateString()} à ${now.toLocaleTimeString()}`, 14, 30);
    
    doc.setFontSize(14);
    doc.text('Données actuelles de qualité de l\'air', 14, 40);
    
    const airQualityData = [
      ['Indice AQI', this.airQualityData.current],
      ['PM2.5', `${this.airQualityData.pm25} μg/m³`],
      ['PM10', `${this.airQualityData.pm10} μg/m³`],
      ['CO', `${this.airQualityData.co} ppm`],
      ['NO2', `${this.airQualityData.no2} ppb`],
      ['O3', `${this.airQualityData.o3} ppb`],
      ['Température', `${this.airQualityData.temperature}°C`],
      ['Humidité', `${this.airQualityData.humidity}%`]
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [['Paramètre', 'Valeur']],
      body: airQualityData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    const finalY = (doc as any).lastAutoTable?.finalY || 45;
    
    doc.setFontSize(14);
    doc.text('Historique AQI (7 derniers jours)', 14, finalY + 15);
    
    const historyData = this.airQualityData.levels.map((value, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      return [date.toLocaleDateString(), value, this.getAirQualityLabel(value)];
    });
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Date', 'AQI', 'Niveau']],
      body: historyData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] },
      columnStyles: {
        2: { cellWidth: 40 }
      }
    });
    
    const newFinalY = (doc as any).lastAutoTable?.finalY || finalY + 20;
    
    doc.setFontSize(14);
    doc.text('Statistiques système', 14, newFinalY + 15);
    
    const statsData = [
      ['Capteurs en ligne', this.sensorStatus.online],
      ['Capteurs hors ligne', this.sensorStatus.offline],
      ['Capteurs en maintenance', this.sensorStatus.maintenance],
      ['Alertes ce mois', this.stats.monthlyAlerts],
      ['Points de données', this.stats.dataPoints]
    ];
    
    autoTable(doc, {
      startY: newFinalY + 20,
      head: [['Statistique', 'Valeur']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
    
    doc.save(`rapport_qualite_air_${now.getTime()}.pdf`);
  }

  private createMiniCharts(): void {
    this.charts['usersChart'] = this.createPieChart('usersChart', [this.stats.activeSensors, 5], ['#3B82F6', '#EFF6FF']);
    this.charts['sensorsChart'] = this.createPieChart('sensorsChart', [this.sensorStatus.online, this.sensorStatus.offline + this.sensorStatus.maintenance], ['#10B981', '#F59E0B']);
    this.charts['alertsChart'] = this.createPieChart('alertsChart', [this.stats.monthlyAlerts, 5], ['#F59E0B', '#FEF3C7']);
    this.charts['dataChart'] = this.createPieChart('dataChart', [this.stats.dataPoints / 1000 || 1, 5], ['#8B5CF6', '#EDE9FE']);
  }

  private createPieChart(id: string, data: number[], colors: string[]): Chart<'doughnut', number[], string> | null {
    const ctx = document.getElementById(id) as HTMLCanvasElement;
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        cutout: '70%',
        plugins: { legend: { display: false } },
        responsive: true,
        maintainAspectRatio: false
      }
    });
  }

  private createActivityChart(): void {
    const ctx = document.getElementById('activityChart') as HTMLCanvasElement;
    if (!ctx) return;

    this.charts['activityChart'] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
        datasets: [
          {
            label: 'Données reçues (K)',
            data: [12, 19, 15, 24, 18, 16, 22],
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            tension: 0.3,
            fill: true,
            borderWidth: 2
          },
          {
            label: 'Alertes',
            data: [2, 3, 1, 4, 2, 3, 1],
            borderColor: '#F59E0B',
            backgroundColor: 'rgba(245, 158, 11, 0.05)',
            tension: 0.3,
            fill: true,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 20
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            border: { display: false }
          },
          x: {
            grid: { display: false },
            border: { display: false }
          }
        }
      }
    });
  }

  updateAirQualityChart(): void {
    if (!this.airQualityData) return;
    const ctx = document.getElementById('airQualityChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    const data = {
      labels: ['PM2.5', 'PM10', 'NO2', 'O3', 'CO'],
      datasets: [{
        label: "Qualité de l'air",
        data: [
          this.airQualityData.pm25,
          this.airQualityData.pm10,
          this.airQualityData.no2,
          this.airQualityData.o3,
          this.airQualityData.co
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(54, 162, 235, 0.4)',
          'rgba(54, 162, 235, 0.3)',
          'rgba(54, 162, 235, 0.2)'
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(54, 162, 235, 1)'
        ],
        borderWidth: 1
      }]
    };
    
    if (this.charts['airQuality']) {
      this.charts['airQuality'].destroy();
    }
    
    this.charts['airQuality'] = new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
  }
  
  private updateCharts(): void {
    if (this.charts['airQuality']) {
      this.updateAirQualityChart();
    }
    
    this.stats.dataPoints += Math.floor(Math.random() * 100) + 50;
    if (this.charts['dataChart']) {
      this.charts['dataChart']!.data.datasets[0].data = [this.stats.dataPoints / 1000, 5];
      this.charts['dataChart']!.update();
    }
  }

  private getAirQualityLabel(value: number): string {
    if (value < 50) return 'Excellent';
    if (value < 100) return 'Bon';
    if (value < 150) return 'Moyen';
    return 'Mauvais';
  }

  getAirQualityStatus(): { text: string, color: string } {
    const value = this.airQualityData.current;
    if (value < 50) return { text: 'Excellent', color: 'bg-green-500' };
    if (value < 100) return { text: 'Bon', color: 'bg-blue-500' };
    if (value < 150) return { text: 'Moyen', color: 'bg-yellow-500' };
    return { text: 'Mauvais', color: 'bg-red-500' };
  }
  
  private getAirQualityColors(values: number[]): string[] {
    return values.map(value => {
      if (value < 50) return 'rgba(16, 185, 129, 0.7)';
      if (value < 100) return 'rgba(59, 130, 246, 0.7)';
      if (value < 150) return 'rgba(245, 158, 11, 0.7)';
      return 'rgba(239, 68, 68, 0.7)';
    });
  }
  
  private getAirQualityBorderColors(values: number[]): string[] {
    return values.map(value => {
      if (value < 50) return 'rgb(16, 185, 129)';
      if (value < 100) return 'rgb(59, 130, 246)';
      if (value < 150) return 'rgb(245, 158, 11)';
      return 'rgb(239, 68, 68)';
    });
  }

  loadSensorsStats() {
    this.capteurService.getCurrentCapteurs().subscribe((capteurs) => {
      this.sensors = capteurs;
      this.stats.activeSensors = capteurs.filter(s => s.statut === 'actif').length;
      this.sensorStatus.online = capteurs.filter(s => s.statut === 'actif').length;
      this.sensorStatus.offline = capteurs.filter(s => s.statut === 'inactif').length;
      this.sensorStatus.maintenance = capteurs.filter(s => s.statut === 'maintenance').length;
      // Points de données = somme des valeurs non nulles
      this.stats.dataPoints = capteurs.reduce((acc, s) => acc + (s.valeur ? 1 : 0), 0);
    });
  }
}