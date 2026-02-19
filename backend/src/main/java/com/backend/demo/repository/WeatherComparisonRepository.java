package com.backend.demo.repository;

import com.backend.demo.entity.WeatherComparison;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface WeatherComparisonRepository extends JpaRepository<WeatherComparison, Long> {
    
    List<WeatherComparison> findByCity(String city);
    
    List<WeatherComparison> findByCityAndSource(String city, String source);
    
    List<WeatherComparison> findByCityAndSourceAndForecastDateBetween(
        String city, String source, LocalDateTime startDate, LocalDateTime endDate);
    
    List<WeatherComparison> findByCityAndForecastDateBetween(
        String city, LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT w FROM WeatherComparison w WHERE w.city = :city AND w.source = :source " +
           "AND w.forecastDate <= :referenceDate AND w.actualTemperature IS NULL " +
           "ORDER BY w.forecastDate DESC")
    List<WeatherComparison> findPendingForecasts(
        @Param("city") String city, 
        @Param("source") String source, 
        @Param("referenceDate") LocalDateTime referenceDate);
    
    @Query("SELECT AVG(ABS(w.temperatureDelta)) FROM WeatherComparison w " +
           "WHERE w.city = :city AND w.source = :source AND w.temperatureDelta IS NOT NULL " +
           "AND w.forecastDate BETWEEN :startDate AND :endDate")
    Double getAverageTemperatureDeviation(
        @Param("city") String city,
        @Param("source") String source,
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate);
}