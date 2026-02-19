package com.backend.demo.controller;

import com.backend.demo.entity.LoginLog;
import com.backend.demo.entity.Role;
import com.backend.demo.entity.User;
import com.backend.demo.repository.LoginLogRepository;
import com.backend.demo.service.AdminService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.core.io.InputStreamResource;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;
    
    // Ajout du repository pour les logs
    @Autowired
    private LoginLogRepository loginLogRepository;

    @Autowired
    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ===============================
    // GESTION DES UTILISATEURS (EXISTANT)
    // ===============================

    @GetMapping("/users")
    public ResponseEntity<List<User>> getAllUsers() {
        try {
            List<User> users = adminService.getAllUsers();
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/users/pending")
    public ResponseEntity<List<User>> getPendingUsers() {
        try {
            List<User> pendingUsers = adminService.getPendingUsers();
            return ResponseEntity.ok(pendingUsers);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @PutMapping("/users/{id}/approve")
    public ResponseEntity<User> approveUser(@PathVariable Long id) {
        try {
            User approvedUser = adminService.approveUser(id);
            return ResponseEntity.ok(approvedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/users/{id}/reject")
    public ResponseEntity<User> rejectUser(@PathVariable Long id) {
        try {
            User rejectedUser = adminService.rejectUser(id);
            return ResponseEntity.ok(rejectedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<User> changeUserRole(
            @PathVariable Long id,
            @RequestBody Map<String, String> roleRequest) {
        try {
            Role newRole = Role.valueOf(roleRequest.get("role").toUpperCase());
            User updatedUser = adminService.changeUserRole(id, newRole);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/users/{id}/suspend")
    public ResponseEntity<User> suspendUser(@PathVariable Long id) {
        try {
            User suspendedUser = adminService.suspendUser(id);
            return ResponseEntity.ok(suspendedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/users/{id}/deactivate")
    public ResponseEntity<User> deactivateUser(@PathVariable Long id) {
        try {
            User deactivatedUser = adminService.deactivateUser(id);
            return ResponseEntity.ok(deactivatedUser);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        try {
            adminService.deleteUser(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // ===============================
    // 🆕 GESTION DES LOGIN LOGS
    // ===============================

    /**
     * Récupérer tous les logs de connexion avec pagination
     */
    @GetMapping("/login-logs")
    public ResponseEntity<Page<LoginLog>> getLoginLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("loginTime").descending());
            Page<LoginLog> logs = loginLogRepository.findAll(pageable);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Recherche de logs avec filtres
     */
    @GetMapping("/login-logs/search")
    public ResponseEntity<Page<LoginLog>> searchLoginLogs(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("loginTime").descending());
            
            // Conversion des dates si nécessaire
            LocalDateTime start = startDate != null ? LocalDateTime.parse(startDate) : null;
            LocalDateTime end = endDate != null ? LocalDateTime.parse(endDate) : null;
            
            Page<LoginLog> logs = loginLogRepository.findWithFilters(
                username, ipAddress, status, start, end, pageable);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Statistiques générales des connexions
     */
    @GetMapping("/login-logs/stats")
    public ResponseEntity<Map<String, Object>> getLoginStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            // Statistiques de base
            // On ne compte que les vraies tentatives de login (SUCCESS ou FAILURE)
            long totalLogins = loginLogRepository.countByStatus("SUCCESS") + loginLogRepository.countByStatus("FAILURE");
            stats.put("totalLogins", totalLogins);
            stats.put("successfulLogins", loginLogRepository.countSuccessfulLogins());
            stats.put("failedLogins", loginLogRepository.countFailedLogins());
            stats.put("uniqueUsersToday", loginLogRepository.countUniqueUsersToday());
            stats.put("todayLogs", loginLogRepository.findTodayLogs().size());
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Logs d'un utilisateur spécifique
     */
    @GetMapping("/login-logs/user/{username}")
    public ResponseEntity<Page<LoginLog>> getUserLogs(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<LoginLog> logs = loginLogRepository.findByUsernameOrderByLoginTimeDesc(username, pageable);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Logs d'aujourd'hui
     */
    @GetMapping("/login-logs/today")
    public ResponseEntity<List<LoginLog>> getTodayLogs() {
        try {
            List<LoginLog> todayLogs = loginLogRepository.findTodayLogs();
            return ResponseEntity.ok(todayLogs);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * IPs suspectes (plus de 5 tentatives échouées dans la dernière heure)
     */
    @GetMapping("/login-logs/security/suspicious-ips")
    public ResponseEntity<List<Object[]>> getSuspiciousIps() {
        try {
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            Pageable limit = PageRequest.of(0, 10);
            List<Object[]> suspiciousIps = loginLogRepository.findTopFailureIpAddresses(oneHourAgo, limit);
            return ResponseEntity.ok(suspiciousIps);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Tentatives d'échec récentes
     */
    @GetMapping("/login-logs/security/recent-failures")
    public ResponseEntity<List<LoginLog>> getRecentFailures(
            @RequestParam(defaultValue = "24") int hours) {
        try {
            LocalDateTime since = LocalDateTime.now().minusHours(hours);
            List<LoginLog> failures = loginLogRepository.findByLoginTimeBetween(since, LocalDateTime.now())
                .stream()
                .filter(log -> "FAILURE".equals(log.getStatus()))
                .toList();
            return ResponseEntity.ok(failures);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Utilisateurs les plus actifs
     */
    @GetMapping("/login-logs/stats/active-users")
    public ResponseEntity<List<Object[]>> getMostActiveUsers(
            @RequestParam(defaultValue = "10") int limit) {
        try {
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            Pageable pageable = PageRequest.of(0, limit);
            List<Object[]> activeUsers = loginLogRepository.findMostActiveUsers(sevenDaysAgo, pageable);
            return ResponseEntity.ok(activeUsers);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Statistiques par jour (30 derniers jours)
     */
    @GetMapping("/login-logs/stats/daily")
    public ResponseEntity<List<Object[]>> getDailyStats() {
        try {
            LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
            List<Object[]> dailyStats = loginLogRepository.getLoginCountByDayLast30Days(thirtyDaysAgo);
            return ResponseEntity.ok(dailyStats);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Nettoyage des anciens logs
     */
    @DeleteMapping("/login-logs/cleanup")
    public ResponseEntity<Map<String, Object>> cleanupOldLogs(
            @RequestParam(defaultValue = "90") int daysToKeep) {
        try {
            LocalDateTime cutoffDate = LocalDateTime.now().minusDays(daysToKeep);
            
            // Compter avant suppression
            Long countBefore = loginLogRepository.countLogsOlderThan(cutoffDate);
            
            // Supprimer
            int deletedCount = loginLogRepository.deleteLogsOlderThan(cutoffDate);
            
            Map<String, Object> result = new HashMap<>();
            result.put("deletedCount", deletedCount);
            result.put("daysKept", daysToKeep);
            result.put("cutoffDate", cutoffDate);
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
   @DeleteMapping("/login-logs/{id}")
public ResponseEntity<Map<String, Object>> deleteLog(@PathVariable Long id) {
    System.out.println("=== SUPPRESSION LOG ===");
    System.out.println("ID reçu: " + id);
    System.out.println("Type: " + id.getClass().getSimpleName());
    
    try {
        boolean exists = loginLogRepository.existsById(id);
        System.out.println("Log existe: " + exists);
        
        if (!exists) {
            System.out.println("Log non trouvé pour ID: " + id);
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Log non trouvé");
            return ResponseEntity.ok(response);
        }
        
        loginLogRepository.deleteById(id);
        System.out.println("Suppression effectuée pour ID: " + id);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Log supprimé avec succès");
        return ResponseEntity.ok(response);
        
    } catch (Exception e) {
        System.out.println("Erreur suppression: " + e.getMessage());
        e.printStackTrace();
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Erreur: " + e.getMessage());
        return ResponseEntity.internalServerError().body(response);
    }
}

    /**
     * Export CSV des logs filtrés
     */
    @GetMapping("/login-logs/export/csv")
    public ResponseEntity<InputStreamResource> exportLoginLogsCsv(
            @RequestParam(required = false) String username,
            @RequestParam(required = false) String ipAddress,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        try {
            // Récupérer les logs filtrés
            List<LoginLog> logs = loginLogRepository.findWithFilters(
                username, ipAddress, status, 
                startDate != null ? LocalDateTime.parse(startDate) : null,
                endDate != null ? LocalDateTime.parse(endDate) : null,
                PageRequest.of(0, Integer.MAX_VALUE, Sort.by("loginTime").descending())
            ).getContent();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            PrintWriter writer = new PrintWriter(out);
            // En-tête CSV
            writer.println("ID,Username,IP Address,Login Time,Status,User Agent,Path,Failure Reason");
            for (LoginLog log : logs) {
                writer.printf("%d,%s,%s,%s,%s,%s,%s,%s\n",
                    log.getId(),
                    escapeCsv(log.getUsername()),
                    escapeCsv(log.getIpAddress()),
                    log.getLoginTime(),
                    log.getStatus(),
                    escapeCsv(log.getUserAgent()),
                    escapeCsv(log.getPath()),
                    escapeCsv(log.getFailureReason())
                );
            }
            writer.flush();
            ByteArrayInputStream in = new ByteArrayInputStream(out.toByteArray());
            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Disposition", "attachment; filename=login-logs.csv");
            return ResponseEntity.ok()
                    .headers(headers)
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(new InputStreamResource(in));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    // Utilitaire pour échapper les virgules dans le CSV
    private String escapeCsv(String value) {
        if (value == null) return "";
        return value.replace(",", " ").replace("\n", " ").replace("\r", " ");
    }
}