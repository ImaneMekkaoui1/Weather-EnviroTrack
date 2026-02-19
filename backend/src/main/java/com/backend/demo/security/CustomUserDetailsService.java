package com.backend.demo.security;

import com.backend.demo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Autowired
    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        return userRepository.findByEmail(usernameOrEmail) // Recherche d'abord par email
                .or(() -> userRepository.findByUsername(usernameOrEmail)) // Puis par username
                .map(UserPrincipal::create)
                .orElseThrow(() -> new UsernameNotFoundException(
                    "Utilisateur non trouvé avec l'identifiant: " + usernameOrEmail));
    }
}