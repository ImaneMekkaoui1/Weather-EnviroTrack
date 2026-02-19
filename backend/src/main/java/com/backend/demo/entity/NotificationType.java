// src/main/java/com/backend/demo/entity/NotificationType.java
package com.backend.demo.entity;

public enum NotificationType {
    // Notifications de compte
    ACCOUNT_VALIDATION("Validation de compte"),
    ACCOUNT_APPROVED("Compte approuvé"),
    ACCOUNT_REJECTED("Compte rejeté"),
    ACCOUNT_SUSPENDED("Compte suspendu"),
    
    // Alertes météo et environnementales
    WEATHER_ALERT("Alerte météo"),
    AIR_QUALITY_ALERT("Alerte qualité d'air"),
    
    // Alertes système
    SYSTEM_ALERT("Alerte système"),
    MAINTENANCE_ALERT("Alerte maintenance"),
    
    // Notifications générales
    GENERAL_NOTIFICATION("Notification générale"),
    INFO_NOTIFICATION("Information"),
    
    // Notifications de sécurité
    SECURITY_ALERT("Alerte sécurité"),
    LOGIN_ALERT("Alerte connexion"),
    
    // Nouveaux types de notification
    NEW_USER("Nouvel utilisateur"),
    CRITICAL_THRESHOLD_ALERT("Alerte seuil critique");
    
    private final String displayName;
    
    NotificationType(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    @Override
    public String toString() {
        return displayName;
    }
}