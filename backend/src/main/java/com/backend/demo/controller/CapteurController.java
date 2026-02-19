package com.backend.demo.controller;

import com.backend.demo.dto.CapteurRequest;
import com.backend.demo.dto.CapteurResponse;
import com.backend.demo.service.CapteurService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/capteurs")
public class CapteurController {
    
    @Autowired
    private CapteurService capteurService;
    
    @GetMapping
    public ResponseEntity<List<CapteurResponse>> getAllCapteurs() {
        return ResponseEntity.ok(capteurService.getAllCapteurs());
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<CapteurResponse> getCapteurById(@PathVariable Long id) {
        return ResponseEntity.ok(capteurService.getCapteurById(id));
    }
    
    @PostMapping
    public ResponseEntity<CapteurResponse> createCapteur(@RequestBody CapteurRequest request) {
        CapteurResponse response = capteurService.createCapteur(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<CapteurResponse> updateCapteur(@PathVariable Long id, @RequestBody CapteurRequest request) {
        return ResponseEntity.ok(capteurService.updateCapteur(id, request));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCapteur(@PathVariable Long id) {
        capteurService.deleteCapteur(id);
        return ResponseEntity.noContent().build();
    }
    
    @PostMapping("/{id}/generate-data")
    public ResponseEntity<Void> generateRandomData(@PathVariable Long id) {
        capteurService.generateRandomData(id);
        return ResponseEntity.ok().build();
    }
    
    @GetMapping("/current")
    public ResponseEntity<List<CapteurResponse>> getCurrentCapteurs() {
        return ResponseEntity.ok(capteurService.getAllCapteurs());
    }
    
    @PutMapping("/{id}/history")
    public ResponseEntity<CapteurResponse> updateCapteurHistory(
            @PathVariable Long id, 
            @RequestBody Map<String, String> request) {
        return ResponseEntity.ok(capteurService.updateCapteurHistory(id, request.get("history")));
    }
    
    @GetMapping("/{id}/history")
    public ResponseEntity<String> getCapteurHistory(@PathVariable Long id) {
        return ResponseEntity.ok(capteurService.getCapteurHistory(id));
    }
}