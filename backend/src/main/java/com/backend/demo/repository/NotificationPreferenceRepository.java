// src/main/java/com/backend/demo/repository/NotificationPreferenceRepository.java
package com.backend.demo.repository;

import com.backend.demo.entity.NotificationPreference;
import com.backend.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface NotificationPreferenceRepository extends JpaRepository<NotificationPreference, Long> {
    Optional<NotificationPreference> findByUser(User user);
    boolean existsByUser(User user);
    void deleteByUser(User user);
}