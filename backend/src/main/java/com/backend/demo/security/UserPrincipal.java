package com.backend.demo.security;

import com.backend.demo.entity.AccountStatus;
import com.backend.demo.entity.Role;
import com.backend.demo.entity.User;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class UserPrincipal implements UserDetails {
    
    private final Long id;
    private final String username;
    private final String email;
    private final String password;
    private final Role role;
    private final AccountStatus status;
    
    public UserPrincipal(Long id, String username, String email, String password, Role role, AccountStatus status) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.password = password;
        this.role = role;
        this.status = status;
    }
    
    public static UserPrincipal create(User user) {
        if (user == null) {
            throw new IllegalArgumentException("User cannot be null");
        }
        
        return new UserPrincipal(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getPassword(),
            user.getRole() != null ? user.getRole() : Role.USER,
            user.getStatus() != null ? user.getStatus() : AccountStatus.PENDING
        );
    }
    
    public Long getId() {
        return id;
    }
    
    public String getEmail() {
        return email;
    }
    
    public Role getRole() {
        return role;
    }
    
    @Override
    public String getUsername() {
        return username;
    }
    
    @Override
    public String getPassword() {
        return password;
    }
    
    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(
            new SimpleGrantedAuthority("ROLE_" + role.name())
        );
    }
    
    @Override
    public boolean isAccountNonExpired() {
        return true;
    }
    
    @Override
    public boolean isAccountNonLocked() {
        return status != AccountStatus.REJECTED;
    }
    
    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }
    
    @Override
    public boolean isEnabled() {
        // Permettre la connexion si admin OU si le compte est activé
        return role == Role.ADMIN || status == AccountStatus.ACTIVE;
    }
}