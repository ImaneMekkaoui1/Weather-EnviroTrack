import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { adminRoutes } from '../admin/admin-routing.module'; // Changement ici

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(adminRoutes) // Modification ici
  ]
})
export class AdminModule { }