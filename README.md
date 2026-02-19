# Weather & EnviroTrack - Surveillance Environnementale (OCP)

Bienvenue dans le dépôt de mon Projet de Fin d'Études (PFE) réalisé au sein du groupe OCP Jorf Lasfar. Ce projet porte sur la conception et le développement d'une plateforme Fullstack intégrée pour la surveillance en temps réel des conditions météorologiques et de la qualité de l'air.

## Objectif

Comprendre et implémenter une architecture moderne permettant de passer d'une surveillance manuelle à un système automatisé, réactif et connecté (IoT) en utilisant différentes approches :

- Consommation d'APIs externes (Météo)
- Communication asynchrone par messages (MQTT)
- Sécurisation des endpoints (JWT)
- Affichage en temps réel (WebSockets & Angular)

---

# Architecture du Projet

Le projet est organisé en plusieurs couches principales afin de respecter la séparation des responsabilités (architecture MVC et orientée services).

## Couche Frontend (`Angular`)
- Composants de présentation (Dashboards Admin et User)
- Intégration de la bibliothèque **Leaflet** pour la cartographie interactive.
- Rôle : Fournir une interface utilisateur dynamique et consommer les API du backend.

## Couche Backend (`Spring Boot`)
- Structuration classique : `Controllers`, `Services`, `Repositories`.
- Rôle : Traiter la logique métier, valider les données et orchestrer les communications.

## Couche Intégration IoT (`MQTT`)
- Utilisation du broker **Mosquitto** et implémentation de `MqttSubscriber`.
- Rôle : Simuler et recevoir les flux de données environnementales envoyées par les capteurs industriels.

## Couche Sécurité (`Spring Security`)
- Implémentation via `JwtAuthenticationFilter` et `CustomUserDetailsService`.
- Rôle : Garantir que seules les personnes autorisées (avec les bons rôles) accèdent aux données sensibles.



---

# Les 4 Composants Clés de l'Évolution du Système

## 1. Module Météorologique – `WeatherService`

- Récupération des données climatiques en temps réel.
- Comparaison croisée entre **OpenWeatherMap** et **WeatherAPI**.

Verdict :  
Permet de garantir une haute fiabilité des prévisions météorologiques.  
Si une API tombe en panne, le système peut compter sur la seconde.

---

## 2. Le Réseau de Capteurs (IoT) – `MqttController`

Utilisation du protocole MQTT pour une architecture événementielle (Event-driven).

Étapes :
- Le capteur publie une donnée sur un *Topic* spécifique.
- Le Backend (Abonné/Subscriber) intercepte le message.
- La donnée est traitée et stockée en base.

Verdict :  
Communication légère et ultra-rapide, parfaitement adaptée aux contraintes industrielles de l'OCP comparé à de simples requêtes HTTP.

---

## 3. Le Système d'Alertes – `AlertThresholdService`

- Évaluation continue des métriques reçues par les capteurs.
- Déclenchement de notifications en direct via **WebSockets**.

Verdict :  
Le système passe d'un état passif (affichage de données) à un état proactif (avertissement immédiat de l'opérateur en cas de danger).

---

## 4. La Sécurité – `AuthService & JWT`

Approche moderne "Stateless" (sans état).

Utilisation :
- Création d'un token JWT à la connexion.
- Interception des requêtes frontend pour valider le token.
- Gestion stricte des rôles (`Admin` vs `User`).

Verdict :  
Sécurité renforcée, protection contre les accès non autorisés et traçabilité des logs de connexion.

---

# Logique de Surveillance

Le système réalise le contrôle suivant en temps réel :

Si (Valeur_Capteur_Actuelle > Seuil_Critique_Défini_Par_Admin) {
    1. Enregistrement de l'alerte en base de données (MySQL).
    2. Envoi d'une notification Push (WebSocket) au Frontend.
}

---

# Stack Technique

- **Backend** : Java (Spring Boot, Spring Security, Spring Data JPA)
- **Frontend** : Angular, TypeScript, Leaflet (Cartographie)
- **Base de données** : MySQL
- **IoT & Messagerie** : MQTT (Broker Eclipse Mosquitto), WebSockets
- **Services Tiers** : API OpenWeatherMap, WeatherAPI

---

# Conclusion

Ce PFE montre l'intégration complète d'un système industriel :

Consommation API Météo → Sécurité JWT → Simulation IoT (MQTT) → Tableaux de bord en temps réel.  

L'objectif final est de fournir à l'OCP une plateforme flexible, maintenable et évolutive en appliquant les meilleures pratiques de l'ingénierie logicielle et de l'architecture distribuée.
