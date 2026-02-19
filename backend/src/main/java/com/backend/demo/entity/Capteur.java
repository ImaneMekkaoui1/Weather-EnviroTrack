package com.backend.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "capteurs")
public class Capteur {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String nom;
    private String type;
    private String localisation;
    private String statut;
    private LocalDateTime dateCreation;
    private LocalDateTime derniereModification;
    
    @Column(columnDefinition = "TEXT")
    private String commentaire;
    
    public Capteur() {
        this.dateCreation = LocalDateTime.now();
        this.derniereModification = LocalDateTime.now();
    }
    
    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }
    
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    
    public LocalDateTime getDateCreation() { return dateCreation; }
    public void setDateCreation(LocalDateTime dateCreation) { this.dateCreation = dateCreation; }
    
    public LocalDateTime getDerniereModification() { return derniereModification; }
    public void setDerniereModification(LocalDateTime derniereModification) { 
        this.derniereModification = derniereModification; 
    }
    
    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }
}