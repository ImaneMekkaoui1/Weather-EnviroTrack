package com.backend.demo.simulation;

import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Random;
import java.util.Locale;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

@Service
public class SensorSimulator {
    private static final Logger logger = LoggerFactory.getLogger(SensorSimulator.class);
    
    @Value("${mqtt.broker.url:tcp://localhost:1883}")
    private String brokerUrl;
    
    @Value("${mqtt.topic.airquality:airquality/data}")
    private String topic;
    
    @Value("${sensor.simulation.interval:5000}")
    private long simulationInterval;
    
    private final Random random = new Random();
    private MqttClient mqttClient;
    private MqttConnectOptions options;

    @PostConstruct
    public void init() {
        try {
            logger.info("Initializing Sensor Simulator with broker: {}, topic: {}", brokerUrl, topic);
            mqttClient = new MqttClient(brokerUrl, "SensorSimulator_" + System.currentTimeMillis(), new MemoryPersistence());
            
            options = new MqttConnectOptions();
            options.setAutomaticReconnect(true);
            options.setCleanSession(true);
            options.setConnectionTimeout(10);
            options.setKeepAliveInterval(60);
            options.setMqttVersion(MqttConnectOptions.MQTT_VERSION_3_1_1);
            
            connectToBroker();
        } catch (MqttException e) {
            logger.error("Initialization error: {}", e.getMessage(), e);
        }
    }

    private void connectToBroker() {
        try {
            if (mqttClient != null && !mqttClient.isConnected()) {
                mqttClient.connect(options);
                logger.info("Connected to MQTT broker: {}", brokerUrl);
            }
        } catch (MqttException e) {
            logger.error("Connection error: {}", e.getMessage());
            scheduleReconnect();
        }
    }

    private void scheduleReconnect() {
        try {
            Thread.sleep(5000);
            connectToBroker();
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
        }
    }

    @Scheduled(fixedRateString = "${sensor.simulation.interval}")
    public void simulateData() {
        if (mqttClient == null || !mqttClient.isConnected()) {
            logger.warn("Attempting to reconnect...");
            connectToBroker();
            return;
        }
        
        try {
            String payload = generateSensorData();
            MqttMessage message = new MqttMessage(payload.getBytes(StandardCharsets.UTF_8));
            message.setQos(1);
            message.setRetained(true);
            mqttClient.publish(topic, message);
            logger.debug("Published to {}: {}", topic, payload);
        } catch (MqttException e) {
            logger.error("Publication error: {}", e.getMessage());
            connectToBroker();
        }
    }

    private String generateSensorData() {
        float pm25 = random.nextFloat() * 45 + 5;
        float pm10 = random.nextFloat() * 90 + 10;
        float no2 = random.nextFloat() * 35 + 5;
        float o3 = random.nextFloat() * 70 + 10;
        float co = random.nextFloat() * 1.9f + 0.1f;
        int aqi = random.nextInt(201);
        
        return String.format(Locale.US, "%.2f,%.2f,%.2f,%.2f,%.2f,%d", 
                           pm25, pm10, no2, o3, co, aqi);
    }

    @PreDestroy
    public void cleanup() {
        try {
            if (mqttClient != null) {
                if (mqttClient.isConnected()) {
                    mqttClient.disconnect();
                }
                mqttClient.close();
                logger.info("MQTT client disconnected and closed");
            }
        } catch (MqttException e) {
            logger.error("Disconnection error: {}", e.getMessage());
        }
    }
}