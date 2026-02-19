// src/main/java/com/backend/demo/service/NotificationService.java
package com.backend.demo.service;

import com.backend.demo.dto.NotificationWebSocketDTO;
import com.backend.demo.entity.*;
import com.backend.demo.repository.NotificationRepository;
import com.backend.demo.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class NotificationService {
    
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private NotificationPreferenceService preferenceService;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    /**
     * Créer et envoyer une notification
     */
    @Transactional
    public Notification createNotification(User user, String title, String message, NotificationType type) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setStatus(NotificationStatus.UNREAD);
        notification.setCreatedAt(LocalDateTime.now());
        
        notification = notificationRepository.save(notification);
        
        // Send notification via WebSocket
        sendNotificationToUser(user, notification);
        
        // Envoyer email si les préférences le permettent
        sendEmailNotificationIfEnabled(notification);
        
        logger.info("Notification créée pour l'utilisateur {} (ID: {})", user.getEmail(), notification.getId());
        
        return notification;
    }
    
    /**
     * Notifier les admins qu'un nouveau compte doit être validé
     */
    @Transactional
    public void notifyAdminsNewAccountValidation(User newUser) {
        List<User> admins = userRepository.findAll().stream()
                .filter(user -> user.getRole() == Role.ADMIN && 
                               user.getStatus() == AccountStatus.ACTIVE)
                .toList();
        
        String title = "Nouveau compte à valider";
        String message = String.format("L'utilisateur %s (%s) a créé un compte et attend votre validation.", 
                                     newUser.getUsername(), newUser.getEmail());
        
        for (User admin : admins) {
            Notification notif = createNotification(admin, title, message, NotificationType.ACCOUNT_VALIDATION);
            notif.setReferenceId(newUser.getId());
            notif.setReferenceType("USER");
            notificationRepository.save(notif);
        }
        
        logger.info("Notifications envoyées aux {} admins pour validation du compte de {}", 
                   admins.size(), newUser.getEmail());
    }
    
    /**
     * Notifier un utilisateur que son compte a été approuvé
     */
    @Transactional
    public void notifyUserAccountApproved(User user) {
        String title = "Compte approuvé";
        String message = "Félicitations ! Votre compte a été approuvé par l'administrateur. " +
                        "Vous pouvez maintenant accéder à toutes les fonctionnalités de l'application.";
        
        createNotification(user, title, message, NotificationType.ACCOUNT_APPROVED);
        
        logger.info("Notification d'approbation envoyée à {}", user.getEmail());
    }
    
    /**
     * Notifier un utilisateur que son compte a été rejeté
     */
    @Transactional
    public void notifyUserAccountRejected(User user, String reason) {
        String title = "Compte rejeté";
        String message = "Nous regrettons de vous informer que votre demande de compte a été rejetée.";
        if (reason != null && !reason.isEmpty()) {
            message += " Raison: " + reason;
        }
        
        createNotification(user, title, message, NotificationType.ACCOUNT_REJECTED);
        
        logger.info("Notification de rejet envoyée à {}", user.getEmail());
    }
  
    /**
     * Notifier un utilisateur que son compte a été supprimé
     * SEULEMENT PAR EMAIL - pas de sauvegarde en base
     */
    public void notifyUserAccountDeleted(User user) {
        String title = "Compte supprimé";
        String message = "Nous vous informons que votre compte a été supprimé par l'administrateur. " +
                        "Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support.";
        
        try {
            // Envoyer SEULEMENT l'email, PAS de création en base
            emailService.sendNotificationEmail(user.getEmail(), title, message);
            logger.info("Email de notification de suppression envoyé à: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi de l'email de suppression à {}: {}", 
                        user.getEmail(), e.getMessage());
        }
    }
    
    /**
     * Version asynchrone pour l'envoi de notification de suppression de compte
     */
    @Async
    public void notifyUserAccountDeletedAsync(User user) {
        notifyUserAccountDeleted(user);
    }
    
    /**
     * Notifier les utilisateurs d'une alerte météo
     */
    @Transactional
    public void notifyUsersWeatherAlert(String alertMessage) {
        List<User> users = userRepository.findByStatus(AccountStatus.ACTIVE).stream()
                .filter(user -> {
                    NotificationPreference prefs = preferenceService.getUserPreferences(user);
                    return prefs.isWeatherAlerts();
                })
                .toList();
        
        String title = "Alerte Météo";
        
        for (User user : users) {
            createNotification(user, title, alertMessage, NotificationType.WEATHER_ALERT);
        }
        
        logger.info("Alerte météo envoyée à {} utilisateurs", users.size());
    }
    
    /**
     * Notifier les utilisateurs d'une alerte qualité d'air
     */
    @Transactional
    public void notifyUsersAirQualityAlert(String alertMessage) {
        List<User> users = userRepository.findByStatus(AccountStatus.ACTIVE).stream()
                .filter(user -> {
                    NotificationPreference prefs = preferenceService.getUserPreferences(user);
                    return prefs.isAirQualityAlerts();
                })
                .toList();
        
        String title = "Alerte Qualité de l'Air";
        
        for (User user : users) {
            createNotification(user, title, alertMessage, NotificationType.AIR_QUALITY_ALERT);
        }
        
        logger.info("Alerte qualité d'air envoyée à {} utilisateurs", users.size());
    }
    
    /**
     * Notifier les utilisateurs d'une alerte système
     */
    @Transactional
    public void notifyUsersSystemAlert(String alertMessage) {
        List<User> users = userRepository.findByStatus(AccountStatus.ACTIVE);
        
        String title = "Alerte Système";
        
        for (User user : users) {
            createNotification(user, title, alertMessage, NotificationType.SYSTEM_ALERT);
        }
        
        logger.info("Alerte système envoyée à {} utilisateurs", users.size());
    }
    
    /**
     * Récupérer les notifications d'un utilisateur
     */
    public Page<Notification> getUserNotifications(User user, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findByUserOrderByCreatedAtDesc(user, pageable);
    }
    
    /**
     * Compter les notifications non lues d'un utilisateur
     */
    public long getUnreadNotificationCount(User user) {
        return notificationRepository.countByUserAndStatus(user, NotificationStatus.UNREAD);
    }
    
    /**
     * Marquer une notification comme lue
     */
    @Transactional
    public void markAsRead(Long notificationId, User user) {
        Optional<Notification> optionalNotification = notificationRepository.findById(notificationId);
        
        if (optionalNotification.isPresent()) {
            Notification notification = optionalNotification.get();
            
            // Vérifier que la notification appartient bien à l'utilisateur
            if (notification.getUser().getId().equals(user.getId())) {
                notification.markAsRead();
                notificationRepository.save(notification);
                
                // Envoyer mise à jour WebSocket
                sendUnreadCountUpdate(user);
                
                logger.info("Notification {} marquée comme lue pour {}", notificationId, user.getEmail());
            }
        }
    }
    
    /**
     * Marquer toutes les notifications d'un utilisateur comme lues
     */
    @Transactional
    public void markAllAsRead(User user) {
        int updated = notificationRepository.markAllAsReadForUser(
            user, NotificationStatus.READ, LocalDateTime.now(), NotificationStatus.UNREAD
        );
        
        // Envoyer mise à jour WebSocket
        sendUnreadCountUpdate(user);
        
        logger.info("{} notifications marquées comme lues pour {}", updated, user.getEmail());
    }
    
    /**
     * Envoyer notification WebSocket (utilise l'email comme identifiant)
     */
    private void sendNotificationToUser(User user, Notification notification) {
        try {
            messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/notifications",
                notification
            );
            logger.debug("Notification envoyée via WebSocket à {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi de la notification WebSocket à {}: {}", 
                        user.getEmail(), e.getMessage());
        }
    }
    
    /**
     * Envoyer mise à jour du compteur de notifications non lues
     */
    private void sendUnreadCountUpdate(User user) {
        try {
            long unreadCount = getUnreadNotificationCount(user);
            messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/notifications/count",
                unreadCount
            );
            logger.debug("Mise à jour du compteur envoyée à {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi de la mise à jour du compteur à {}: {}", 
                        user.getEmail(), e.getMessage());
        }
    }
    
    /**
     * Envoyer email si les préférences le permettent
     */
    private void sendEmailNotificationIfEnabled(Notification notification) {
        try {
            NotificationPreference prefs = preferenceService.getUserPreferences(notification.getUser());
            
            if (prefs.isEmailNotifications()) {
                // Vérifier le type de notification et les préférences spécifiques
                boolean shouldSendEmail = switch (notification.getType()) {
                    case WEATHER_ALERT -> prefs.isWeatherAlerts();
                    case AIR_QUALITY_ALERT -> prefs.isAirQualityAlerts();
                    case ACCOUNT_VALIDATION, ACCOUNT_APPROVED, ACCOUNT_REJECTED -> prefs.isAccountNotifications();
                    default -> true;
                };
                
                if (shouldSendEmail) {
                    emailService.sendNotificationEmail(
                        notification.getUser().getEmail(),
                        notification.getTitle(),
                        notification.getMessage()
                    );
                }
            }
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi d'email pour la notification {}", notification.getId(), e);
        }
    }

    public void sendNotificationToAll(Notification notification) {
        List<User> users = userRepository.findByStatus(AccountStatus.ACTIVE);
        for (User user : users) {
            Notification userNotification = new Notification();
            userNotification.setUser(user);
            userNotification.setTitle(notification.getTitle());
            userNotification.setMessage(notification.getMessage());
            userNotification.setType(notification.getType());
            userNotification.setStatus(NotificationStatus.UNREAD);
            userNotification.setCreatedAt(LocalDateTime.now());
            
            notificationRepository.save(userNotification);
            sendNotificationToUser(user, userNotification);
        }
    }

    public List<Notification> getUserNotifications(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Transactional
    public void markNotificationAsRead(Long notificationId) {
        Notification notification = notificationRepository.findById(notificationId)
            .orElseThrow(() -> new RuntimeException("Notification not found"));
        
        notification.setStatus(NotificationStatus.READ);
        notification.setReadAt(LocalDateTime.now());
        notificationRepository.save(notification);
    }

    @Transactional
    public void markAllNotificationsAsRead(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        notificationRepository.markAllAsReadForUser(
            user,
            NotificationStatus.READ,
            LocalDateTime.now(),
            NotificationStatus.UNREAD
        );
    }

    /**
     * Envoyer les notifications récentes à un utilisateur
     */
    public void sendRecentNotifications(User user) {
        try {
            List<Notification> recentNotifications = getUserNotifications(user.getId());
            messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/notifications/recent",
                recentNotifications
            );
            logger.debug("Notifications récentes envoyées à {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi des notifications récentes à {}: {}", 
                        user.getEmail(), e.getMessage());
        }
    }

    /**
     * Récupérer toutes les notifications (pour les admins)
     */
    public Page<Notification> getAllNotifications(Pageable pageable) {
        return notificationRepository.findAll(pageable);
    }
}