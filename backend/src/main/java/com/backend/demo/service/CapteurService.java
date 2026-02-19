package com.backend.demo.service;

import com.backend.demo.dto.CapteurRequest;
import com.backend.demo.dto.CapteurResponse;
import com.backend.demo.entity.Capteur;
import com.backend.demo.repository.CapteurRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class CapteurService {
    
    @Autowired
    private CapteurRepository capteurRepository;
    
    public CapteurResponse createCapteur(CapteurRequest request) {
        Capteur capteur = new Capteur();
        capteur.setNom(request.getNom());
        capteur.setType(request.getType());
        capteur.setLocalisation(request.getLocalisation());
        capteur.setStatut(request.getStatut());
        
        capteur = capteurRepository.save(capteur);
        return CapteurResponse.fromCapteur(capteur);
    }
    
    public List<CapteurResponse> getAllCapteurs() {
        return capteurRepository.findAll().stream()
                .map(CapteurResponse::fromCapteur)
                .collect(Collectors.toList());
    }
    
    public CapteurResponse getCapteurById(Long id) {
        Capteur capteur = capteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Capteur non trouvé avec l'ID: " + id));
        return CapteurResponse.fromCapteur(capteur);
    }
    
    public CapteurResponse updateCapteur(Long id, CapteurRequest request) {
        Capteur capteur = capteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Capteur non trouvé avec l'ID: " + id));
        
        capteur.setNom(request.getNom());
        capteur.setType(request.getType());
        capteur.setLocalisation(request.getLocalisation());
        capteur.setStatut(request.getStatut());
        capteur.setDerniereModification(LocalDateTime.now());
        
        capteur = capteurRepository.save(capteur);
        return CapteurResponse.fromCapteur(capteur);
    }
    
    public void deleteCapteur(Long id) {
        if (!capteurRepository.existsById(id)) {
            throw new RuntimeException("Capteur non trouvé avec l'ID: " + id);
        }
        capteurRepository.deleteById(id);
    }
    
    public void generateRandomData(Long capteurId) {
        Capteur capteur = capteurRepository.findById(capteurId)
                .orElseThrow(() -> new RuntimeException("Capteur non trouvé avec l'ID: " + capteurId));
        
        capteur.setDerniereModification(LocalDateTime.now());
        capteurRepository.save(capteur);
    }
    
    public CapteurResponse updateCapteurHistory(Long id, String history) {
        Capteur capteur = capteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Capteur non trouvé avec l'ID: " + id));
        
        capteur.setCommentaire(history);
        capteur.setDerniereModification(LocalDateTime.now());
        
        capteur = capteurRepository.save(capteur);
        return CapteurResponse.fromCapteur(capteur);
    }
    
    public String getCapteurHistory(Long id) {
        Capteur capteur = capteurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Capteur non trouvé avec l'ID: " + id));
        
        return capteur.getCommentaire();
    }
}