package com.backend.demo.Config;

import com.backend.demo.entity.AccountStatus;
import com.backend.demo.entity.Role;
import com.backend.demo.entity.User;
import com.backend.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public DataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // Ajouter l'utilisateur admin s'il n'existe pas
        if (!userRepository.existsByEmail("ImaneMekkaoui@gmail.com")) {
            User admin = new User();
            admin.setUsername("ImaneMekkaoui");
            admin.setEmail("ImaneMekkaoui@gmail.com");
            admin.setPassword(passwordEncoder.encode("ImaneMekkaoui"));
            admin.setRole(Role.ADMIN);
            admin.setStatus(AccountStatus.ACTIVE); // Important: L'administrateur doit être actif
            admin.setCreated_at(LocalDateTime.now());
            admin.setUpdated_at(LocalDateTime.now());
            
            userRepository.save(admin);
            System.out.println("Utilisateur admin créé avec succès");
        }
    }
}