import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [AuthService],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent {
  newPassword = '';
  confirmPassword = '';
  token = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;
  
  // Variables pour gérer la visibilité des mots de passe
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Token de réinitialisation manquant';
    }
  }

  togglePasswordVisibility(field: string): void {
    if (field === 'newPassword') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirmPassword') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  onSubmit(): void {
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return;
    }

    if (this.newPassword.length < 8) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 8 caractères';
      return;
    }

    if (!this.token) {
      this.errorMessage = 'Token de réinitialisation invalide';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.resetPassword(this.token, this.newPassword).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Mot de passe réinitialisé avec succès';
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        if (error.status === 400) {
          this.errorMessage = 'Token invalide ou expiré';
        } else if (error.error && error.error.error) {
          this.errorMessage = error.error.error;
        } else {
          this.errorMessage = 'Une erreur est survenue lors de la réinitialisation';
        }
        console.error('Password reset error:', error);
      }
    });
  }
}