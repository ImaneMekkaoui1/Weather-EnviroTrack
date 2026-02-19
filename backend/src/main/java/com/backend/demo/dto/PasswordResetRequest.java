package com.backend.demo.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PasswordResetRequest(
        @NotBlank(message = "Le jeton est obligatoire")
        String token,
        
        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 6, max = 100, message = "Le mot de passe doit contenir entre 6 et 100 caractères")
        String password
) {
}