package com.backend.demo.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration
@EnableScheduling
public class SchedulingConfig {
    // Configuration pour activer les tâches planifiées
    // avec @Scheduled dans le service AlertService
}