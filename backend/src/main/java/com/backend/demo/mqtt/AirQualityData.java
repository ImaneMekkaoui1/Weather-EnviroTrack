package com.backend.demo.mqtt;

public class AirQualityData {
    private float pm25;
    private float pm10;
    private float no2;
    private float o3;
    private float co;
    private int aqi;

    public AirQualityData() {
    }

    public AirQualityData(float pm25, float pm10, float no2, float o3, float co, int aqi) {
        this.pm25 = pm25;
        this.pm10 = pm10;
        this.no2 = no2;
        this.o3 = o3;
        this.co = co;
        this.aqi = aqi;
    }

    public float getPm25() {
        return pm25;
    }

    public void setPm25(float pm25) {
        this.pm25 = pm25;
    }

    public float getPm10() {
        return pm10;
    }

    public void setPm10(float pm10) {
        this.pm10 = pm10;
    }

    public float getNo2() {
        return no2;
    }

    public void setNo2(float no2) {
        this.no2 = no2;
    }

    public float getO3() {
        return o3;
    }

    public void setO3(float o3) {
        this.o3 = o3;
    }

    public float getCo() {
        return co;
    }

    public void setCo(float co) {
        this.co = co;
    }

    public int getAqi() {
        return aqi;
    }

    public void setAqi(int aqi) {
        this.aqi = aqi;
    }

    @Override
    public String toString() {
        return "AirQualityData{" +
                "pm25=" + pm25 +
                ", pm10=" + pm10 +
                ", no2=" + no2 +
                ", o3=" + o3 +
                ", co=" + co +
                ", aqi=" + aqi +
                '}';
    }
}   