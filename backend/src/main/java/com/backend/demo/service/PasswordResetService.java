package com.backend.demo.service;

import com.backend.demo.entity.PasswordResetToken;
import com.backend.demo.entity.User;
import com.backend.demo.repository.PasswordResetTokenRepository;
import com.backend.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class PasswordResetService {

    private static final Logger logger = LoggerFactory.getLogger(PasswordResetService.class);

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    
    @PersistenceContext
    private EntityManager entityManager;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;
    
    @Value("${app.token.expiration.hours}")
    private int tokenExpirationHours;

    @Autowired
    public PasswordResetService(
            UserRepository userRepository,
            PasswordResetTokenRepository tokenRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void createPasswordResetTokenForUser(String email) {
        logger.info("Demande de réinitialisation de mot de passe pour: {}", email);
        try {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> {
                        logger.warn("Tentative de réinitialisation pour email inexistant: {}", email);
                        return new ResponseStatusException(HttpStatus.NOT_FOUND, "Utilisateur non trouvé");
                    });
            
            // Supprimer explicitement les jetons existants pour cet utilisateur
            // avec une requête native pour s'assurer de la suppression
            entityManager.createNativeQuery("DELETE FROM password_reset_tokens WHERE user_id = :userId")
                    .setParameter("userId", user.getId())
                    .executeUpdate();
            
            // Synchroniser pour s'assurer que la suppression est bien prise en compte
            entityManager.flush();
            
            // Créer un nouveau jeton
            String token = UUID.randomUUID().toString();
            LocalDateTime expiryDate = LocalDateTime.now().plusHours(tokenExpirationHours);
            
            PasswordResetToken passwordResetToken = new PasswordResetToken(token, user, expiryDate);
            tokenRepository.save(passwordResetToken);
            
            // Envoyer l'email avec le jeton
            String resetUrl = frontendUrl + "/auth/reset-password?token=" + token;
            emailService.sendPasswordResetEmail(user.getEmail(), token);
            
            logger.info("Jeton de réinitialisation créé avec succès pour: {}", email);
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Erreur lors de la création du jeton de réinitialisation: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, 
                "Erreur lors de la création du jeton de réinitialisation: " + e.getMessage());
        }
    }
    
    @Transactional
    public void validateTokenAndResetPassword(String token, String newPassword) {
        logger.info("Tentative de réinitialisation de mot de passe avec token");
        try {
            PasswordResetToken resetToken = tokenRepository.findByToken(token)
                    .orElseThrow(() -> {
                        logger.warn("Tentative de réinitialisation avec token invalide");
                        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Jeton invalide");
                    });
            
            if (resetToken.isExpired()) {
                logger.warn("Tentative de réinitialisation avec token expiré");
                tokenRepository.delete(resetToken);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le jeton a expiré");
            }
            
            User user = resetToken.getUser();
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setUpdated_at(LocalDateTime.now());
            
            userRepository.save(user);
            tokenRepository.delete(resetToken);
            
            logger.info("Mot de passe réinitialisé avec succès pour: {}", user.getEmail());
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Erreur lors de la réinitialisation du mot de passe: {}", e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, 
                "Erreur lors de la réinitialisation du mot de passe: " + e.getMessage());
        }
    }
    
    public boolean validateToken(String token) {
        logger.info("Validation du token de réinitialisation");
        try {
            return tokenRepository.findByToken(token)
                    .map(resetToken -> {
                        boolean valid = !resetToken.isExpired();
                        logger.info("Token validé: {}", valid);
                        return valid;
                    })
                    .orElse(false);
        } catch (Exception e) {
            logger.error("Erreur lors de la validation du token: {}", e.getMessage(), e);
            return false;
        }
    }
}