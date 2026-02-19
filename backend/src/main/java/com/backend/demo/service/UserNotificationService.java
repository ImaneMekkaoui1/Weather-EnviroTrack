package com.backend.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * Service pour gérer les notifications liées aux utilisateurs
 * (connexions, déconnexions, etc.)
 */
@Service
public class UserNotificationService {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Envoie une notification quand un utilisateur se connecte
     * @param username Nom d'utilisateur
     * @param role Rôle de l'utilisateur
     */
    public void notifyUserConnected(String username, String role) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "USER_CONNECTED");
        notification.put("username", username);
        notification.put("role", role);
        notification.put("timestamp", new Date());
        
        // Envoyer à un topic spécifique pour les administrateurs
        messagingTemplate.convertAndSend("/topic/admin/notifications", notification);
    }
    
    /**
     * Envoie une notification quand un utilisateur se déconnecte
     * @param username Nom d'utilisateur
     */
    public void notifyUserDisconnected(String username) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "USER_DISCONNECTED");
        notification.put("username", username);
        notification.put("timestamp", new Date());
        
        // Envoyer à un topic spécifique pour les administrateurs
        messagingTemplate.convertAndSend("/topic/admin/notifications", notification);
    }
}