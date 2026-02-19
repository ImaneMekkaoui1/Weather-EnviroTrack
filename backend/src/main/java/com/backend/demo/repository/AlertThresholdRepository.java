package com.backend.demo.repository;

import com.backend.demo.entity.AlertThreshold;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AlertThresholdRepository extends JpaRepository<AlertThreshold, Long> {
    Optional<AlertThreshold> findByParameter(String parameter);
}