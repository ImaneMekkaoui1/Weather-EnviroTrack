package com.backend.demo.repository;

import com.backend.demo.entity.AccountStatus;
import com.backend.demo.entity.Role;
import com.backend.demo.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    boolean existsByEmail(String email);
    
    boolean existsByUsername(String username);
    
    Optional<User> findByEmail(String email);
    
    Optional<User> findByUsername(String username);
    
    List<User> findByStatus(AccountStatus status);
    
    // Méthodes additionnelles pour AdminService
    List<User> findByRole(Role role);
    
    @Query("SELECT COUNT(u) FROM User u WHERE u.role = :role")
    long countByRole(@Param("role") Role role);
    
    @Query("SELECT u FROM User u WHERE u.status = :status AND u.role = :role")
    List<User> findByStatusAndRole(@Param("status") AccountStatus status, @Param("role") Role role);
    
    // Méthodes de recherche avancée
    @Query("SELECT u FROM User u WHERE u.username LIKE %:keyword% OR u.email LIKE %:keyword%")
    List<User> findByUsernameContainingOrEmailContaining(@Param("keyword") String keyword);
    
    @Query("SELECT u FROM User u WHERE u.status IN :statuses")
    List<User> findByStatusIn(@Param("statuses") List<AccountStatus> statuses);
}