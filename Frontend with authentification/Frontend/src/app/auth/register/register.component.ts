import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
})
export class RegisterComponent {
  user = {
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  };
  showPassword = false;
  showConfirmPassword = false;
  acceptedTerms = false;
  isLoading = false;
  error = '';
  passwordStrength = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  togglePasswordVisibility(field: 'password' | 'confirmPassword'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  checkPasswordStrength(): void {
    if (this.user.password.length === 0) {
      this.passwordStrength = '';
      return;
    }
    
    if (this.user.password.length < 5) {
      this.passwordStrength = 'Faible';
      return;
    }

    const hasUpperCase = /[A-Z]/.test(this.user.password);
    const hasLowerCase = /[a-z]/.test(this.user.password);
    const hasNumbers = /\d/.test(this.user.password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(this.user.password);

    if (hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChars) {
      this.passwordStrength = 'Fort';
    } else if ((hasUpperCase && hasLowerCase) || hasNumbers) {
      this.passwordStrength = 'Moyen';
    } else {
      this.passwordStrength = 'Faible';
    }
  }

  register(form: NgForm): void {
    if (!this.validateForm(form)) return;

    this.isLoading = true;
    this.error = '';
    this.successMessage = '';

    this.authService.register({
      username: this.user.username,
      email: this.user.email,
      password: this.user.password
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.successMessage = 'Inscription réussie ! Votre compte est en attente de validation par un administrateur.';
        form.resetForm();
      },
      error: (err) => {
        this.isLoading = false;
        this.error = err.message || 'Erreur lors de l\'inscription';
      }
    });
  }

  private validateForm(form: NgForm): boolean {
    if (form.invalid) {
      this.error = 'Veuillez remplir tous les champs obligatoires';
      return false;
    }
    if (this.user.password !== this.user.confirmPassword) {
      this.error = 'Les mots de passe ne correspondent pas';
      return false;
    }
    if (!this.acceptedTerms) {
      this.error = 'Vous devez accepter les conditions d\'utilisation';
      return false;
    }
    return true;
  }
}