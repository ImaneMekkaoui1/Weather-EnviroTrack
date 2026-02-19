// login-logs.component.ts - Corrections
import { Component, OnInit, TrackByFunction } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoginLogService, LoginLog, LoginLogPage, LoginLogFilters, LoginStats } from '../../shared/services/login-log.service';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-login-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login-logs.component.html',
  styleUrls: ['./login-logs.component.css']
})
export class LoginLogsComponent implements OnInit {
  
  logs: LoginLog[] = [];
  statistics: LoginStats = {
    totalLogins: 0,
    successfulLogins: 0,
    failedLogins: 0,
    uniqueUsersToday: 0,
    suspiciousIps: []
  };
  
  loading = true;
  currentPage = 0;
  totalPages = 0;
  totalElements = 0;
  pageSize = 10;
  
  // Filtres
  usernameFilter = '';
  statusFilter: 'SUCCESS' | 'FAILURE' | '' = '';
  startDateFilter = '';
  endDateFilter = '';
  ipAddressFilter = '';
  
  trackByLogId: TrackByFunction<LoginLog> = (index: number, item: LoginLog) => item.id;
  Math = Math;

  constructor(private loginLogService: LoginLogService) { }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.loadLogs();
    this.loadStatistics();
  }

  loadLogs(): void {
    this.loading = true;
    
    const filters: LoginLogFilters = {};
    
    if (this.usernameFilter.trim()) {
      filters.username = this.usernameFilter.trim();
    }
    if (this.statusFilter) {
      filters.status = this.statusFilter as 'SUCCESS' | 'FAILURE' | '';
    }
    if (this.startDateFilter) {
      filters.startDate = this.startDateFilter;
    }
    if (this.endDateFilter) {
      filters.endDate = this.endDateFilter;
    }
    if (this.ipAddressFilter.trim()) {
      filters.ipAddress = this.ipAddressFilter.trim();
    }

    // CORRECTION: Utiliser getLogs() quand aucun filtre n'est appliqué
    const hasFilters = Object.keys(filters).length > 0;
    
    const request = hasFilters 
      ? this.loginLogService.getLogsWithFilters(filters, this.currentPage, this.pageSize)
      : this.loginLogService.getLogs(this.currentPage, this.pageSize);

    request.subscribe({
      next: (response: LoginLogPage) => {
        this.logs = response.content;
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.currentPage = response.number;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading logs:', error);
        this.loading = false;
        // Réinitialiser les données en cas d'erreur
        this.logs = [];
        this.totalPages = 0;
        this.totalElements = 0;
      }
    });
  }

  loadStatistics(): void {
    this.loginLogService.getStats().subscribe({
      next: (stats: LoginStats) => {
        this.statistics = stats;
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  applyFilters(): void {
    this.currentPage = 0; // Remettre à la première page
    this.loadLogs();
  }

  clearFilters(): void {
    this.usernameFilter = '';
    this.statusFilter = '';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.ipAddressFilter = '';
    this.currentPage = 0;
    this.loadLogs();
  }

  clearFilter(filterName: string): void {
    switch(filterName) {
      case 'username':
        this.usernameFilter = '';
        break;
      case 'status':
        this.statusFilter = '';
        break;
      case 'startDate':
        this.startDateFilter = '';
        break;
      case 'endDate':
        this.endDateFilter = '';
        break;
      case 'ipAddress':
        this.ipAddressFilter = '';
        break;
    }
    this.currentPage = 0;
    this.loadLogs();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadLogs();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadLogs();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadLogs();
    }
  }

  refresh(): void {
    this.loadLogs();
    // CORRECTION: Recharger les statistiques aussi pour avoir des données à jour
    this.loadStatistics();
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  maskIpAddress(ip: string): string {
    if (!ip) return 'N/A';
    
    const ipv4Regex = /^(\d{1,3}\.)(\d{1,3}\.)\d{1,3}\.\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      return ip.replace(ipv4Regex, '$1$2xxx.xxx');
    }
    
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){2}[0-9a-fA-F:]+$/;
    if (ipv6Regex.test(ip)) {
      const parts = ip.split(':');
      if (parts.length > 4) {
        return `${parts[0]}:${parts[1]}:xxx:xxx`;
      }
    }
    
    return ip;
  }

  getStatusClass(status: string): string {
    return status === 'SUCCESS' ? 'badge-success' : 'badge-danger';
  }

  getStatusText(status: string): string {
    return status === 'SUCCESS' ? 'Succès' : 'Échec';
  }

  exportLogs(): void {
    const filters: LoginLogFilters = {};
    
    if (this.usernameFilter.trim()) filters.username = this.usernameFilter.trim();
    if (this.statusFilter) filters.status = this.statusFilter as 'SUCCESS' | 'FAILURE' | '';
    if (this.startDateFilter) filters.startDate = this.startDateFilter;
    if (this.endDateFilter) filters.endDate = this.endDateFilter;
    if (this.ipAddressFilter.trim()) filters.ipAddress = this.ipAddressFilter.trim();

    this.loginLogService.exportToCsv(filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `login-logs-${new Date().toISOString().split('T')[0]}.csv`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
        
        console.log('Export réussi');
      },
      error: (error) => {
        console.error('Erreur lors de l\'export:', error);
        alert('Erreur lors de l\'export des données. Veuillez réessayer.');
      }
    });
  }

  // CORRECTION: Simplification de la pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    
    if (totalPages <= 7) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(0);
      
      if (currentPage > 3) {
        pages.push(-1);
      }
      
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages - 2, currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        if (i !== 0 && i !== totalPages - 1) {
          pages.push(i);
        }
      }
      
      if (currentPage < totalPages - 4) {
        pages.push(-1);
      }
      
      if (totalPages > 1) {
        pages.push(totalPages - 1);
      }
    }
    
    return pages;
  }

  checkSuspiciousIp(ipAddress: string): void {
    this.loginLogService.checkIpSuspicious(ipAddress).subscribe({
      next: (result) => {
        if (result.suspicious) {
          alert(`Cette IP est suspecte avec ${result.attemptCount} tentatives!`);
        } else {
          alert('Cette IP semble normale.');
        }
      },
      error: (error) => {
        console.error('Error checking IP:', error);
      }
    });
  }

  cleanOldLogs(daysToKeep: number = 30): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer les logs de plus de ${daysToKeep} jours ?`)) {
      this.loginLogService.cleanOldLogs(daysToKeep).subscribe({
        next: (result) => {
          alert(`${result.deletedCount} logs ont été supprimés.`);
          this.refresh();
        },
        error: (error) => {
          console.error('Error cleaning logs:', error);
        }
      });
    }
  }

  exportLogsPdf(): void {
    if (!this.logs || this.logs.length === 0) {
      alert('Aucun log à exporter.');
      return;
    }
    
    const doc = new jsPDF();
    const title = 'Historique des Connexions';
    const date = new Date().toLocaleDateString();
    
    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Généré le: ${date}`, 14, 30);
    
    autoTable(doc, {
      head: [['Utilisateur', 'Adresse IP', 'Date/Heure', 'Statut', 'Navigateur']],
      body: this.logs.map(log => [
        log.username,
        log.ipAddress,
        this.formatDate(log.loginTime),
        this.getStatusText(log.status),
        log.userAgent || 'Non spécifié'
      ]),
      startY: 35,
      styles: { fontSize: 9 }
    });
    
    doc.save(`login-logs_${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  // CORRECTION: Amélioration de la fonction de suppression
  deleteLog(id: number): void {
    if (confirm('Voulez-vous vraiment supprimer ce log ?')) {
      this.loginLogService.deleteLog(id).subscribe({
        next: (response) => {
          if (response.success) {
            // Supprimer le log de la liste locale
            this.logs = this.logs.filter(log => log.id !== id);
            
            // Mettre à jour le compteur total
            this.totalElements--;
            
            // Si la page courante devient vide après suppression, revenir à la page précédente
            if (this.logs.length === 0 && this.currentPage > 0) {
              this.currentPage--;
            }
            
            // Recharger les données pour s'assurer que tout est synchronisé
            this.loadLogs();
            
            alert('Log supprimé avec succès.');
          } else {
            alert('Suppression échouée : ' + (response.message || 'Erreur inconnue'));
          }
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          alert('Erreur lors de la suppression du log.');
        }
      });
    }
  }

  // CORRECTION: Fonction de debug améliorée
  logSuppression(id: number): void {
    console.log('=== DEBUG SUPPRESSION ===');
    console.log('ID demandé pour suppression:', id);
    console.log('Type de l\'ID:', typeof id);
    console.log('ID est valide:', id && id > 0);
    console.log('========================');
  }
}