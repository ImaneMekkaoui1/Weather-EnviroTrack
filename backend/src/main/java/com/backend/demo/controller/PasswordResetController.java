package com.backend.demo.controller;

import com.backend.demo.dto.ForgotPasswordRequest;
import com.backend.demo.dto.PasswordResetRequest;
import com.backend.demo.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/password")
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    @Autowired
    public PasswordResetController(PasswordResetService passwordResetService) {
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(
            @RequestBody @Valid ForgotPasswordRequest request) {
        passwordResetService.createPasswordResetTokenForUser(request.email());
        return ResponseEntity.ok(Map.of(
            "message", "Un email a été envoyé avec les instructions de réinitialisation"
        ));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetPassword(
            @RequestBody @Valid PasswordResetRequest request) {
        passwordResetService.validateTokenAndResetPassword(request.token(), request.password());
        return ResponseEntity.ok(Map.of(
            "message", "Mot de passe réinitialisé avec succès"
        ));
    }

    @GetMapping("/validate-token")
    public ResponseEntity<Map<String, Boolean>> validateToken(
            @RequestParam("token") String token) {
        boolean isValid = passwordResetService.validateToken(token);
        return ResponseEntity.ok(Map.of("valid", isValid));
    }
}