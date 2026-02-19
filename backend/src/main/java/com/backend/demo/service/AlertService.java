package com.backend.demo.service;

import com.backend.demo.entity.Alert;
import com.backend.demo.entity.AlertThreshold;
import com.backend.demo.mqtt.AirQualityData;
import com.backend.demo.mqtt.AirQualityDataService;
import com.backend.demo.repository.AlertRepository;
import com.backend.demo.repository.AlertThresholdRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AlertService {

    @Autowired
    private AlertRepository alertRepository;
    
    @Autowired
    private AlertThresholdRepository thresholdRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    @Autowired
    private AlertNotificationService notificationService;
    
    @Autowired
    private AirQualityDataService airQualityDataService;

    public List<Alert> getAllAlerts() {
        return alertRepository.findByOrderByTimestampDesc();
    }
    
    public List<Alert> getRecentAlerts() {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_MONTH, -1); // 24 heures en arrière
        return alertRepository.findAlertsFromLast24Hours(cal.getTime());
    }
    
    public List<Alert> getAlertsByType(String type) {
        return alertRepository.findByTypeOrderByTimestampDesc(type);
    }
    
    public List<Alert> getAlertsBySeverity(String severity) {
        return alertRepository.findBySeverityOrderByTimestampDesc(severity);
    }
    
    public List<Alert> getAlertsByParameter(String parameter) {
        return alertRepository.findByParameterOrderByTimestampDesc(parameter);
    }
    
    public List<Alert> getAlertsByDateRange(Date startDate, Date endDate) {
        return alertRepository.findByTimestampBetweenOrderByTimestampDesc(startDate, endDate);
    }
    
    public List<Alert> searchAlerts(String parameter, String severity, String type, Date startDate, Date endDate) {
        return alertRepository.findAlertsByFilters(parameter, severity, type, startDate, endDate);
    }

    @Transactional
    public Alert createAlert(String parameter, Double value, String severity) {
        Alert alert = new Alert();
        alert.setParameter(parameter);
        alert.setValue(value);
        alert.setSeverity(severity);
        alert.setMessage(generateAlertMessage(parameter, value, severity));
        alert.setType(getAlertType(parameter));
        alert.setTimestamp(new Date());
        
        Alert savedAlert = alertRepository.save(alert);
        
        // Notifier via WebSocket
        notificationService.sendNewAlert(savedAlert);
        
        // Envoyer également une notification de résumé des alertes actives
        sendAlertSummary();
        
        return savedAlert;
    }

    public void checkAndCreateAlerts(String parameter, Double value) {
        AlertThreshold threshold = thresholdRepository.findByParameter(parameter)
            .orElseThrow(() -> new RuntimeException("Threshold not found for parameter: " + parameter));
            
        if (value >= threshold.getCriticalThreshold()) {
            createAlert(parameter, value, "danger");
        } else if (value >= threshold.getWarningThreshold()) {
            createAlert(parameter, value, "warning");
        }
    }

    /**
     * Recalcule les alertes basées sur les données actuelles et les seuils configurés
     * Cette méthode est appelée après la mise à jour d'un seuil pour générer de nouvelles alertes si nécessaire
     */
    @Transactional
    public void recalculateAlerts() {
        // Récupère les dernières données de qualité d'air
        AirQualityData latestData = airQualityDataService.getLatestData();
        
        if (latestData != null) {
            // Vérifie chaque paramètre par rapport à son seuil
            checkAndCreateAlerts("pm25", (double) latestData.getPm25());
            checkAndCreateAlerts("pm10", (double) latestData.getPm10());
            checkAndCreateAlerts("no2", (double) latestData.getNo2());
            checkAndCreateAlerts("o3", (double) latestData.getO3());
            checkAndCreateAlerts("co", (double) latestData.getCo());
            checkAndCreateAlerts("aqi", (double) latestData.getAqi());
            
            // Envoie un message pour indiquer que le recalcul est terminé
            messagingTemplate.convertAndSend("/topic/alerts-recalculated", true);
            
            // Envoyer un résumé des alertes actives
            sendAlertSummary();
        }
    }
    
    /**
     * Nettoie périodiquement les anciennes alertes
     * Par défaut, supprime les alertes de plus de 30 jours
     */
    @Scheduled(cron = "0 0 0 * * ?") // Tous les jours à minuit
    @Transactional
    public void cleanupOldAlerts() {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_MONTH, -30);
        alertRepository.deleteByTimestampBefore(cal.getTime());
    }
    
    /**
     * Supprime une alerte par son ID
     */
    @Transactional
    public void deleteAlert(Long id) {
        alertRepository.deleteById(id);
    }
    
    /**
     * Supprime toutes les alertes
     */
    @Transactional
    public void deleteAllAlerts() {
        alertRepository.deleteAll();
    }
    
    /**
     * Envoie un résumé des alertes actuelles pour l'affichage dans l'UI
     */
    public void sendAlertSummary() {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_MONTH, -1);
        
        List<Alert> recentAlerts = alertRepository.findAlertsFromLast24Hours(cal.getTime());
        
        Map<String, Long> alertSummary = new HashMap<>();
        long dangerCount = recentAlerts.stream().filter(a -> "danger".equals(a.getSeverity())).count();
        long warningCount = recentAlerts.stream().filter(a -> "warning".equals(a.getSeverity())).count();
        
        alertSummary.put("danger", dangerCount);
        alertSummary.put("warning", warningCount);
        alertSummary.put("total", (long) recentAlerts.size());
        
        messagingTemplate.convertAndSend("/topic/alert-summary", alertSummary);
    }

    private String generateAlertMessage(String parameter, Double value, String severity) {
        String parameterName = getParameterLabel(parameter);
        return String.format("%s niveau %s: %.2f", parameterName, severity, value);
    }

    private String getAlertType(String parameter) {
        return parameter.equals("temperature") || parameter.equals("humidity") ? "weather" : "air";
    }

    private String getParameterLabel(String parameter) {
        switch(parameter) {
            case "temperature": return "Température";
            case "humidity": return "Humidité";
            case "pm25": return "PM2.5";
            case "pm10": return "PM10";
            case "no2": return "NO2";
            case "o3": return "Ozone";
            case "co": return "Monoxyde de carbone";
            case "aqi": return "Indice de qualité d'air";
            default: return parameter;
        }
    }
}