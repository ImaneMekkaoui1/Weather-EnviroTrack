package com.backend.demo.repository;

import com.backend.demo.entity.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, Long> {
    
    // Récupération des alertes par ordre décroissant de date
    List<Alert> findByOrderByTimestampDesc();
    
    // Récupération des alertes par sévérité
    List<Alert> findBySeverityOrderByTimestampDesc(String severity);
    
    // Récupération des alertes par type (air ou weather)
    List<Alert> findByTypeOrderByTimestampDesc(String type);
    
    // Récupération des alertes par paramètre spécifique
    List<Alert> findByParameterOrderByTimestampDesc(String parameter);
    
    // Récupération des alertes entre deux dates
    List<Alert> findByTimestampBetweenOrderByTimestampDesc(Date startDate, Date endDate);
    
    // Recherche avancée combinant plusieurs critères
    @Query("SELECT a FROM Alert a WHERE " +
           "(:parameter IS NULL OR a.parameter = :parameter) AND " +
           "(:severity IS NULL OR a.severity = :severity) AND " +
           "(:type IS NULL OR a.type = :type) AND " +
           "(:startDate IS NULL OR a.timestamp >= :startDate) AND " +
           "(:endDate IS NULL OR a.timestamp <= :endDate) " +
           "ORDER BY a.timestamp DESC")
    List<Alert> findAlertsByFilters(
        @Param("parameter") String parameter,
        @Param("severity") String severity,
        @Param("type") String type,
        @Param("startDate") Date startDate,
        @Param("endDate") Date endDate
    );
    
    // Récupérer les alertes des dernières 24 heures
    @Query("SELECT a FROM Alert a WHERE a.timestamp >= :yesterday ORDER BY a.timestamp DESC")
    List<Alert> findAlertsFromLast24Hours(@Param("yesterday") Date yesterday);
    
    // Supprimer les alertes plus anciennes qu'une certaine date
    void deleteByTimestampBefore(Date date);
}