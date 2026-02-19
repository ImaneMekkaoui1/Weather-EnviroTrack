package com.backend.demo.mqtt;

import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.nio.charset.StandardCharsets;

@Service
public class MqttSubscriber {
    private static final Logger logger = LoggerFactory.getLogger(MqttSubscriber.class);
    
    @Value("${mqtt.broker.url}")
    private String brokerUrl;
    
    @Value("${mqtt.client.id}")
    private String clientId;
    
    @Value("${mqtt.topic.airquality}")
    private String topic;
    
    private MqttClient mqttClient;
    private final AirQualityDataService airQualityDataService;
    private final SimpMessagingTemplate messagingTemplate;

    @Autowired
    public MqttSubscriber(AirQualityDataService airQualityDataService, 
                         SimpMessagingTemplate messagingTemplate) {
        this.airQualityDataService = airQualityDataService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostConstruct
    public void init() {
        try {
            mqttClient = new MqttClient(brokerUrl, clientId, new MemoryPersistence());
            MqttConnectOptions options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);
            options.setConnectionTimeout(10);
            
            mqttClient.setCallback(new MqttCallbackExtended() {
                @Override
                public void connectComplete(boolean reconnect, String serverURI) {
                    logger.info("Connexion {} au broker MQTT: {}", 
                        reconnect ? "rétablie" : "établie", serverURI);
                    subscribeToTopic();
                }

                @Override
                public void connectionLost(Throwable cause) {
                    logger.warn("Connexion MQTT perdue: {}", cause.getMessage());
                }

                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    processMessage(topic, message);
                }

                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {}
            });

            mqttClient.connect(options);
        } catch (MqttException e) {
            logger.error("Erreur d'initialisation MQTT: {}", e.getMessage());
        }
    }

    private void subscribeToTopic() {
        try {
            mqttClient.subscribe(topic, 1);
            logger.info("Abonné au topic: {}", topic);
        } catch (MqttException e) {
            logger.error("Erreur d'abonnement: {}", e.getMessage());
        }
    }

    private void processMessage(String topic, MqttMessage message) {
        try {
            String payload = new String(message.getPayload(), StandardCharsets.UTF_8).trim();
            logger.debug("Message brut reçu [{}]: {}", topic, payload);
            
            String[] values = payload.split(",");
            
            if (values.length == 6) {
                AirQualityData data = new AirQualityData(
                    Float.parseFloat(values[0].trim()), // pm25
                    Float.parseFloat(values[1].trim()), // pm10
                    Float.parseFloat(values[2].trim()), // no2
                    Float.parseFloat(values[3].trim()), // o3
                    Float.parseFloat(values[4].trim()), // co
                    Integer.parseInt(values[5].trim())   // aqi
                );
                
                logger.info("Données parsées: {}", data);
                airQualityDataService.updateData(data);
                
                // Envoi immédiat via WebSocket
                messagingTemplate.convertAndSend("/topic/airquality", data);
            } else {
                logger.warn("Format de message invalide. Attendu 6 valeurs, reçu {}", values.length);
            }
        } catch (Exception e) {
            logger.error("Erreur de traitement MQTT: {}", e.getMessage());
        }
    }

    public AirQualityData getLatestData() {
        return airQualityDataService.getLatestData();
    }

    @PreDestroy
    public void cleanup() {
        try {
            if (mqttClient != null && mqttClient.isConnected()) {
                mqttClient.disconnect();
                mqttClient.close();
            }
        } catch (MqttException e) {
            logger.error("Erreur de déconnexion: {}", e.getMessage());
        }
    }
}