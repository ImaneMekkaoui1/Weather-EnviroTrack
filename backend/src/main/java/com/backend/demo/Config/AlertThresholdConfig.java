package com.backend.demo.Config;

import com.backend.demo.entity.AlertThreshold;
import com.backend.demo.repository.AlertThresholdRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import java.util.Arrays;
import java.util.List;

@Configuration
public class AlertThresholdConfig {

    @Autowired
    private AlertThresholdRepository repository;

    @PostConstruct
    public void init() {
        if (repository.count() == 0) {
            List<AlertThreshold> defaultThresholds = Arrays.asList(
                createThreshold("temperature", 30.0, 35.0),
                createThreshold("humidity", 70.0, 80.0),
                createThreshold("pm25", 35.0, 55.0),
                createThreshold("pm10", 50.0, 80.0),
                createThreshold("no2", 100.0, 200.0),
                createThreshold("o3", 100.0, 180.0),
                createThreshold("co", 5.0, 10.0),
                createThreshold("aqi", 50.0, 100.0)
            );
            repository.saveAll(defaultThresholds);
        }
    }

    private AlertThreshold createThreshold(String parameter, Double warning, Double critical) {
        AlertThreshold threshold = new AlertThreshold();
        threshold.setParameter(parameter);
        threshold.setWarningThreshold(warning);
        threshold.setCriticalThreshold(critical);
        return threshold;
    }
}