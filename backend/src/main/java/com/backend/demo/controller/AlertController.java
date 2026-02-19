package com.backend.demo.controller;

import com.backend.demo.entity.Alert;
import com.backend.demo.entity.AlertThreshold;
import com.backend.demo.service.AlertNotificationService;
import com.backend.demo.service.AlertService;
import com.backend.demo.service.AlertThresholdService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertController {

    @Autowired
    private AlertService alertService;
    
    @Autowired
    private AlertThresholdService thresholdService;
    
    @Autowired
    private AlertNotificationService notificationService;

    /**
     * Récupère toutes les alertes, triées par date décroissante
     */
    @GetMapping
    public List<Alert> getAllAlerts() {
        return alertService.getAllAlerts();
    }
    
    /**
     * Récupère les alertes des dernières 24 heures
     */
    @GetMapping("/recent")
    public List<Alert> getRecentAlerts() {
        return alertService.getRecentAlerts();
    }
    
    /**
     * Filtre les alertes par type
     */
    @GetMapping("/type/{type}")
    public List<Alert> getAlertsByType(@PathVariable String type) {
        return alertService.getAlertsByType(type);
    }
    
    /**
     * Filtre les alertes par niveau de sévérité
     */
    @GetMapping("/severity/{severity}")
    public List<Alert> getAlertsBySeverity(@PathVariable String severity) {
        return alertService.getAlertsBySeverity(severity);
    }
    
    /**
     * Filtre les alertes par paramètre
     */
    @GetMapping("/parameter/{parameter}")
    public List<Alert> getAlertsByParameter(@PathVariable String parameter) {
        return alertService.getAlertsByParameter(parameter);
    }
    
    /**
     * Recherche avancée d'alertes avec filtres multiples
     */
    @GetMapping("/search")
    public List<Alert> searchAlerts(
            @RequestParam(required = false) String parameter,
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Date endDate) {
        
        return alertService.searchAlerts(parameter, severity, type, startDate, endDate);
    }
    
    /**
     * Récupère tous les seuils d'alerte
     */
    @GetMapping("/thresholds")
    public List<AlertThreshold> getAllThresholds() {
        return thresholdService.getAllThresholds();
    }
    
    /**
     * Met à jour un seuil d'alerte
     */
    @PutMapping("/thresholds/{id}")
    public AlertThreshold updateThreshold(@PathVariable Long id, @RequestBody AlertThreshold threshold) {
        AlertThreshold updated = thresholdService.updateThreshold(id, threshold);
        
        // Envoyer une notification de mise à jour de seuil
        notificationService.sendThresholdUpdate(updated.getParameter());
        
        return updated;
    }
    
    /**
     * Supprime une alerte spécifique
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAlert(@PathVariable Long id) {
        alertService.deleteAlert(id);
        
        // Envoyer une notification de suppression
        notificationService.sendAlertDeletion(id);
        
        return ResponseEntity.ok().build();
    }
    
    /**
     * Supprime toutes les alertes
     */
    @DeleteMapping
     public ResponseEntity<?> deleteAllAlerts() {
    alertService.deleteAllAlerts();
    
    // Utilisez maintenant:
    notificationService.sendSimpleNotification("ALERTS_CLEARED", "Toutes les alertes ont été supprimées");
    
    return ResponseEntity.ok().build();
}
    
    /**
     * Endpoint pour forcer le recalcul des alertes
     */
    @PostMapping("/recalculate")
    public ResponseEntity<?> recalculateAlerts() {
        alertService.recalculateAlerts();
        return ResponseEntity.ok().build();
    }
    
    /**
     * Crée une alerte manuellement (utile pour les tests)
     */
    @PostMapping("/manual")
    public Alert createManualAlert(@RequestBody Map<String, Object> alertData) {
        String parameter = (String) alertData.get("parameter");
        Double value = Double.valueOf(alertData.get("value").toString());
        String severity = (String) alertData.get("severity");
        
        return alertService.createAlert(parameter, value, severity);
    }
}