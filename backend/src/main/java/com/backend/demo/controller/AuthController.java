package com.backend.demo.controller;

import com.backend.demo.dto.LoginRequest;
import com.backend.demo.dto.RegisterRequest;
import com.backend.demo.entity.LoginLog;
import com.backend.demo.repository.LoginLogRepository;
import com.backend.demo.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final LoginLogRepository loginLogRepository;

    @Autowired
    public AuthController(AuthService authService, LoginLogRepository loginLogRepository) {
        this.authService = authService;
        this.loginLogRepository = loginLogRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest httpRequest) {
        // ✅ SOLUTION 1: Générer un ID unique pour éviter les doublons
        String requestId = generateRequestId(request.email(), httpRequest);
        
        try {
            authService.register(request);
            
            // ✅ Log d'inscription réussie avec vérification de doublon
            logAuthAttemptSafely(request.email(), httpRequest, "REGISTER_SUCCESS", null, requestId);
            
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(Collections.singletonMap("message", "Inscription réussie"));
        } catch (ResponseStatusException e) {
            // ✅ Log d'inscription échouée
            logAuthAttemptSafely(request.email(), httpRequest, "REGISTER_FAILURE", e.getReason(), requestId);
            
            return ResponseEntity.status(e.getStatusCode())
                    .body(Collections.singletonMap("error", e.getReason()));
        } catch (Exception e) {
            // ✅ Log d'inscription échouée - erreur système
            logAuthAttemptSafely(request.email(), httpRequest, "REGISTER_FAILURE", "SYSTEM_ERROR", requestId);
            
            return ResponseEntity.internalServerError()
                    .body(Collections.singletonMap("error", "Erreur interne du serveur"));
        }
    }
    
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        // ✅ SOLUTION 1: Générer un ID unique pour éviter les doublons
        String requestId = generateRequestId(request.email(), httpRequest);
        
        try {
            ResponseEntity<?> response = authService.login(request);
            
            // ✅ Log de connexion selon le résultat
            if (response.getStatusCode() == HttpStatus.OK) {
                logAuthAttemptSafely(request.email(), httpRequest, "SUCCESS", null, requestId);
            } else {
                logAuthAttemptSafely(request.email(), httpRequest, "FAILURE", "AUTH_FAILED", requestId);
            }
            
            return response;
            
        } catch (ResponseStatusException e) {
            // ✅ Log de connexion échouée
            String failureReason = determineFailureReason(e.getReason());
            logAuthAttemptSafely(request.email(), httpRequest, "FAILURE", failureReason, requestId);
            
            return ResponseEntity.status(e.getStatusCode())
                    .body(Collections.singletonMap("error", e.getReason()));
        } catch (Exception e) {
            // ✅ Log de connexion échouée - erreur système
            logAuthAttemptSafely(request.email(), httpRequest, "FAILURE", "SYSTEM_ERROR", requestId);
            
            return ResponseEntity.internalServerError()
                    .body(Collections.singletonMap("error", "Erreur d'authentification"));
        }
    }

    // ✅ NOUVELLE MÉTHODE: Génère un ID unique basé sur les paramètres de la requête
    private String generateRequestId(String email, HttpServletRequest request) {
        String userAgent = request.getHeader("User-Agent");
        String ipAddress = getClientIpAddress(request);
        long timestamp = System.currentTimeMillis() / 30000; // Fenêtre de 30 secondes
        
        return String.valueOf(
            (email + ipAddress + userAgent + timestamp).hashCode()
        );
    }

    // ✅ MÉTHODE MODIFIÉE: Logging sécurisé contre les doublons
    private void logAuthAttemptSafely(String email, HttpServletRequest request, String status, String failureReason, String requestId) {
        try {
            // ✅ SOLUTION 2: Vérifier si un log similaire existe déjà récemment
            LocalDateTime recentTime = LocalDateTime.now().minusSeconds(30);
            String ipAddress = getClientIpAddress(request);
            
            // Vérifier s'il existe déjà un log similaire dans les 30 dernières secondes
            boolean duplicateExists = loginLogRepository.existsByUsernameAndIpAddressAndStatusAndLoginTimeAfter(
                email != null ? email : "UNKNOWN",
                ipAddress,
                status,
                recentTime
            );
            
            // ✅ Ne pas créer de log si un doublon récent existe
            if (duplicateExists) {
                System.out.println("Duplicate login attempt detected - skipping log creation");
                return;
            }
            
            // Créer le log normalement
            LoginLog log = new LoginLog();
            log.setUsername(email != null ? email : "UNKNOWN");
            log.setIpAddress(ipAddress);
            log.setLoginTime(LocalDateTime.now());
            log.setStatus(status);
            log.setUserAgent(request.getHeader("User-Agent"));
            log.setPath(request.getRequestURI());
            
            if (failureReason != null) {
                log.setFailureReason(failureReason);
            }
            
            loginLogRepository.save(log);
            
        } catch (Exception e) {
            // Ne pas faire échouer la requête si le logging échoue
            System.err.println("Failed to log auth attempt for user: " + email + " - " + e.getMessage());
        }
    }

    // ✅ MÉTHODE CONSERVÉE: Détermine la raison de l'échec selon le message d'erreur
    private String determineFailureReason(String errorMessage) {
        if (errorMessage == null) return "UNKNOWN_ERROR";
        
        String lowerError = errorMessage.toLowerCase();
        
        if (lowerError.contains("credentials") || lowerError.contains("password") || lowerError.contains("username")) {
            return "INVALID_CREDENTIALS";
        } else if (lowerError.contains("disabled") || lowerError.contains("désactivé")) {
            return "ACCOUNT_DISABLED";
        } else if (lowerError.contains("locked") || lowerError.contains("verrouillé")) {
            return "ACCOUNT_LOCKED";
        } else if (lowerError.contains("pending") || lowerError.contains("attente")) {
            return "ACCOUNT_PENDING";
        } else if (lowerError.contains("suspended") || lowerError.contains("suspendu")) {
            return "ACCOUNT_SUSPENDED";
        } else {
            return "AUTH_FAILED";
        }
    }

    // ✅ MÉTHODE CONSERVÉE: Récupération de l'IP réelle du client
    private String getClientIpAddress(HttpServletRequest request) {
        // Vérifier les headers de proxy
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Prendre la première IP si plusieurs sont présentes
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        // Fallback sur l'IP directe
        return request.getRemoteAddr();
    }
}