import { Component, OnInit } from '@angular/core';
import { NotificationService, Notification } from './shared/services/notification.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-notification',
    template: `
        <div class="notification-container">
            <mat-card *ngFor="let notification of notifications" 
                     [ngClass]="{'unread': !notification.read}"
                     (click)="handleNotificationClick(notification)">
                <mat-card-header>
                    <mat-card-title>
                        <mat-icon [ngClass]="getNotificationIconClass(notification)">
                            {{getNotificationIcon(notification)}}
                        </mat-icon>
                        {{getNotificationTitle(notification)}}
                    </mat-card-title>
                    <mat-card-subtitle>
                        {{notification.createdAt | date:'medium'}}
                    </mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                    <p>{{notification.message}}</p>
                    <div *ngIf="notification.threshold" class="threshold-info">
                        <p class="threshold-value">
                            Valeur actuelle: {{notification.threshold.value}}
                            <span class="threshold-limit">(Limite: {{notification.threshold.limit}})</span>
                        </p>
                    </div>
                </mat-card-content>
                <mat-card-actions *ngIf="notification.type === 'NEW_USER'">
                    <button mat-button color="primary" (click)="approveUser(notification)">
                        APPROUVER
                    </button>
                    <button mat-button color="warn" (click)="rejectUser(notification)">
                        REJETER
                    </button>
                </mat-card-actions>
            </mat-card>
        </div>
    `,
    styles: [`
        .notification-container {
            max-width: 600px;
            margin: 0 auto;
            padding: 16px;
        }
        mat-card {
            margin-bottom: 16px;
            cursor: pointer;
        }
        .unread {
            border-left: 4px solid #1976d2;
            background-color: #f5f5f5;
        }
        mat-icon {
            margin-right: 8px;
        }
        .warning {
            color: #f44336;
        }
        .info {
            color: #1976d2;
        }
        .success {
            color: #4caf50;
        }
        .threshold-info {
            margin-top: 8px;
            padding: 8px;
            background-color: #fff3e0;
            border-radius: 4px;
        }
        .threshold-value {
            font-weight: 500;
            color: #f44336;
        }
        .threshold-limit {
            color: #666;
            font-size: 0.9em;
            margin-left: 8px;
        }
    `],
    standalone: true,
    imports: [
        CommonModule,
        MatCardModule,
        MatIconModule,
        MatButtonModule,
        DatePipe
    ]
})
export class NotificationComponent implements OnInit {
    notifications: Notification[] = [];

    constructor(
        private notificationService: NotificationService,
        private snackBar: MatSnackBar
    ) {}

    ngOnInit() {
        this.notificationService.notifications$.subscribe(
            (notifications: Notification[]) => this.notifications = notifications
        );
        this.notificationService.loadNotifications();
    }

    getNotificationIcon(notification: Notification): string {
        switch (notification.type) {
            case 'NEW_USER':
                return 'person_add';
            case 'CRITICAL_THRESHOLD_ALERT':
            case 'WEATHER_ALERT':
            case 'AIR_QUALITY_ALERT':
                return 'warning';
            case 'ACCOUNT_APPROVED':
                return 'check_circle';
            case 'ACCOUNT_REJECTED':
                return 'cancel';
            default:
                return 'notifications';
        }
    }

    getNotificationIconClass(notification: Notification): string {
        switch (notification.type) {
            case 'CRITICAL_THRESHOLD_ALERT':
            case 'WEATHER_ALERT':
            case 'AIR_QUALITY_ALERT':
                return 'warning';
            case 'NEW_USER':
            case 'ACCOUNT_VALIDATION':
                return 'info';
            case 'ACCOUNT_APPROVED':
                return 'success';
            case 'ACCOUNT_REJECTED':
                return 'warning';
            default:
                return 'info';
        }
    }

    getNotificationTitle(notification: Notification): string {
        switch (notification.type) {
            case 'NEW_USER':
                return 'Nouveau compte utilisateur';
            case 'CRITICAL_THRESHOLD_ALERT':
                return 'Alerte de seuil critique';
            case 'WEATHER_ALERT':
                return 'Alerte météo';
            case 'AIR_QUALITY_ALERT':
                return 'Alerte qualité de l\'air';
            case 'ACCOUNT_VALIDATION':
                return 'Validation de compte';
            case 'ACCOUNT_APPROVED':
                return 'Compte approuvé';
            case 'ACCOUNT_REJECTED':
                return 'Compte rejeté';
            default:
                return 'Notification';
        }
    }

    handleNotificationClick(notification: Notification) {
        if (!notification.read) {
            this.notificationService.markAsRead(notification.id);
        }
    }

    approveUser(notification: Notification) {
        if (notification.user?.id) {
            this.notificationService.approveUserRegistration(notification.user.id).subscribe(
                () => {
                    this.snackBar.open('Utilisateur approuvé avec succès', 'Fermer', {
                        duration: 3000
                    });
                    this.notificationService.loadNotifications();
                },
                (error: Error) => {
                    this.snackBar.open('Erreur lors de l\'approbation', 'Fermer', {
                        duration: 3000
                    });
                }
            );
        }
    }

    rejectUser(notification: Notification) {
        if (notification.user?.id) {
            this.notificationService.rejectUserRegistration(notification.user.id).subscribe(
                () => {
                    this.snackBar.open('Utilisateur rejeté', 'Fermer', {
                        duration: 3000
                    });
                    this.notificationService.loadNotifications();
                },
                (error: Error) => {
                    this.snackBar.open('Erreur lors du rejet', 'Fermer', {
                        duration: 3000
                    });
                }
            );
        }
    }
} 