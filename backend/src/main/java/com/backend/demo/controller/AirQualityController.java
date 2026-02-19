package com.backend.demo.controller;

import com.backend.demo.mqtt.AirQualityData;
import com.backend.demo.mqtt.AirQualityDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/airquality") 
public class AirQualityController {

    private final AirQualityDataService airQualityDataService;

    public AirQualityController(AirQualityDataService airQualityDataService) {
        this.airQualityDataService = airQualityDataService;
    }

    @GetMapping
    public ResponseEntity<AirQualityData> getAirQualityData() {
        return ResponseEntity.ok(airQualityDataService.getLatestData());
    }

    @GetMapping("/current")
    public ResponseEntity<AirQualityData> getCurrentAirQuality() {
        return ResponseEntity.ok(airQualityDataService.getLatestData());
    }
}