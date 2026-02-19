package com.backend.demo.controller;

import com.backend.demo.entity.WeatherComparison;
import com.backend.demo.service.WeatherComparisonService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/weather-reliability")
public class WeatherReliabilityController {

    private static final Logger logger = LoggerFactory.getLogger(WeatherReliabilityController.class);
    
    private final WeatherComparisonService comparisonService;
    
    @Autowired
    public WeatherReliabilityController(WeatherComparisonService comparisonService) {
        this.comparisonService = comparisonService;
    }
    
    @GetMapping("/record/{city}")
    public ResponseEntity<Map<String, Object>> recordForecasts(@PathVariable String city) {
        try {
            logger.info("Enregistrement des prévisions pour {}", city);
            comparisonService.recordForecasts(city);
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Prévisions enregistrées pour " + city
            ));
        } catch (Exception e) {
            logger.error("Erreur lors de l'enregistrement des prévisions pour {}", city, e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", "Erreur: " + e.getMessage()
            ));
        }
    }
    
    @GetMapping("/comparisons/{city}")
    public ResponseEntity<List<WeatherComparison>> getComparisons(@PathVariable String city) {
        try {
            List<WeatherComparison> comparisons = comparisonService.getComparisonsByCity(city);
            return ResponseEntity.ok(comparisons);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des comparaisons pour {}", city, e);
            return ResponseEntity.status(500).body(null);
        }
    }
    
    @GetMapping("/comparisons/{city}/{source}")
    public ResponseEntity<List<WeatherComparison>> getComparisonsBySource(
            @PathVariable String city, @PathVariable String source) {
        try {
            List<WeatherComparison> comparisons = comparisonService.getComparisonsByCityAndSource(city, source);
            return ResponseEntity.ok(comparisons);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des comparaisons pour {}/{}", city, source, e);
            return ResponseEntity.status(500).body(null);
        }
    }
    
    @GetMapping("/stats/{city}")
    public ResponseEntity<Map<String, Object>> getReliabilityStats(
            @PathVariable String city,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        try {
            // Par défaut, prendre les 7 derniers jours
            LocalDateTime start = startDate != null ? 
                startDate.atStartOfDay() : LocalDateTime.now().minusDays(7).withHour(0).withMinute(0);
                
            LocalDateTime end = endDate != null ?
                endDate.atTime(LocalTime.MAX) : LocalDateTime.now();
                
            Map<String, Object> stats = comparisonService.getReliabilityStats(city, start, end);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Erreur lors du calcul des statistiques pour {}", city, e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", "Erreur: " + e.getMessage()
            ));
        }
    }
    
    @GetMapping("/comparison-by-date-range/{city}")
    public ResponseEntity<List<WeatherComparison>> getComparisonsByDateRange(
            @PathVariable String city,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        try {
            LocalDateTime start = startDate.atStartOfDay();
            LocalDateTime end = endDate.atTime(LocalTime.MAX);
            
            List<WeatherComparison> comparisons = comparisonService.getComparisonsByDateRange(city, start, end);
            return ResponseEntity.ok(comparisons);
        } catch (Exception e) {
            logger.error("Erreur lors de la récupération des comparaisons par plage de dates pour {}", city, e);
            return ResponseEntity.status(500).body(null);
        }
    }
    
    @PostMapping("/update-forecasts")
    public ResponseEntity<Map<String, Object>> updateForecastsManually() {
        try {
            logger.info("Mise à jour manuelle des prévisions avec les données réelles");
            comparisonService.updateForecastsWithActualData();
            return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Prévisions mises à jour avec les données réelles"
            ));
        } catch (Exception e) {
            logger.error("Erreur lors de la mise à jour manuelle des prévisions", e);
            return ResponseEntity.status(500).body(Map.of(
                "status", "error",
                "message", "Erreur: " + e.getMessage()
            ));
        }
    }
}