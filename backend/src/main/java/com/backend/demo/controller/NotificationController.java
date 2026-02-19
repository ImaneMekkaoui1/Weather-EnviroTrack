// src/main/java/com/backend/demo/controller/NotificationController.java
package com.backend.demo.controller;

import com.backend.demo.entity.Notification;
import com.backend.demo.entity.NotificationType;
import com.backend.demo.entity.User;
import com.backend.demo.service.NotificationService;
import com.backend.demo.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<Page<Notification>> getUserNotifications(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        User user = userService.getUserFromAuthentication(authentication);
        return ResponseEntity.ok(notificationService.getUserNotifications(user, page, size));
    }

    @GetMapping("/unread/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        User user = userService.getUserFromAuthentication(authentication);
        long count = notificationService.getUnreadNotificationCount(user);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(@PathVariable Long id, Authentication authentication) {
        User user = userService.getUserFromAuthentication(authentication);
        notificationService.markAsRead(id, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(Authentication authentication) {
        User user = userService.getUserFromAuthentication(authentication);
        notificationService.markAllAsRead(user);
        return ResponseEntity.ok().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/all")
    public ResponseEntity<Page<Notification>> getAllNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(notificationService.getAllNotifications(PageRequest.of(page, size)));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/send")
    public ResponseEntity<Notification> sendNotification(
            @RequestParam Long userId,
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam NotificationType type) {
        User user = userService.findById(userId);
        Notification notification = notificationService.createNotification(user, title, message, type);
        return ResponseEntity.ok(notification);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/admin/broadcast")
    public ResponseEntity<Void> broadcastNotification(
            @RequestParam String title,
            @RequestParam String message,
            @RequestParam NotificationType type) {
        Notification notification = new Notification();
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notificationService.sendNotificationToAll(notification);
        return ResponseEntity.ok().build();
    }
}