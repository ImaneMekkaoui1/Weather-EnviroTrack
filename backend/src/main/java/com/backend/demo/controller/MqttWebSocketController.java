package com.backend.demo.controller;

import com.backend.demo.mqtt.AirQualityData;
import com.backend.demo.mqtt.MqttSubscriber;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.stereotype.Controller;

@Controller
public class MqttWebSocketController {

    private final MqttSubscriber mqttSubscriber;

    @Autowired
    public MqttWebSocketController(MqttSubscriber mqttSubscriber) {
        this.mqttSubscriber = mqttSubscriber;
    }

    @MessageMapping("/airquality")
    public void handleAirQualityRequest() {
        // Le broadcasting est maintenant géré directement dans MqttSubscriber
    }
}