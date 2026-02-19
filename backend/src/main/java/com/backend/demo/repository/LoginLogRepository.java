package com.backend.demo.repository;

import com.backend.demo.entity.LoginLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface LoginLogRepository extends JpaRepository<LoginLog, Long> {

    // ===============================
    // REQUÊTES DE BASE
    // ===============================
    
    /**
     * Trouver tous les logs d'un utilisateur spécifique, triés par date décroissante
     */
    List<LoginLog> findByUsernameOrderByLoginTimeDesc(String username);
    
    /**
     * Trouver tous les logs d'un utilisateur avec pagination
     */
    Page<LoginLog> findByUsernameOrderByLoginTimeDesc(String username, Pageable pageable);
    
    /**
     * Trouver les logs par adresse IP
     */
    List<LoginLog> findByIpAddressOrderByLoginTimeDesc(String ipAddress);
    
    /**
     * Trouver les logs par statut (SUCCESS, FAILURE)
     */
    List<LoginLog> findByStatusOrderByLoginTimeDesc(String status);
    
    /**
     * Trouver les logs par statut avec pagination
     */
    Page<LoginLog> findByStatusOrderByLoginTimeDesc(String status, Pageable pageable);

    // ===============================
    // REQUÊTES PAR PÉRIODE
    // ===============================
    
    /**
     * Trouver les logs entre deux dates
     */
    @Query("SELECT l FROM LoginLog l WHERE l.loginTime BETWEEN :startDate AND :endDate ORDER BY l.loginTime DESC")
    List<LoginLog> findByLoginTimeBetween(@Param("startDate") LocalDateTime startDate, 
                                         @Param("endDate") LocalDateTime endDate);
    
    /**
     * Trouver les logs d'aujourd'hui
     */
    @Query("SELECT l FROM LoginLog l WHERE DATE(l.loginTime) = CURRENT_DATE ORDER BY l.loginTime DESC")
    List<LoginLog> findTodayLogs();
    
    /**
     * Trouver les logs des 7 derniers jours
     */
    @Query("SELECT l FROM LoginLog l WHERE l.loginTime >= :sevenDaysAgo ORDER BY l.loginTime DESC")
    List<LoginLog> findLastSevenDaysLogs(@Param("sevenDaysAgo") LocalDateTime sevenDaysAgo);

    // ===============================
    // REQUÊTES DE SÉCURITÉ
    // ===============================
    
    /**
     * Compter les tentatives échouées pour une IP dans une période donnée
     */
    @Query("SELECT COUNT(l) FROM LoginLog l WHERE l.ipAddress = :ipAddress AND l.status = 'FAILURE' AND l.loginTime >= :since")
    Long countFailedAttemptsByIpSince(@Param("ipAddress") String ipAddress, @Param("since") LocalDateTime since);
    
    /**
     * Compter les tentatives échouées pour un utilisateur dans une période donnée
     */
    @Query("SELECT COUNT(l) FROM LoginLog l WHERE l.username = :username AND l.status = 'FAILURE' AND l.loginTime >= :since")
    Long countFailedAttemptsByUserSince(@Param("username") String username, @Param("since") LocalDateTime since);
    
    /**
     * Trouver les IPs avec le plus de tentatives échouées
     */
    @Query("SELECT l.ipAddress, COUNT(l) as failureCount FROM LoginLog l WHERE l.status = 'FAILURE' AND l.loginTime >= :since GROUP BY l.ipAddress ORDER BY failureCount DESC")
    List<Object[]> findTopFailureIpAddresses(@Param("since") LocalDateTime since, Pageable pageable);
    
    /**
     * Trouver les dernières connexions réussies par utilisateur
     */
    @Query("SELECT l FROM LoginLog l WHERE l.username = :username AND l.status = 'SUCCESS' ORDER BY l.loginTime DESC")
    List<LoginLog> findSuccessfulLoginsByUser(@Param("username") String username, Pageable pageable);

    // ===============================
    // REQUÊTES DE STATISTIQUES
    // ===============================
    
    /**
     * Compter le nombre total de connexions réussies
     */
    @Query("SELECT COUNT(l) FROM LoginLog l WHERE l.status = 'SUCCESS'")
    Long countSuccessfulLogins();
    
    /**
     * Compter le nombre total de tentatives échouées
     */
    @Query("SELECT COUNT(l) FROM LoginLog l WHERE l.status = 'FAILURE'")
    Long countFailedLogins();
    
    /**
     * Compter les connexions par jour sur les 30 derniers jours
     */
    @Query("SELECT DATE(l.loginTime) as loginDate, COUNT(l) as loginCount FROM LoginLog l WHERE l.loginTime >= :thirtyDaysAgo GROUP BY DATE(l.loginTime) ORDER BY loginDate DESC")
    List<Object[]> getLoginCountByDayLast30Days(@Param("thirtyDaysAgo") LocalDateTime thirtyDaysAgo);
    
    /**
     * Obtenir les statistiques par statut
     */
    @Query("SELECT l.status, COUNT(l) FROM LoginLog l GROUP BY l.status")
    List<Object[]> getLoginStatsByStatus();
    
    /**
     * Compter les utilisateurs uniques connectés aujourd'hui
     */
    @Query("SELECT COUNT(DISTINCT l.username) FROM LoginLog l WHERE DATE(l.loginTime) = CURRENT_DATE AND l.status = 'SUCCESS'")
    Long countUniqueUsersToday();
    
    /**
     * Trouver les utilisateurs les plus actifs
     */
    @Query("SELECT l.username, COUNT(l) as loginCount FROM LoginLog l WHERE l.status = 'SUCCESS' AND l.loginTime >= :since GROUP BY l.username ORDER BY loginCount DESC")
    List<Object[]> findMostActiveUsers(@Param("since") LocalDateTime since, Pageable pageable);

    // ===============================
    // REQUÊTES DE NETTOYAGE
    // ===============================
    
    /**
     * Supprimer les logs plus anciens qu'une date donnée
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM LoginLog l WHERE l.loginTime < :cutoffDate")
    int deleteLogsOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    /**
     * Compter les logs plus anciens qu'une date donnée
     */
    @Query("SELECT COUNT(l) FROM LoginLog l WHERE l.loginTime < :cutoffDate")
    Long countLogsOlderThan(@Param("cutoffDate") LocalDateTime cutoffDate);

    // ===============================
    // REQUÊTES COMBINÉES
    // ===============================
    
    /**
     * Recherche avancée avec filtres multiples
     */
    @Query("SELECT l FROM LoginLog l WHERE " +
           "(:username IS NULL OR l.username LIKE %:username%) AND " +
           "(:ipAddress IS NULL OR l.ipAddress LIKE %:ipAddress%) AND " +
           "(:status IS NULL OR l.status = :status) AND " +
           "(:startDate IS NULL OR l.loginTime >= :startDate) AND " +
           "(:endDate IS NULL OR l.loginTime <= :endDate) " +
           "ORDER BY l.loginTime DESC")
    Page<LoginLog> findWithFilters(@Param("username") String username,
                                  @Param("ipAddress") String ipAddress,
                                  @Param("status") String status,
                                  @Param("startDate") LocalDateTime startDate,
                                  @Param("endDate") LocalDateTime endDate,
                                  Pageable pageable);
    
    /**
     * Trouver le dernier log de connexion réussie pour un utilisateur
     */
    @Query("SELECT l FROM LoginLog l WHERE l.username = :username AND l.status = 'SUCCESS' ORDER BY l.loginTime DESC LIMIT 1")
    Optional<LoginLog> findLastSuccessfulLogin(@Param("username") String username);
    
    /**
     * Vérifier si une IP est suspecte (plus de X tentatives échouées récentes)
     */
    @Query("SELECT CASE WHEN COUNT(l) >= :threshold THEN true ELSE false END FROM LoginLog l WHERE l.ipAddress = :ipAddress AND l.status = 'FAILURE' AND l.loginTime >= :since")
    Boolean isSuspiciousIp(@Param("ipAddress") String ipAddress, @Param("threshold") Long threshold, @Param("since") LocalDateTime since);

    // ===============================
    // REQUÊTES POUR RAPPORTS
    // ===============================
    
    /**
     * Rapport mensuel des connexions
     */
    @Query("SELECT YEAR(l.loginTime) as year, MONTH(l.loginTime) as month, COUNT(l) as loginCount " +
           "FROM LoginLog l WHERE l.loginTime >= :startDate " +
           "GROUP BY YEAR(l.loginTime), MONTH(l.loginTime) " +
           "ORDER BY year DESC, month DESC")
    List<Object[]> getMonthlyLoginReport(@Param("startDate") LocalDateTime startDate);
    
    /**
     * Rapport des heures de pointe
     */
    @Query("SELECT HOUR(l.loginTime) as hour, COUNT(l) as loginCount " +
           "FROM LoginLog l WHERE l.status = 'SUCCESS' AND l.loginTime >= :since " +
           "GROUP BY HOUR(l.loginTime) " +
           "ORDER BY loginCount DESC")
    List<Object[]> getPeakHoursReport(@Param("since") LocalDateTime since);


    boolean existsByUsernameAndIpAddressAndStatusAndLoginTimeAfter(
    String username, 
    String ipAddress, 
    String status, 
    LocalDateTime afterTime
);
 @Modifying
    @Transactional
    @Query("DELETE FROM LoginLog l WHERE l.id = :id")
    int deleteLogById(@Param("id") Long id);
    
    // Méthode pour vérifier l'existence d'un log
    boolean existsById(Long id);

    // Compter le nombre de logs par statut (générique)
    long countByStatus(String status);
}