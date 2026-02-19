package com.backend.demo.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
@RestController
@RequestMapping("/api/debug")
public class DebugController {
    
    @GetMapping("/auth-info")
    public ResponseEntity<?> getAuthInfo(Authentication authentication) {
        if (authentication == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("error", "No authentication found"));
        }
        
        Map<String, Object> authInfo = new HashMap<>();
        authInfo.put("authenticated", authentication.isAuthenticated());
        authInfo.put("principal", authentication.getPrincipal().toString());
        authInfo.put("authorities", authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList()));
            
        return ResponseEntity.ok(authInfo);
    }
}
