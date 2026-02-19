package com.backend.demo.service;

import com.backend.demo.entity.Alert;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AlertNotificationService {
    private static final Logger logger = LoggerFactory.getLogger(AlertNotificationService.class);

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    public void sendNewAlert(Alert alert) {
        logger.info("Sending new alert - ID: {}, Parameter: {}, Severity: {}", 
                   alert.getId(), alert.getParameter(), alert.getSeverity());
        
        try {
            // Envoi standard
            messagingTemplate.convertAndSend("/topic/alerts", alert);
            
            // Envois spécifiques
            messagingTemplate.convertAndSend("/topic/alerts/" + alert.getType(), alert);
            messagingTemplate.convertAndSend("/topic/alerts/parameter/" + alert.getParameter(), alert);
            
            // Envoi par sévérité
            String severityTopic = "/topic/alerts/severity/" + alert.getSeverity();
            messagingTemplate.convertAndSend(severityTopic, alert);
            
            // Notification UI
            Map<String, Object> notification = createNotification(alert);
            messagingTemplate.convertAndSend("/topic/notifications", notification);
            
            // Mise à jour du résumé
            sendAlertSummary();
            
        } catch (Exception e) {
            logger.error("Error sending alert notifications", e);
        }
    }
    
    private Map<String, Object> createNotification(Alert alert) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("eventType", "NEW_ALERT");
        notification.put("alertId", alert.getId());
        notification.put("timestamp", System.currentTimeMillis());
        notification.put("severity", alert.getSeverity());
        notification.put("parameter", alert.getParameter());
        notification.put("message", alert.getMessage());
        return notification;
    }
    
    public void sendAlertDeletion(Long alertId) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("eventType", "ALERT_DELETED");
        notification.put("alertId", alertId);
        messagingTemplate.convertAndSend("/topic/notifications", notification);
    }
    
    public void sendThresholdUpdate(String parameter) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("eventType", "THRESHOLD_UPDATED");
        notification.put("parameter", parameter);
        notification.put("timestamp", System.currentTimeMillis());
        messagingTemplate.convertAndSend("/topic/notifications", notification);
    }
    
    private void sendAlertSummary() {
        Map<String, Object> summary = new HashMap<>();
        summary.put("eventType", "ALERT_SUMMARY_UPDATE");
        summary.put("timestamp", System.currentTimeMillis());
        messagingTemplate.convertAndSend("/topic/alert-summary", summary);
    }
    public void sendCustomNotification(String type, Map<String, Object> data) {
        Map<String, Object> notification = new HashMap<>(data);
        notification.put("eventType", type);
        notification.put("timestamp", System.currentTimeMillis());
        
        messagingTemplate.convertAndSend("/topic/notifications", notification);
        logger.info("Sent custom notification of type: {}", type);
    }
    
    public void sendSimpleNotification(String type, String message) {
        Map<String, Object> notification = new HashMap<>();
        notification.put("eventType", type);
        notification.put("message", message);
        notification.put("timestamp", System.currentTimeMillis());
        
        messagingTemplate.convertAndSend("/topic/notifications", notification);
    }
}