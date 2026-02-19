package com.backend.demo.entity;

public enum AccountStatus {
    PENDING,    // En attente de validation par un admin
    ACTIVE,     // Compte validé et actif
     // Compte inactif
    REJECTED, 
    SUSPENDED,
    INACTIVE
}