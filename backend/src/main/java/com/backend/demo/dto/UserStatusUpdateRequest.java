package com.backend.demo.dto;

import com.backend.demo.entity.AccountStatus;

public class UserStatusUpdateRequest {
    private AccountStatus status;

    // Constructeurs
    public UserStatusUpdateRequest() {
    }

    public UserStatusUpdateRequest(AccountStatus status) {
        this.status = status;
    }

    // Getters et setters
    public AccountStatus getStatus() {
        return status;
    }

    public void setStatus(AccountStatus status) {
        this.status = status;
    }
}