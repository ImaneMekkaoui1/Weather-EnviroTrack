import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthRoutingModule } from './auth-routing.module';

// IMPORTER les composants standalone au lieu de les déclarer
import { LoginComponent } from './login/login.component';
import { RegisterComponent } from './register/register.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    AuthRoutingModule,
    LoginComponent,      // <-- Importation directe
    RegisterComponent    // <-- Importation directe
  ]
})
export class AuthModule { }
