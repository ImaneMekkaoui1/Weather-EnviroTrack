package com.backend.demo.service;

import com.backend.demo.dto.RegisterRequest;
import com.backend.demo.dto.UpdateUserRequest;
import com.backend.demo.dto.UserStatusUpdateRequest;
import com.backend.demo.entity.AccountStatus;
import com.backend.demo.entity.Role;
import com.backend.demo.entity.User;
import com.backend.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

@Service
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    public List<User> getPendingUsers() {
        return userRepository.findByStatus(AccountStatus.PENDING);
    }
    
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }
    
    // Méthode ajoutée pour corriger l'erreur dans NotificationController
    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
    
    // Méthode ajoutée pour corriger l'erreur dans NotificationWebSocketController
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
    
    @Transactional
    public User createUser(RegisterRequest registerRequest) {
        if (userRepository.existsByEmail(registerRequest.email())) {
            throw new IllegalStateException("Email already in use");
        }
        if (userRepository.existsByUsername(registerRequest.username())) {
            throw new IllegalStateException("Username already taken");
        }
        
        User user = new User();
        user.setUsername(registerRequest.username());
        user.setEmail(registerRequest.email());
        user.setPassword(passwordEncoder.encode(registerRequest.password()));
        user.setRole(Role.USER);
        user.setStatus(AccountStatus.PENDING);
        user.setCreated_at(LocalDateTime.now());
        user.setUpdated_at(LocalDateTime.now());
        
        return userRepository.save(user);
    }
    
    @Transactional
    public User updateUser(Long id, UpdateUserRequest updateRequest) {
        return userRepository.findById(id)
                .map(user -> {
                    if (updateRequest.getUsername() != null && 
                        !updateRequest.getUsername().equals(user.getUsername())) {
                        
                        if (userRepository.existsByUsername(updateRequest.getUsername())) {
                            throw new IllegalStateException("Username already taken");
                        }
                        user.setUsername(updateRequest.getUsername());
                    }
                    
                    if (updateRequest.getEmail() != null && 
                        !updateRequest.getEmail().equals(user.getEmail())) {
                        
                        if (userRepository.existsByEmail(updateRequest.getEmail())) {
                            throw new IllegalStateException("Email already in use");
                        }
                        user.setEmail(updateRequest.getEmail());
                    }
                    
                    if (updateRequest.getPassword() != null) {
                        user.setPassword(passwordEncoder.encode(updateRequest.getPassword()));
                    }
                    
                    user.setUpdated_at(LocalDateTime.now());
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new IllegalStateException("User not found"));
    }
    
    @Transactional
    public User updateUserStatus(Long id, UserStatusUpdateRequest statusRequest) {
        return userRepository.findById(id)
                .map(user -> {
                    user.setStatus(statusRequest.getStatus());
                    user.setUpdated_at(LocalDateTime.now());
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
    
    @Transactional
    public User approveUser(Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    if (user.getStatus() != AccountStatus.PENDING) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                            "Only pending users can be approved");
                    }
                    user.setStatus(AccountStatus.ACTIVE);
                    user.setUpdated_at(LocalDateTime.now());
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
    
    @Transactional
    public User rejectUser(Long id) {
        return userRepository.findById(id)
                .map(user -> {
                    if (user.getStatus() != AccountStatus.PENDING) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                            "Only pending users can be rejected");
                    }
                    user.setStatus(AccountStatus.REJECTED);
                    user.setUpdated_at(LocalDateTime.now());
                    return userRepository.save(user);
                })
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }
    
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalStateException("User not found");
        }
        userRepository.deleteById(id);
    }

    public User getUserFromAuthentication(Authentication authentication) {
        String identifier = authentication.getName();
        // Essayer d'abord par email, puis par username
        return userRepository.findByEmail(identifier)
                .or(() -> userRepository.findByUsername(identifier))
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}