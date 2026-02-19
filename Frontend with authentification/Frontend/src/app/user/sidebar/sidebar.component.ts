import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  // Propriété pour le compteur d'alertes non lues
  unreadAlertsCount: number = 0; // Initialisez avec la valeur réelle ou laissez à 0
  
  // Propriété pour le nom d'utilisateur
  userName: string = 'Utilisateur'; // Initialisez avec le nom réel ou laissez la valeur par défaut

  // Si vous avez besoin de charger ces données, vous pouvez le faire dans ngOnInit
  constructor() {
    // Ici vous pourriez appeler un service pour obtenir:
    // - Le nombre d'alertes non lues
    // - Le nom de l'utilisateur connecté
  }
}