// src/main/java/com/backend/demo/service/AuthService.java (CORRIGÉ)
package com.backend.demo.service;

import com.backend.demo.dto.LoginRequest;
import com.backend.demo.dto.RegisterRequest;
import com.backend.demo.entity.AccountStatus;
import com.backend.demo.entity.Role;
import com.backend.demo.entity.User;
import com.backend.demo.repository.UserRepository;
import com.backend.demo.security.JwtTokenProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    
    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private NotificationPreferenceService notificationPreferenceService;

    @Autowired
    public AuthService(AuthenticationManager authenticationManager,
                      UserRepository userRepository,
                      PasswordEncoder passwordEncoder,
                      JwtTokenProvider tokenProvider) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    @Transactional
    public void register(RegisterRequest request) {
        logger.debug("Début de l'inscription pour l'utilisateur: {}", request.email());
        
        if (userRepository.existsByEmail(request.email())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email already in use");
        }
        if (userRepository.existsByUsername(request.username())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username already taken");
        }

        User user = new User();
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(Role.USER);
        user.setStatus(AccountStatus.PENDING); // L'utilisateur est en attente de validation
        user.setCreated_at(LocalDateTime.now());
        user.setUpdated_at(LocalDateTime.now());

        user = userRepository.save(user);
        logger.debug("Utilisateur sauvegardé avec l'ID: {}", user.getId());
        
        // Créer les préférences de notification par défaut (méthode sécurisée)
        notificationPreferenceService.createDefaultPreferencesForRegistration(user);
        
        // Notifier les admins qu'un nouveau compte doit être validé
        try {
            notificationService.notifyAdminsNewAccountValidation(user);
            logger.debug("Notification aux admins envoyée pour l'utilisateur: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi de notification aux admins pour l'utilisateur: {}", user.getEmail(), e);
            // Ne pas interrompre l'inscription si la notification échoue
        }
        
        logger.info("Inscription terminée avec succès pour l'utilisateur: {}", user.getEmail());
    }

    public ResponseEntity<Map<String, Object>> login(LoginRequest request) {
        try {
            logger.debug("Tentative de connexion pour: {}", request.email());
            
            User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
                
            // Vérifier si le compte est actif
            if (user.getStatus() != AccountStatus.ACTIVE) {
                if (user.getStatus() == AccountStatus.PENDING) {
                    logger.warn("Tentative de connexion avec un compte en attente: {}", request.email());
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                        "Votre compte est en attente de validation par un administrateur");
                } else if (user.getStatus() == AccountStatus.REJECTED) {
                    logger.warn("Tentative de connexion avec un compte rejeté: {}", request.email());
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, 
                        "Votre demande d'inscription a été refusée");
                }
            }

            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.email(),
                    request.password()
                )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);

            Map<String, Object> response = new HashMap<>();
            response.put("token", jwt);
            response.put("message", "Login successful");
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("role", user.getRole().name());
            response.put("id", user.getId());
            response.put("status", user.getStatus().name());

            logger.info("Connexion réussie pour l'utilisateur: {}", user.getEmail());
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            logger.warn("Échec de connexion - Identifiants invalides pour: {}", request.email());
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        } catch (ResponseStatusException e) {
            throw e; // Re-throw ResponseStatusException as is
        } catch (Exception e) {
            logger.error("Erreur d'authentification pour: {}", request.email(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, 
                "Authentication error: " + e.getMessage(), e);
        }
    }
}