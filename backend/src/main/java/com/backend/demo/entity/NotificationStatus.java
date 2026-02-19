// src/main/java/com/backend/demo/entity/NotificationStatus.java
package com.backend.demo.entity;

public enum NotificationStatus {
    UNREAD("Non lue"),
    READ("Lue"),
    ARCHIVED("Archivée"),
    DELETED("Supprimée");
    
    private final String displayName;
    
    NotificationStatus(String displayName) {
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