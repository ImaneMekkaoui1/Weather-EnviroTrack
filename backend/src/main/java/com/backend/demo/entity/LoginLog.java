package com.backend.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_logs")
public class LoginLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String username;
    
    @Column(name = "ip_address")
    private String ipAddress;
    
    @Column(name = "login_time")
    private LocalDateTime loginTime = LocalDateTime.now();
    
    @Column(name = "status")
    private String status; // SUCCESS, FAILURE
    
    // Champs additionnels pour plus d'informations
    @Column(name = "user_agent", length = 500)
    private String userAgent;
    
    @Column(name = "path")
    private String path;
    
    @Column(name = "failure_reason")
    private String failureReason;
    
    // ===============================
    // CONSTRUCTEURS
    // ===============================
    
    public LoginLog() {
        this.loginTime = LocalDateTime.now();
    }
    
    public LoginLog(String username, String ipAddress, String status) {
        this();
        this.username = username;
        this.ipAddress = ipAddress;
        this.status = status;
    }
    
    // ===============================
    // GETTERS ET SETTERS
    // ===============================
    
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getUsername() {
        return username;
    }
    
    public void setUsername(String username) {
        this.username = username;
    }
    
    public String getIpAddress() {
        return ipAddress;
    }
    
    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }
    
    public LocalDateTime getLoginTime() {
        return loginTime;
    }
    
    public void setLoginTime(LocalDateTime loginTime) {
        this.loginTime = loginTime;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public String getUserAgent() {
        return userAgent;
    }
    
    public void setUserAgent(String userAgent) {
        this.userAgent = userAgent;
    }
    
    public String getPath() {
        return path;
    }
    
    public void setPath(String path) {
        this.path = path;
    }
    
    public String getFailureReason() {
        return failureReason;
    }
    
    public void setFailureReason(String failureReason) {
        this.failureReason = failureReason;
    }
    
    // ===============================
    // MÉTHODES UTILITAIRES
    // ===============================
    
    public boolean isSuccessful() {
        return "SUCCESS".equals(this.status);
    }
    
    public boolean isFailed() {
        return "FAILURE".equals(this.status);
    }
    
    // ===============================
    // toString, equals, hashCode
    // ===============================
    
    @Override
    public String toString() {
        return "LoginLog{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", ipAddress='" + ipAddress + '\'' +
                ", loginTime=" + loginTime +
                ", status='" + status + '\'' +
                '}';
    }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof LoginLog)) return false;
        LoginLog loginLog = (LoginLog) o;
        return id != null && id.equals(loginLog.id);
    }
    
    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}