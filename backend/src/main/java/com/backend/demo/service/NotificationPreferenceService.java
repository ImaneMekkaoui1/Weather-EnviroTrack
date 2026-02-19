// src/main/java/com/backend/demo/service/NotificationPreferenceService.java
package com.backend.demo.service;

import com.backend.demo.entity.NotificationPreference;
import com.backend.demo.entity.User;
import com.backend.demo.repository.NotificationPreferenceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationPreferenceService {
    
    private static final Logger logger = LoggerFactory.getLogger(NotificationPreferenceService.class);
    
    @Autowired
    private NotificationPreferenceRepository preferenceRepository;
    
    /**
     * Récupérer les préférences de notification d'un utilisateur
     * Si elles n'existent pas, les créer avec les valeurs par défaut
     */
    public NotificationPreference getUserPreferences(User user) {
        return preferenceRepository.findByUser(user)
                .orElseGet(() -> createDefaultPreferences(user));
    }
    
    /**
     * Créer les préférences par défaut pour un utilisateur
     * Avec vérification pour éviter les doublons
     */
    @Transactional
    public NotificationPreference createDefaultPreferences(User user) {
        // Vérifier si les préférences existent déjà
        return preferenceRepository.findByUser(user)
                .orElseGet(() -> {
                    NotificationPreference preferences = new NotificationPreference(user);
                    preferences = preferenceRepository.save(preferences);
                    
                    logger.info("Préférences de notification par défaut créées pour l'utilisateur {}", user.getEmail());
                    
                    return preferences;
                });
    }
    
    /**
     * Créer les préférences par défaut lors de l'inscription (appel sécurisé)
     * Cette méthode est spécifiquement pour l'inscription
     */
    @Transactional
    public NotificationPreference createDefaultPreferencesForRegistration(User user) {
        // Vérification explicite pour l'inscription
        if (preferenceRepository.findByUser(user).isPresent()) {
            logger.debug("Préférences déjà existantes pour l'utilisateur {}", user.getEmail());
            return preferenceRepository.findByUser(user).get();
        }
        
        NotificationPreference preferences = new NotificationPreference(user);
        preferences = preferenceRepository.save(preferences);
        
        logger.info("Préférences de notification par défaut créées pour l'utilisateur {}", user.getEmail());
        
        return preferences;
    }
    
    /**
     * Mettre à jour les préférences de notification d'un utilisateur
     */
    @Transactional
    public NotificationPreference updatePreferences(User user, NotificationPreference newPreferences) {
        NotificationPreference existingPreferences = getUserPreferences(user);
        
        // Mettre à jour les valeurs
        existingPreferences.setEmailNotifications(newPreferences.isEmailNotifications());
        existingPreferences.setWebNotifications(newPreferences.isWebNotifications());
        existingPreferences.setWeatherAlerts(newPreferences.isWeatherAlerts());
        existingPreferences.setAirQualityAlerts(newPreferences.isAirQualityAlerts());
        existingPreferences.setAccountNotifications(newPreferences.isAccountNotifications());
        
        existingPreferences = preferenceRepository.save(existingPreferences);
        
        logger.info("Préférences de notification mises à jour pour l'utilisateur {}", user.getEmail());
        
        return existingPreferences;
    }
    
    /**
     * Vérifier si un utilisateur accepte les notifications email
     */
    public boolean userAcceptsEmailNotifications(User user) {
        NotificationPreference prefs = getUserPreferences(user);
        return prefs.isEmailNotifications();
    }
    
    /**
     * Vérifier si un utilisateur accepte les notifications web
     */
    public boolean userAcceptsWebNotifications(User user) {
        NotificationPreference prefs = getUserPreferences(user);
        return prefs.isWebNotifications();
    }
    
    /**
     * Vérifier si un utilisateur accepte les alertes météo
     */
    public boolean userAcceptsWeatherAlerts(User user) {
        NotificationPreference prefs = getUserPreferences(user);
        return prefs.isWeatherAlerts();
    }
    
    /**
     * Vérifier si un utilisateur accepte les alertes qualité d'air
     */
    public boolean userAcceptsAirQualityAlerts(User user) {
        NotificationPreference prefs = getUserPreferences(user);
        return prefs.isAirQualityAlerts();
    }
    
    /**
     * Vérifier si un utilisateur accepte les notifications de compte
     */
    public boolean userAcceptsAccountNotifications(User user) {
        NotificationPreference prefs = getUserPreferences(user);
        return prefs.isAccountNotifications();
    }
}