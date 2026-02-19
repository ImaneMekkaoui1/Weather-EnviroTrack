package com.backend.demo.mqtt;

import org.springframework.stereotype.Service;
import java.util.concurrent.atomic.AtomicReference;

@Service
public class AirQualityDataService {
    private final AtomicReference<AirQualityData> latestData = new AtomicReference<>();

    public synchronized void updateData(AirQualityData newData) {
        latestData.set(newData);
    }

    public synchronized AirQualityData getLatestData() {
        return latestData.get() != null ? latestData.get() : new AirQualityData();
    }
}