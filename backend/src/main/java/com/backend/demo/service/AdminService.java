package com.backend.demo.service;

import com.backend.demo.entity.AccountStatus;
import com.backend.demo.entity.Role;
import com.backend.demo.entity.User;
import com.backend.demo.repository.NotificationRepository;
import com.backend.demo.repository.UserRepository;
import com.backend.demo.repository.NotificationPreferenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AdminService {

    private final UserRepository userRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private NotificationPreferenceRepository notificationPreferenceRepository;

    @Autowired
    public AdminService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getPendingUsers() {
        return userRepository.findAll().stream()
                .filter(user -> user.getStatus() == AccountStatus.PENDING && user.getRole() == Role.USER)
                .collect(Collectors.toList());
    }
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User approveUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot modify admin accounts");
        }
        
        user.setStatus(AccountStatus.ACTIVE);
        user.setUpdated_at(LocalDateTime.now());
        User savedUser = userRepository.save(user);
        
        // Notifier l'utilisateur que son compte a été approuvé
        notificationService.notifyUserAccountApproved(savedUser);
        
        return savedUser;
    }

    @Transactional
    public User rejectUser(Long id) {
        return rejectUser(id, null);
    }
    
    @Transactional
    public User rejectUser(Long id, String reason) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot modify admin accounts");
        }
        
        // Au lieu de supprimer l'utilisateur, on change son statut à REJECTED
        user.setStatus(AccountStatus.REJECTED);
        user.setUpdated_at(LocalDateTime.now());
        User savedUser = userRepository.save(user);
        
        // Notifier l'utilisateur que son compte a été rejeté
        notificationService.notifyUserAccountRejected(savedUser, reason);
        
        return savedUser;
    }
    
    @Transactional
    public User changeUserRole(Long id, Role newRole) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (user.getRole() == Role.ADMIN || newRole == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot change admin roles");
        }
        
        user.setRole(newRole);
        user.setUpdated_at(LocalDateTime.now());
        return userRepository.save(user);
    }
    
    @Transactional
    public User suspendUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot suspend admin accounts");
        }
        
        user.setStatus(AccountStatus.REJECTED);
        user.setUpdated_at(LocalDateTime.now());
        return userRepository.save(user);
    }

    @Transactional
    public User deactivateUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        
        if (user.getRole() == Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot deactivate admin accounts");
        }
        
        user.setStatus(AccountStatus.INACTIVE);
        user.setUpdated_at(LocalDateTime.now());
        return userRepository.save(user);
    }

    /**
     * Supprimer un utilisateur avec notification asynchrone et nettoyage optimisé
     */
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found with ID: " + id));
        // Vérifications de sécurité avant suppression
        if (user.getRole() == Role.ADMIN) {
            long adminCount = userRepository.findAll().stream()
                    .filter(u -> u.getRole() == Role.ADMIN)
                    .count();
            if (adminCount <= 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "Cannot delete the last administrator account");
            }
        }
        // 1. Envoyer la notification par email de manière ASYNCHRONE
        try {
            notificationService.notifyUserAccountDeletedAsync(user);
        } catch (Exception e) {
            System.err.println("Error sending deletion notification: " + e.getMessage());
        }
        // 2. Supprimer toutes les notifications et préférences de notification
        try {
            notificationRepository.deleteByUserId(id);
            notificationPreferenceRepository.deleteByUser(user);
        } catch (Exception e) {
            System.err.println("Error deleting user dependencies: " + e.getMessage());
        }
        // 3. Suppression physique de l'utilisateur
        userRepository.deleteById(id);
    }
}