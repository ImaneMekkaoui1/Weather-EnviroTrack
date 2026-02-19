package com.backend.demo.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.scheduling.annotation.Async;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// Ajoutez ces imports
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender emailSender;
        
    @Value("${spring.mail.username}")
    private String fromEmail;
        
    @Value("${app.frontend.url}")
    private String frontendUrl;
        
    @Autowired
    public EmailService(JavaMailSender emailSender) {
        this.emailSender = emailSender;
    }

    public void sendSimpleMessage(String to, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            emailSender.send(message);
            logger.info("Email sent successfully to: {}", to);
        } catch (Exception e) {
            logger.error("Failed to send email: {}", e.getMessage());
            throw new RuntimeException("Erreur lors de l'envoi de l'email: " + e.getMessage(), e);
        }
    }
        
    public void sendPasswordResetEmail(String email, String token) {
        String subject = "Réinitialisation de votre mot de passe";
        String resetUrl = frontendUrl + "/auth/reset-password?token=" + token;
                
        String message = "<html><body>"
                + "<h2>Réinitialisation de mot de passe</h2>"
                + "<p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le lien ci-dessous pour continuer :</p>"
                + "<p><a href=\"" + resetUrl + "\">Réinitialiser mon mot de passe</a></p>"
                + "<p>Si vous n'avez pas fait cette demande, veuillez ignorer cet email.</p>"
                + "<p>Ce lien expirera dans 24 heures.</p>"
                + "</body></html>";

        try {
            MimeMessage mimeMessage = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "utf-8");
            helper.setText(message, true);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setFrom(fromEmail);
            emailSender.send(mimeMessage);
            logger.info("Password reset email sent to: {}", email);
        } catch (MessagingException e) {
            logger.error("Failed to send password reset email", e);
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    // ===== NOUVELLES MÉTHODES POUR LES NOTIFICATIONS =====
    
    /**
     * Envoyer un email de notification générique
     */
    @Async
    public void sendNotificationEmail(String to, String title, String message) {
        try {
            MimeMessage mimeMessage = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(title);
            
            String htmlContent = buildNotificationEmailTemplate(title, message);
            helper.setText(htmlContent, true);
            
            emailSender.send(mimeMessage);
            logger.info("Email de notification envoyé à: {}", to);
            
        } catch (Exception e) {
            logger.error("Erreur lors de l'envoi d'email de notification à {}: ", to, e);
        }
    }
    
    /**
     * Envoyer un email de validation de compte à l'admin
     */
    @Async
    public void sendAccountValidationEmailToAdmin(String adminEmail, String userName, String userEmail) {
        String subject = "Nouveau compte à valider - " + userName;
        String message = String.format(
            "Bonjour,\n\n" +
            "Un nouvel utilisateur a créé un compte sur l'application météo :\n\n" +
            "Nom: %s\n" +
            "Email: %s\n\n" +
            "Veuillez vous connecter à l'interface d'administration pour valider ce compte.\n\n" +
            "Lien d'administration: %s/admin/users\n\n" +
            "Cordialement,\n" +
            "L'équipe Météo App",
            userName, userEmail, frontendUrl
        );
        
        sendSimpleMessage(adminEmail, subject, message);
    }
    
    /**
     * Envoyer un email de confirmation d'approbation
     */
    @Async
    public void sendAccountApprovedEmail(String userEmail, String userName) {
        String subject = "Compte approuvé - Météo App";
        String message = String.format(
            "Bonjour %s,\n\n" +
            "Félicitations ! Votre compte sur l'application Météo a été approuvé par l'administrateur.\n\n" +
            "Vous pouvez maintenant vous connecter et accéder à toutes les fonctionnalités de l'application.\n\n" +
            "Lien de connexion: %s/auth/login\n\n" +
            "Cordialement,\n" +
            "L'équipe Météo App",
            userName, frontendUrl
        );
        
        sendSimpleMessage(userEmail, subject, message);
    }
    
    /**
     * Envoyer un email de rejet de compte
     */
    @Async
    public void sendAccountRejectedEmail(String userEmail, String userName, String reason) {
        String subject = "Compte rejeté - Météo App";
        String message = String.format(
            "Bonjour %s,\n\n" +
            "Nous regretteons de vous informer que votre demande de compte sur l'application Météo a été rejetée.\n\n" +
            "%s\n\n" +
            "Si vous avez des questions, n'hésitez pas à nous contacter.\n\n" +
            "Cordialement,\n" +
            "L'équipe Météo App",
            userName, 
            (reason != null && !reason.isEmpty()) ? "Raison: " + reason : ""
        );
        
        sendSimpleMessage(userEmail, subject, message);
    }
    
    /**
     * Envoyer un email d'alerte météo
     */
    @Async
    public void sendWeatherAlertEmail(String userEmail, String alertMessage) {
        String subject = "Alerte Météo - Météo App";
        String message = String.format(
            "Bonjour,\n\n" +
            "Une alerte météo a été émise :\n\n" +
            "%s\n\n" +
            "Restez prudent et prenez les précautions nécessaires.\n\n" +
            "Cordialement,\n" +
            "L'équipe Météo App",
            alertMessage
        );
        
        sendSimpleMessage(userEmail, subject, message);
    }
    
    /**
     * Envoyer un email d'alerte qualité de l'air
     */
    @Async
    public void sendAirQualityAlertEmail(String userEmail, String alertMessage) {
        String subject = "Alerte Qualité de l'Air - Météo App";
        String message = String.format(
            "Bonjour,\n\n" +
            "Une alerte concernant la qualité de l'air a été émise :\n\n" +
            "%s\n\n" +
            "Nous vous recommandons de prendre les précautions appropriées.\n\n" +
            "Cordialement,\n" +
            "L'équipe Météo App",
            alertMessage
        );
        
        sendSimpleMessage(userEmail, subject, message);
    }
    
    /**
     * Construire le template HTML pour les emails de notification
     */
    private String buildNotificationEmailTemplate(String title, String message) {
        return "<html><body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>" +
               "<div style='max-width: 600px; margin: 0 auto; padding: 20px;'>" +
               "<div style='background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff;'>" +
               "<h2 style='color: #007bff; margin-top: 0;'>" + title + "</h2>" +
               "<div style='background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0;'>" +
               "<p>" + message.replace("\n", "<br>") + "</p>" +
               "</div>" +
               "<p style='margin-bottom: 0; font-size: 12px; color: #666;'>" +
               "Cet email a été envoyé automatiquement par l'application Météo App." +
               "</p>" +
               "</div>" +
               "</div>" +
               "</body></html>";
    }
}