import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../user.service';
import { AuthService } from '../../auth/auth.service';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  status: string;
  enabled?: boolean;
  created_at?: string;
  registrationDate?: Date;
}

@Component({
  selector: 'app-manage-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './manage-users.component.html'
})
export class ManageUsersComponent implements OnInit {
  users: User[] = [];
  pendingUsers: User[] = [];
  filteredUsers: User[] = [];
  statusFilter: string = 'all';
  searchTerm: string = '';
  searchField: string = 'all'; // 'all', 'username', 'email'
  
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 1;

  userForm: any = {
    id: 0,
    username: '',
    email: '',
    role: 'USER',
    status: 'PENDING'
  };

  isEditing = false;
  isLoading = false;
  error = '';

  constructor(
    private userService: UserService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users.map(user => ({
          ...user,
          enabled: user.status === 'ACTIVE',
          registrationDate: user.created_at ? new Date(user.created_at) : new Date()
        }));
        
        // Log pour débogage
        console.log('Statuts des utilisateurs:', this.users.map(u => ({ id: u.id, username: u.username, status: u.status })));
        
        this.applyFilters();
        this.pendingUsers = this.users.filter(user => user.status === 'PENDING' && user.role === 'USER');
        this.calculateTotalPages();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs:', err);
        this.error = 'Erreur lors du chargement des utilisateurs';
        this.isLoading = false;
      }
    });
  }

  getPendingCount(): number {
    return this.pendingUsers.length;
  }

  applyFilters(): void {
    console.log('Application du filtre statut:', this.statusFilter);
    console.log('Application du terme de recherche:', this.searchTerm);
    
    // Filtrage par statut
    let statusFiltered = [...this.users];
    
    if (this.statusFilter === 'pending') {
      statusFiltered = this.users.filter(user => user.status === 'PENDING');
    } else if (this.statusFilter === 'active') {
      statusFiltered = this.users.filter(user => user.status === 'ACTIVE');
    } else if (this.statusFilter === 'inactive') {
      statusFiltered = this.users.filter(user => 
        user.status === 'REJECTED' || user.status === 'INACTIVE');
    }
    
    // Recherche par username ou email
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      
      if (this.searchField === 'username') {
        this.filteredUsers = statusFiltered.filter(user => 
          user.username.toLowerCase().includes(term));
      } else if (this.searchField === 'email') {
        this.filteredUsers = statusFiltered.filter(user => 
          user.email.toLowerCase().includes(term));
      } else {
        // Recherche dans tous les champs
        this.filteredUsers = statusFiltered.filter(user => 
          user.username.toLowerCase().includes(term) || 
          user.email.toLowerCase().includes(term));
      }
    } else {
      this.filteredUsers = statusFiltered;
    }
    
    console.log('Utilisateurs filtrés:', this.filteredUsers.map(u => ({ id: u.id, username: u.username, status: u.status })));
    
    this.calculateTotalPages();
    this.currentPage = 1;
  }

  resetFilters(): void {
    this.statusFilter = 'all';
    this.searchTerm = '';
    this.searchField = 'all';
    this.applyFilters();
  }

  saveUser(): void {
    if (this.isEditing) {
      this.updateUser();
    } else {
      this.createUser();
    }
  }

  createUser(): void {
    this.isLoading = true;
    this.userService.createUser({
      username: this.userForm.username,
      email: this.userForm.email,
      role: this.userForm.role,
      password: 'tempPassword'
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.cancelEdit();
      },
      error: (err) => {
        console.error('Erreur lors de la création de l\'utilisateur:', err);
        this.error = 'Erreur lors de la création de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  updateUser(): void {
    this.isLoading = true;
    // Assurez-vous d'inclure le statut dans la mise à jour
    this.userService.updateUser(this.userForm.id, {
      username: this.userForm.username,
      email: this.userForm.email,
      role: this.userForm.role,
      status: this.userForm.status  // Inclure le statut ici
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.cancelEdit();
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', err);
        this.error = 'Erreur lors de la mise à jour de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  approveUser(id: number): void {
    this.isLoading = true;
    this.userService.approveUser(id).subscribe({
      next: (updatedUser) => {
        // Utiliser l'utilisateur mis à jour retourné par le backend
        const userIndex = this.users.findIndex(u => u.id === id);
        if (userIndex !== -1) {
          this.users[userIndex].status = updatedUser.status || 'ACTIVE';
          this.users[userIndex].enabled = updatedUser.status === 'ACTIVE';
          this.applyFilters();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors de l\'approbation de l\'utilisateur:', err);
        this.error = 'Erreur lors de l\'approbation de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  rejectUser(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir rejeter cet utilisateur ?')) {
      this.isLoading = true;
      this.userService.rejectUser(id).subscribe({
        next: (updatedUser) => {
          // Utiliser l'utilisateur mis à jour retourné par le backend
          const userIndex = this.users.findIndex(u => u.id === id);
          if (userIndex !== -1) {
            this.users[userIndex].status = updatedUser.status || 'REJECTED';
            this.users[userIndex].enabled = false;
            this.applyFilters();
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du rejet de l\'utilisateur:', err);
          this.error = 'Erreur lors du rejet de l\'utilisateur';
          this.isLoading = false;
        }
      });
    }
  }

  deactivateUser(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir désactiver ce compte ?')) {
      this.isLoading = true;
      // Important: Le backend utilise INACTIVE et non REJECTED pour cette méthode
      this.userService.deactivateUser(id).subscribe({
        next: (updatedUser) => {
          // Utiliser l'utilisateur mis à jour retourné par le backend
          const userIndex = this.users.findIndex(u => u.id === id);
          if (userIndex !== -1) {
            this.users[userIndex].status = updatedUser.status || 'INACTIVE';
            this.users[userIndex].enabled = false;
            this.applyFilters();
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors de la désactivation:', err);
          this.error = 'Erreur lors de la désactivation du compte';
          this.isLoading = false;
        }
      });
    }
  }

  toggleUserStatus(user: User): void {
    if (user.status === 'ACTIVE') {
      this.deactivateUser(user.id);
    } else {
      this.approveUser(user.id);
    }
  }

  editUser(user: User): void {
    this.userForm = { 
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    };
    this.isEditing = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deleteUser(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.isLoading = true;
      this.userService.deleteUser(id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== id);
          this.applyFilters();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors de la suppression de l\'utilisateur:', err);
          this.error = 'Erreur lors de la suppression de l\'utilisateur';
          this.isLoading = false;
        }
      });
    }
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.userForm = {
      id: 0,
      username: '',
      email: '',
      role: 'USER',
      status: 'PENDING'
    };
  }

  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  getPaginatedUsers(): User[] {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    return this.filteredUsers.slice(startIndex, startIndex + this.pageSize);
  }

  getRoleDisplay(role: string): string {
    return role === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  }

  getStatusDisplay(user: User): string {
    // Utiliser console.log pour déboguer le statut réel
    console.log(`Affichage du statut pour ${user.username} - statut actuel: ${user.status}`);
    
    switch(user.status) {
      case 'ACTIVE': return 'Actif';
      case 'PENDING': return 'En attente';
      case 'REJECTED': return 'Désactivé';
      case 'INACTIVE': return 'Désactivé';
      default: return user.status || 'Inconnu';
    }
  }

  getStatusClass(user: User): string {
    switch(user.status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-amber-100 text-amber-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}