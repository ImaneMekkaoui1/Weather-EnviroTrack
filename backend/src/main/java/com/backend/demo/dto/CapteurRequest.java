package com.backend.demo.dto;

public class CapteurRequest {
    private String nom;
    private String type;
    private String localisation;
    private String statut;
    private String commentaire;
    
    // Getters & Setters
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    
    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }
    
    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
    
    public String getCommentaire() { return commentaire; }
    public void setCommentaire(String commentaire) { this.commentaire = commentaire; }
}