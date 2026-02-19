package com.backend.demo.security;

import com.backend.demo.entity.LoginLog;
import com.backend.demo.repository.LoginLogRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final List<String> EXCLUDED_PATHS = Arrays.asList(
        "/api/auth/register",
        "/api/auth/login",
        "/api/auth/password/forgot",
        "/api/auth/password/reset", 
        "/api/auth/password/validate-token",
        "/api/weather/",
        "/api/weather-api/", 
        "/api/airquality",
        "/api/capteurs/current",
        "/api/alerts",
        "/api/alerts/thresholds",
        "/api/alerts/recalculate",
        "/ws-mqtt",
        "/ws",
        "/topic",
        "/app"
    );

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;
    
    @Autowired
    private LoginLogRepository loginLogRepository;

    @Autowired
    public JwtAuthenticationFilter(JwtTokenProvider tokenProvider, UserDetailsService userDetailsService) {
        this.tokenProvider = tokenProvider;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        if (shouldNotFilter(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String jwt = getJwtFromRequest(request);
            if (jwt != null) {
                System.out.println("[JwtAuthenticationFilter] Token reçu: " + jwt);
            }
            if (jwt != null && tokenProvider.validateToken(jwt)) {
                String username = tokenProvider.getUsernameFromToken(jwt);
                System.out.println("[JwtAuthenticationFilter] Token valide, username: " + username);
                UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                    userDetails,
                    null,
                    userDetails.getAuthorities()
                );
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
                
                // ✅ MODIFIÉ : Logger seulement les accès aux endpoints sensibles (admin, etc.)
                if (isSensitiveEndpoint(request)) {
                    logSuccessfulAccess(username, request);
                }
                
            } else if (jwt != null) {
                System.out.println("[JwtAuthenticationFilter] Token invalide !");
                // ✅ MODIFIÉ : Logger les tentatives avec token invalide seulement sur endpoints sensibles
                if (isSensitiveEndpoint(request)) {
                    logFailedAccess("UNKNOWN", request, "INVALID_TOKEN");
                }
            }
        } catch (Exception e) {
            logger.error("Could not set user authentication in security context", e);
            // ✅ MODIFIÉ : Logger les erreurs d'authentification seulement sur endpoints sensibles
            if (isSensitiveEndpoint(request)) {
                logFailedAccess("UNKNOWN", request, "AUTH_ERROR");
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        
        if (EXCLUDED_PATHS.stream().anyMatch(excludedPath -> path.startsWith(excludedPath))) {
            return true;
        }
        
        if (path.equals("/api/capteurs") && method.equals("GET")) {
            return true;
        }
        
        return false;
    }

    // ✅ NOUVELLE MÉTHODE : Détermine si l'endpoint est sensible et mérite un log
    private boolean isSensitiveEndpoint(HttpServletRequest request) {
        String path = request.getRequestURI();
        String method = request.getMethod();
        // Logger les accès aux endpoints d'administration SAUF consultation des logs
        if (path.startsWith("/api/admin/login-logs") && method.equals("GET")) {
            // Ne pas logger les accès GET sur les logs
            return false;
        }
        if (path.startsWith("/api/admin")) {
            return true;
        }
        // Logger les accès aux endpoints de gestion des utilisateurs
        if (path.startsWith("/api/users") && !method.equals("GET")) {
            return true;
        }
        // Logger les accès aux endpoints de configuration système
        if (path.startsWith("/api/config") || path.startsWith("/api/settings")) {
            return true;
        }
        // Ajouter d'autres endpoints sensibles selon vos besoins
        return false;
    }

    private String getJwtFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }

    // ✅ MÉTHODES DE LOGGING CONSERVÉES
    private void logSuccessfulAccess(String username, HttpServletRequest request) {
        try {
            LoginLog log = new LoginLog();
            log.setUsername(username);
            log.setIpAddress(getClientIpAddress(request));
            log.setLoginTime(LocalDateTime.now());
            log.setStatus("ACCESS_SUCCESS"); // ✅ MODIFIÉ : Différencier du login
            log.setUserAgent(request.getHeader("User-Agent"));
            log.setPath(request.getRequestURI());
            
            loginLogRepository.save(log);
        } catch (Exception e) {
            logger.warn("Failed to log successful access for user: " + username, e);
        }
    }
    
    private void logFailedAccess(String username, HttpServletRequest request, String reason) {
        try {
            LoginLog log = new LoginLog();
            log.setUsername(username);
            log.setIpAddress(getClientIpAddress(request));
            log.setLoginTime(LocalDateTime.now());
            log.setStatus("ACCESS_FAILURE"); // ✅ MODIFIÉ : Différencier du login
            log.setUserAgent(request.getHeader("User-Agent"));
            log.setPath(request.getRequestURI());
            log.setFailureReason(reason);
            
            loginLogRepository.save(log);
        } catch (Exception e) {
            logger.warn("Failed to log failed access attempt", e);
        }
    }
    
    private String getClientIpAddress(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        
        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isEmpty()) {
            return xRealIp;
        }
        
        return request.getRemoteAddr();
    }
}