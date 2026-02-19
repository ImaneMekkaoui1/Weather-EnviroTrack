package com.backend.demo.repository;

import com.backend.demo.entity.Notification;
import com.backend.demo.entity.NotificationStatus;
import com.backend.demo.entity.NotificationType;
import com.backend.demo.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    
    // Récupérer les notifications d'un utilisateur
    Page<Notification> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    
    // Compter les notifications non lues d'un utilisateur
    long countByUserAndStatus(User user, NotificationStatus status);
    
    // Récupérer les notifications non lues d'un utilisateur
    List<Notification> findByUserAndStatusOrderByCreatedAtDesc(User user, NotificationStatus status);
    
    // Récupérer les notifications par type
    Page<Notification> findByUserAndTypeOrderByCreatedAtDesc(User user, NotificationType type, Pageable pageable);
    
    // Marquer toutes les notifications d'un utilisateur comme lues
    @Modifying
    @Query("UPDATE Notification n SET n.status = :status, n.readAt = :readAt WHERE n.user = :user AND n.status = :currentStatus")
    int markAllAsReadForUser(@Param("user") User user, @Param("status") NotificationStatus status,
                             @Param("readAt") LocalDateTime readAt, @Param("currentStatus") NotificationStatus currentStatus);
    
    // Supprimer les anciennes notifications
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.createdAt < :cutoffDate")
    int deleteOldNotifications(@Param("cutoffDate") LocalDateTime cutoffDate);
    
    // Récupérer les notifications récentes (dernières 24h)
    @Query("SELECT n FROM Notification n WHERE n.user = :user AND n.createdAt >= :since ORDER BY n.createdAt DESC")
    List<Notification> findRecentNotifications(@Param("user") User user, @Param("since") LocalDateTime since);
    
    // Rechercher par titre ou message
    @Query("SELECT n FROM Notification n WHERE n.user = :user AND (LOWER(n.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(n.message) LIKE LOWER(CONCAT('%', :keyword, '%'))) ORDER BY n.createdAt DESC")
    Page<Notification> searchNotifications(@Param("user") User user, @Param("keyword") String keyword, Pageable pageable);
    
    // Récupérer les notifications par ID utilisateur
    List<Notification> findByUserIdOrderByCreatedAtDesc(Long userId);
    
    // Compter les notifications non lues par ID utilisateur
    @Query("SELECT COUNT(n) FROM Notification n WHERE n.user.id = :userId AND n.status = 'UNREAD'")
    int countByUserIdAndUnread(@Param("userId") Long userId);
    
    // Supprimer toutes les notifications d'un utilisateur (AJOUTÉ pour la suppression d'utilisateur)
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user = :user")
    void deleteByUser(@Param("user") User user);
    
    // Alternative : Supprimer par ID utilisateur
    @Modifying
    @Query("DELETE FROM Notification n WHERE n.user.id = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}