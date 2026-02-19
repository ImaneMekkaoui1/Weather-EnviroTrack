import { Component, OnInit } from '@angular/core';
import { AlertService, Alert, AlertThreshold } from '../../shared/services/alert.service';
import { AuthService } from '../../auth/auth.service';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-manage-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styleUrls: ['./manage-alerts.component.css'],
  templateUrl: './manage-alerts.component.html'
})
export class ManageAlertsComponent implements OnInit {
  alerts: Alert[] = [];
  filteredAlerts: Alert[] = [];
  thresholds: AlertThreshold[] = [];
  
  alertTypeFilter: 'all' | 'air' | 'weather' = 'all';
  severityFilter: 'all' | 'danger' | 'warning' | 'info' = 'all';
  searchText: string = '';
  
  isLoading: boolean = false;
  loadingThresholds: boolean = true;
  isAdmin: boolean = false;
  isRecalculating: boolean = false;

  constructor(
    private alertService: AlertService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    
    if (!this.isAdmin) {
      this.router.navigate(['/access-denied']);
      return;
    }
    
    this.loadData();
  }

  loadData(): void {
    this.isLoading = true;
    this.loadingThresholds = true;
    
    this.alertService.getThresholds().subscribe({
      next: (thresholds: AlertThreshold[]) => {
        this.thresholds = thresholds;
        this.loadingThresholds = false;
        this.checkLoadingComplete();
      },
      error: (err) => {
        console.error('Failed to load thresholds', err);
        this.loadingThresholds = false;
        this.checkLoadingComplete();
      }
    });
    
    this.loadAlerts();
  }

  private loadAlerts(): void {
    this.alertService.getAlerts().subscribe({
      next: (alerts: Alert[]) => {
        this.alerts = alerts.map(a => ({
          ...a,
          timestamp: new Date(a.timestamp)
        }));
        this.applyFilters();
        this.checkLoadingComplete();
      },
      error: (err) => {
        console.error('Failed to load alerts', err);
        this.checkLoadingComplete();
      }
    });
  }

  private checkLoadingComplete(): void {
    if (!this.loadingThresholds) {
      this.isLoading = false;
    }
  }

  updateThreshold(threshold: AlertThreshold): void {
    if (!this.isAdmin) {
      alert('Accès refusé: Vous devez être administrateur pour effectuer cette action.');
      return;
    }
    
    this.isLoading = true;
    
    this.alertService.updateThreshold(threshold).subscribe({
      next: (updatedThreshold) => {
        const index = this.thresholds.findIndex(t => t.id === updatedThreshold.id);
        if (index !== -1) {
          this.thresholds[index] = updatedThreshold;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to update threshold', err);
        this.isLoading = false;
        alert('Échec de la mise à jour du seuil. Veuillez réessayer.');
      }
    });
  }

  recalculateAlerts(): void {
    if (!this.isAdmin) {
      alert('Accès refusé: Vous devez être administrateur pour effectuer cette action.');
      return;
    }

    if (confirm('Voulez-vous vraiment recalculer toutes les alertes basées sur les seuils actuels ?')) {
      this.isRecalculating = true;
      
      this.alertService.recalculateAlerts().subscribe({
        next: () => {
          this.isRecalculating = false;
          this.loadAlerts();
          alert('Recalcul des alertes terminé avec succès');
        },
        error: (err) => {
          console.error('Failed to recalculate alerts', err);
          this.isRecalculating = false;
          alert('Échec du recalcul des alertes. Veuillez réessayer.');
        }
      });
    }
  }

  deleteAlert(alertId: number): void {
    if (!this.isAdmin) {
      alert('Accès refusé: Vous devez être administrateur pour effectuer cette action.');
      return;
    }
    
    if (confirm('Supprimer cette alerte ?')) {
      this.alertService.deleteAlert(alertId).subscribe({
        next: () => {
          this.alerts = this.alerts.filter(a => a.id !== alertId);
          this.applyFilters();
        },
        error: (err) => console.error('Failed to delete alert', err)
      });
    }
  }

  clearAllAlerts(): void {
    if (!this.isAdmin) {
      alert('Accès refusé: Vous devez être administrateur pour effectuer cette action.');
      return;
    }
    
    if (confirm('Supprimer TOUTES les alertes ?')) {
      this.isLoading = true;
      this.alertService.clearAllAlerts().subscribe({
        next: () => {
          this.alerts = [];
          this.filteredAlerts = [];
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Failed to clear alerts', err);
          this.isLoading = false;
        }
      });
    }
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

  exportData(format: 'csv' | 'json' | 'pdf'): void {
    if (this.filteredAlerts.length === 0) return;

    const dataToExport = this.filteredAlerts.map(a => ({
      Message: a.message,
      Type: a.type,
      Gravité: a.severity,
      Valeur: a.value ?? 'N/A',
      Date: a.timestamp.toISOString()
    }));

    switch (format) {
      case 'csv':
        this.exportToCSV(dataToExport);
        break;
      case 'json':
        this.exportToJSON(dataToExport);
        break;
      case 'pdf':
        this.exportToPDF(dataToExport);
        break;
    }
  }

  private exportToCSV(data: any[]): void {
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(field => 
          JSON.stringify(row[field] ?? '', (_, value) => value === null ? '' : value)
        ).join(',')
      )
    ];
    
    const csv = csvRows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `alertes_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  private exportToJSON(data: any[]): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, `alertes_${new Date().toISOString().slice(0, 10)}.json`);
  }

  private exportToPDF(data: any[]): void {
    const doc = new jsPDF();
    const title = "Historique des Alertes";
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${date}`, 14, 30);
    
    autoTable(doc, {
      head: [['Message', 'Type', 'Gravité', 'Valeur', 'Date']],
      body: data.map(a => [a.Message, a.Type, a.Gravité, a.Valeur, a.Date]),
      startY: 35,
      styles: { fontSize: 9 }
    });
    
    doc.save(`alertes_${new Date().toISOString().slice(0, 10)}.pdf`);
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