package com.backend.demo.controller;

import com.backend.demo.entity.User;
import com.backend.demo.entity.Notification;
import com.backend.demo.security.UserPrincipal;
import com.backend.demo.service.NotificationService;
import com.backend.demo.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.List;

@Controller
public class NotificationWebSocketController {
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private UserService userService;
    
    /**
     * Gérer les connexions WebSocket pour les notifications
     */
    @MessageMapping("/notifications.connect")
    public void handleWebSocketConnect(Principal principal) {
        if (principal != null) {
            User user = userService.findByEmail(principal.getName());
            
            // Send unread count
            long unreadCount = notificationService.getUnreadNotificationCount(user);
            messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/notifications/count",
                unreadCount
            );
            
            // Send recent notifications
            List<Notification> recentNotifications = notificationService.getUserNotifications(user.getId());
            messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/notifications/recent",
                recentNotifications
            );
        }
    }
    
    /**
     * Marquer une notification comme lue via WebSocket
     */
    @MessageMapping("/notifications.markAsRead")
    public void markAsRead(@Payload Long notificationId, Principal principal) {
        if (principal != null) {
            User user = userService.findByEmail(principal.getName());
            notificationService.markAsRead(notificationId, user);
        }
    }
}