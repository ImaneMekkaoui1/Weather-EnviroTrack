package com.backend.demo.dto;

import com.backend.demo.entity.Capteur;
import java.time.LocalDateTime;

public class CapteurResponse {
    private Long id;
    private String nom;
    private String type;
    private String localisation;
    private String statut;
    private LocalDateTime dateCreation;
    private LocalDateTime derniereModification;
    
    // Constructeur vide
    public CapteurResponse() {
    }
    
    // Méthode statique pour convertir Capteur en CapteurResponse
    public static CapteurResponse fromCapteur(Capteur capteur) {
        CapteurResponse response = new CapteurResponse();
        response.id = capteur.getId();
        response.nom = capteur.getNom();
        response.type = capteur.getType();
        response.localisation = capteur.getLocalisation();
        response.statut = capteur.getStatut();
        response.dateCreation = capteur.getDateCreation();
        response.derniereModification = capteur.getDerniereModification();
        return response;
    }
    
    // Getters & Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getNom() {
        return nom;
    }
    
    public void setNom(String nom) {
        this.nom = nom;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    public String getLocalisation() {
        return localisation;
    }
    
    public void setLocalisation(String localisation) {
        this.localisation = localisation;
    }
    
    public String getStatut() {
        return statut;
    }
    
    public void setStatut(String statut) {
        this.statut = statut;
    }
    
    public LocalDateTime getDateCreation() {
        return dateCreation;
    }
    
    public void setDateCreation(LocalDateTime dateCreation) {
        this.dateCreation = dateCreation;
    }
    
    public LocalDateTime getDerniereModification() {
        return derniereModification;
    }
    
    public void setDerniereModification(LocalDateTime derniereModification) {
        this.derniereModification = derniereModification;
    }
}