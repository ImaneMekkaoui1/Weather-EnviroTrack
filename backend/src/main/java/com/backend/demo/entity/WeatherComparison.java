package com.backend.demo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "weather_comparison")
public class WeatherComparison {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String city;
    
    // Date de la prévision
    private LocalDateTime forecastDate;
    
    // Date d'enregistrement de la prévision
    private LocalDateTime recordedAt;
    
    // API source (OpenWeather ou WeatherAPI)
    private String source;
    
    // Données météo prévues
    private Double forecastTemperature;
    private Double forecastHumidity;
    private Double forecastWindSpeed;
    private String forecastCondition;
    
    // Données météo réelles observées (à remplir ultérieurement)
    private Double actualTemperature;
    private Double actualHumidity;
    private Double actualWindSpeed;
    private String actualCondition;
    
    // Date d'enregistrement de l'observation réelle
    private LocalDateTime observedAt;
    
    // Écart calculé
    private Double temperatureDelta;
    private Double humidityDelta;
    private Double windSpeedDelta;
    private Boolean conditionMatch;

    // Getters et Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public LocalDateTime getForecastDate() {
        return forecastDate;
    }

    public void setForecastDate(LocalDateTime forecastDate) {
        this.forecastDate = forecastDate;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }

    public String getSource() {
        return source;
    }

    public void setSource(String source) {
        this.source = source;
    }

    public Double getForecastTemperature() {
        return forecastTemperature;
    }

    public void setForecastTemperature(Double forecastTemperature) {
        this.forecastTemperature = forecastTemperature;
    }

    public Double getForecastHumidity() {
        return forecastHumidity;
    }

    public void setForecastHumidity(Double forecastHumidity) {
        this.forecastHumidity = forecastHumidity;
    }

    public Double getForecastWindSpeed() {
        return forecastWindSpeed;
    }

    public void setForecastWindSpeed(Double forecastWindSpeed) {
        this.forecastWindSpeed = forecastWindSpeed;
    }

    public String getForecastCondition() {
        return forecastCondition;
    }

    public void setForecastCondition(String forecastCondition) {
        this.forecastCondition = forecastCondition;
    }

    public Double getActualTemperature() {
        return actualTemperature;
    }

    public void setActualTemperature(Double actualTemperature) {
        this.actualTemperature = actualTemperature;
    }

    public Double getActualHumidity() {
        return actualHumidity;
    }

    public void setActualHumidity(Double actualHumidity) {
        this.actualHumidity = actualHumidity;
    }

    public Double getActualWindSpeed() {
        return actualWindSpeed;
    }

    public void setActualWindSpeed(Double actualWindSpeed) {
        this.actualWindSpeed = actualWindSpeed;
    }

    public String getActualCondition() {
        return actualCondition;
    }

    public void setActualCondition(String actualCondition) {
        this.actualCondition = actualCondition;
    }

    public LocalDateTime getObservedAt() {
        return observedAt;
    }

    public void setObservedAt(LocalDateTime observedAt) {
        this.observedAt = observedAt;
    }

    public Double getTemperatureDelta() {
        return temperatureDelta;
    }

    public void setTemperatureDelta(Double temperatureDelta) {
        this.temperatureDelta = temperatureDelta;
    }

    public Double getHumidityDelta() {
        return humidityDelta;
    }

    public void setHumidityDelta(Double humidityDelta) {
        this.humidityDelta = humidityDelta;
    }

    public Double getWindSpeedDelta() {
        return windSpeedDelta;
    }

    public void setWindSpeedDelta(Double windSpeedDelta) {
        this.windSpeedDelta = windSpeedDelta;
    }

    public Boolean getConditionMatch() {
        return conditionMatch;
    }

    public void setConditionMatch(Boolean conditionMatch) {
        this.conditionMatch = conditionMatch;
    }
}