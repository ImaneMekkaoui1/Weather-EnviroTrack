package com.backend.demo.dto;

import com.backend.demo.entity.NotificationType;
import java.time.LocalDateTime;

public class NotificationWebSocketDTO {
    private Long id;
    private String title;
    private String message;
    private NotificationType type;
    private LocalDateTime createdAt;
    private boolean read;
    
    // Constructeurs
    public NotificationWebSocketDTO() {}
    
    public NotificationWebSocketDTO(Long id, String title, String message, 
                                   NotificationType type, LocalDateTime createdAt, boolean read) {
        this.id = id;
        this.title = title;
        this.message = message;
        this.type = type;
        this.createdAt = createdAt;
        this.read = read;
    }
    
    // Getters et Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    
    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public boolean isRead() { return read; }
    public void setRead(boolean read) { this.read = read; }
}
