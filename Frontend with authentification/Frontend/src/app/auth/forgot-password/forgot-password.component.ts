import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  email = '';
  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  navigateToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  onSubmit(): void {
    if (!this.email) {
      this.errorMessage = 'Veuillez entrer votre adresse email';
      return;
    }

    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMessage = 'Veuillez entrer une adresse email valide';
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Un email de réinitialisation a été envoyé à ' + this.email;
      },
      error: (err: Error) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Une erreur est survenue lors de l\'envoi de l\'email';
        console.error('Erreur détaillée:', err);
      }
    });
}
}