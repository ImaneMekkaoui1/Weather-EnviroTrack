// CapteurRepository.java
package com.backend.demo.repository;

import com.backend.demo.entity.Capteur;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CapteurRepository extends JpaRepository<Capteur, Long> {
    // Méthodes personnalisées si nécessaires
}