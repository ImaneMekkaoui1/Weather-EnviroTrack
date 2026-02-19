package com.backend.demo.service;

import com.backend.demo.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class NotificationCleanupService {
    
    private static final Logger logger = LoggerFactory.getLogger(NotificationCleanupService.class);
    
    @Autowired
    private NotificationRepository notificationRepository;
    
    /**
     * Nettoyer les anciennes notifications tous les jours à 2h du matin
     * Supprime les notifications de plus de 30 jours
     */
    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cleanupOldNotifications() {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(30);
            int deletedCount = notificationRepository.deleteOldNotifications(cutoffDate);
            
            if (deletedCount > 0) {
                logger.info("Nettoyage automatique: {} anciennes notifications supprimées", deletedCount);
            }
        } catch (Exception e) {
            logger.error("Erreur lors du nettoyage des notifications: ", e);
        }
    }
}