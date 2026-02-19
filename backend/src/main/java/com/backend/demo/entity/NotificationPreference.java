// src/main/java/com/backend/demo/entity/NotificationPreference.java
package com.backend.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "notification_preferences")
public class NotificationPreference {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
    
    @Column(name = "email_notifications", nullable = false)
    private boolean emailNotifications = true;
    
    @Column(name = "web_notifications", nullable = false)
    private boolean webNotifications = true;
    
    @Column(name = "weather_alerts", nullable = false)
    private boolean weatherAlerts = true;
    
    @Column(name = "air_quality_alerts", nullable = false)
    private boolean airQualityAlerts = true;
    
    @Column(name = "account_notifications", nullable = false)
    private boolean accountNotifications = true;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    
    // Constructeurs
    public NotificationPreference() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public NotificationPreference(User user) {
        this();
        this.user = user;
    }
    
    // Getters et Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    
    public boolean isEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(boolean emailNotifications) { 
        this.emailNotifications = emailNotifications;
        this.updatedAt = LocalDateTime.now();
    }
    
    public boolean isWebNotifications() { return webNotifications; }
    public void setWebNotifications(boolean webNotifications) { 
        this.webNotifications = webNotifications;
        this.updatedAt = LocalDateTime.now();
    }
    
    public boolean isWeatherAlerts() { return weatherAlerts; }
    public void setWeatherAlerts(boolean weatherAlerts) { 
        this.weatherAlerts = weatherAlerts;
        this.updatedAt = LocalDateTime.now();
    }
    
    public boolean isAirQualityAlerts() { return airQualityAlerts; }
    public void setAirQualityAlerts(boolean airQualityAlerts) { 
        this.airQualityAlerts = airQualityAlerts;
        this.updatedAt = LocalDateTime.now();
    }
    
    public boolean isAccountNotifications() { return accountNotifications; }
    public void setAccountNotifications(boolean accountNotifications) { 
        this.accountNotifications = accountNotifications;
        this.updatedAt = LocalDateTime.now();
    }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}