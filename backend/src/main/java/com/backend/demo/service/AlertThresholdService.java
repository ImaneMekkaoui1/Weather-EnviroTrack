package com.backend.demo.service;

import com.backend.demo.entity.AlertThreshold;
import com.backend.demo.repository.AlertThresholdRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Date;
import java.util.List;

@Service
public class AlertThresholdService {

    @Autowired
    private AlertThresholdRepository repository;
    
    @Autowired
    private AlertService alertService;

    public List<AlertThreshold> getAllThresholds() {
        return repository.findAll();
    }

    public AlertThreshold updateThreshold(Long id, AlertThreshold threshold) {
        AlertThreshold existing = repository.findById(id)
            .orElseThrow(() -> new RuntimeException("Seuil non trouvé"));
        
        existing.setWarningThreshold(threshold.getWarningThreshold());
        existing.setCriticalThreshold(threshold.getCriticalThreshold());
        existing.setUpdatedAt(new Date());
        
        AlertThreshold updated = repository.save(existing);
        
        // Recalcul des alertes après mise à jour du seuil
        alertService.recalculateAlerts();
        
        return updated;
    }

    public AlertThreshold getThresholdByParameter(String parameter) {
        return repository.findByParameter(parameter)
            .orElseThrow(() -> new RuntimeException("Seuil non trouvé pour le paramètre: " + parameter));
    }
}