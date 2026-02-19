package com.backend.demo.service;
import com.backend.demo.entity.WeatherComparison;
import com.backend.demo.repository.WeatherComparisonRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class WeatherComparisonService {

    private static final Logger logger = LoggerFactory.getLogger(WeatherComparisonService.class);
    
    @Value("${openweather.api.key}")
    private String openWeatherKey;
    
    @Value("${weatherapi.api.key}")
    private String weatherApiKey;
    
    private final WeatherComparisonRepository repository;
    private final RestTemplate restTemplate;
    
    @Autowired
    public WeatherComparisonService(WeatherComparisonRepository repository, RestTemplate restTemplate) {
        this.repository = repository;
        this.restTemplate = restTemplate;
    }
    
    public List<WeatherComparison> getAllComparisons() {
        return repository.findAll();
    }
    
    public List<WeatherComparison> getComparisonsByCity(String city) {
        return repository.findByCity(city);
    }
    
    public List<WeatherComparison> getComparisonsByCityAndSource(String city, String source) {
        return repository.findByCityAndSource(city, source);
    }
    
    public List<WeatherComparison> getComparisonsByDateRange(String city, LocalDateTime startDate, LocalDateTime endDate) {
        return repository.findByCityAndForecastDateBetween(city, startDate, endDate);
    }
    
    public WeatherComparison saveComparison(WeatherComparison comparison) {
        return repository.save(comparison);
    }
    
    /**
     * Enregistre les prévisions des deux API pour une ville donnée
     */
    public void recordForecasts(String city) {
        logger.info("Enregistrement des prévisions pour la ville : {}", city);
        
        try {
            // 1. Récupérer les prévisions d'OpenWeather
            recordOpenWeatherForecasts(city);
            
            // 2. Récupérer les prévisions de WeatherAPI
            recordWeatherApiForecasts(city);
            
            logger.info("Prévisions enregistrées avec succès pour {}", city);
        } catch (Exception e) {
            logger.error("Erreur lors de l'enregistrement des prévisions pour {} : {}", city, e.getMessage());
        }
    }
    
    /**
     * Enregistre les prévisions d'OpenWeather
     */
    private void recordOpenWeatherForecasts(String city) {
        try {
            // URL pour les prévisions à 5 jours
            String url = "https://api.openweathermap.org/data/2.5/forecast?q=" + city +
                         "&appid=" + openWeatherKey + "&units=metric&lang=fr";
            
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response != null && response.containsKey("list")) {
                List<Map<String, Object>> forecastList = (List<Map<String, Object>>) response.get("list");
                
                for (Map<String, Object> forecast : forecastList) {
                    WeatherComparison comparison = new WeatherComparison();
                    comparison.setCity(city);
                    comparison.setSource("OpenWeather");
                    comparison.setRecordedAt(LocalDateTime.now());
                    
                    // Convertir le timestamp en LocalDateTime
                    Long timestamp = ((Number) forecast.get("dt")).longValue();
                    comparison.setForecastDate(LocalDateTime.now()
                        .withSecond(0).withNano(0)
                        .plusSeconds(timestamp - System.currentTimeMillis()/1000));
                    
                    // Extraire les données météo
                    Map<String, Object> main = (Map<String, Object>) forecast.get("main");
                    Map<String, Object> wind = (Map<String, Object>) forecast.get("wind");
                    List<Map<String, Object>> weather = (List<Map<String, Object>>) forecast.get("weather");
                    
                    comparison.setForecastTemperature(convertToDouble(main.get("temp")));
                    comparison.setForecastHumidity(convertToDouble(main.get("humidity")));
                    comparison.setForecastWindSpeed(convertToDouble(wind.get("speed")));
                    comparison.setForecastCondition((String) weather.get(0).get("description"));
                    
                    repository.save(comparison);
                }
            }
        } catch (Exception e) {
            logger.error("Erreur lors de l'enregistrement des prévisions OpenWeather : {}", e.getMessage());
        }
    }
    
    /**
     * Enregistre les prévisions de WeatherAPI
     */
    private void recordWeatherApiForecasts(String city) {
        try {
            // URL pour les prévisions à 3 jours
            String url = "https://api.weatherapi.com/v1/forecast.json?key=" + weatherApiKey +
                         "&q=" + city + "&days=3&lang=fr";
            
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response != null && response.containsKey("forecast")) {
                Map<String, Object> forecast = (Map<String, Object>) response.get("forecast");
                List<Map<String, Object>> forecastdays = (List<Map<String, Object>>) forecast.get("forecastday");
                
                for (Map<String, Object> day : forecastdays) {
                    String date = (String) day.get("date");
                    List<Map<String, Object>> hours = (List<Map<String, Object>>) ((Map<String, Object>) day.get("hour"));
                    
                    for (Map<String, Object> hour : hours) {
                        WeatherComparison comparison = new WeatherComparison();
                        comparison.setCity(city);
                        comparison.setSource("WeatherAPI");
                        comparison.setRecordedAt(LocalDateTime.now());
                        
                        // Convertir le timestamp en LocalDateTime
                        String timeEpoch = hour.get("time").toString();
                        // Parse le timeEpoch au format approprié
                        comparison.setForecastDate(LocalDateTime.parse(timeEpoch.replace(" ", "T")));
                        
                        comparison.setForecastTemperature(convertToDouble(hour.get("temp_c")));
                        comparison.setForecastHumidity(convertToDouble(hour.get("humidity")));
                        comparison.setForecastWindSpeed(convertToDouble(hour.get("wind_kph")));
                        
                        Map<String, Object> condition = (Map<String, Object>) hour.get("condition");
                        comparison.setForecastCondition((String) condition.get("text"));
                        
                        repository.save(comparison);
                    }
                }
            }
        } catch (Exception e) {
            logger.error("Erreur lors de l'enregistrement des prévisions WeatherAPI : {}", e.getMessage());
        }
    }
    
    /**
     * Met à jour les prévisions avec les observations réelles
     * Cette méthode sera exécutée régulièrement via un @Scheduled
     */
    @Scheduled(cron = "0 0 * * * *") // Toutes les heures
    public void updateForecastsWithActualData() {
        logger.info("Mise à jour des prévisions avec les données réelles");
        
        LocalDateTime now = LocalDateTime.now().withMinute(0).withSecond(0).withNano(0);
        
        // Récupérer les villes distinctes pour lesquelles nous avons des prévisions
        List<WeatherComparison> allComparisons = repository.findAll();
        Set<String> cities = new HashSet<>();
        
        for (WeatherComparison comparison : allComparisons) {
            cities.add(comparison.getCity());
        }
        
        for (String city : cities) {
            try {
                // Récupérer les données météo actuelles
                Map<String, Object> currentOpenWeather = getCurrentOpenWeatherData(city);
                Map<String, Object> currentWeatherApi = getCurrentWeatherApiData(city);
                
                // Récupérer les prévisions passées qui n'ont pas encore été comparées
                updateOpenWeatherComparisons(city, currentOpenWeather, now);
                updateWeatherApiComparisons(city, currentWeatherApi, now);
                
            } catch (Exception e) {
                logger.error("Erreur lors de la mise à jour des prévisions pour {} : {}", city, e.getMessage());
            }
        }
    }
    
    /**
     * Récupère les données météo actuelles d'OpenWeather
     */
    private Map<String, Object> getCurrentOpenWeatherData(String city) {
        String url = "https://api.openweathermap.org/data/2.5/weather?q=" + city +
                    "&appid=" + openWeatherKey + "&units=metric&lang=fr";
                    
        return restTemplate.getForObject(url, Map.class);
    }
    
    /**
     * Récupère les données météo actuelles de WeatherAPI
     */
    private Map<String, Object> getCurrentWeatherApiData(String city) {
        String url = "https://api.weatherapi.com/v1/current.json?key=" + weatherApiKey +
                    "&q=" + city + "&lang=fr";
                    
        return restTemplate.getForObject(url, Map.class);
    }
    
    /**
     * Met à jour les comparaisons OpenWeather avec les données réelles
     */
    private void updateOpenWeatherComparisons(String city, Map<String, Object> currentData, LocalDateTime now) {
        try {
            List<WeatherComparison> pendingForecasts = repository.findPendingForecasts(
                city, "OpenWeather", now);
                
            if (pendingForecasts.isEmpty()) {
                return;
            }
            
            // Extraire les données actuelles
            Map<String, Object> main = (Map<String, Object>) currentData.get("main");
            Map<String, Object> wind = (Map<String, Object>) currentData.get("wind");
            List<Map<String, Object>> weather = (List<Map<String, Object>>) currentData.get("weather");
            
            Double actualTemp = convertToDouble(main.get("temp"));
            Double actualHumidity = convertToDouble(main.get("humidity"));
            Double actualWindSpeed = convertToDouble(wind.get("speed"));
            String actualCondition = (String) weather.get(0).get("description");
            
            for (WeatherComparison forecast : pendingForecasts) {
                // Mise à jour avec les données actuelles
                forecast.setActualTemperature(actualTemp);
                forecast.setActualHumidity(actualHumidity);
                forecast.setActualWindSpeed(actualWindSpeed);
                forecast.setActualCondition(actualCondition);
                forecast.setObservedAt(now);
                
                // Calcul des écarts
                forecast.setTemperatureDelta(actualTemp - forecast.getForecastTemperature());
                forecast.setHumidityDelta(actualHumidity - forecast.getForecastHumidity());
                forecast.setWindSpeedDelta(actualWindSpeed - forecast.getForecastWindSpeed());
                forecast.setConditionMatch(actualCondition.equalsIgnoreCase(forecast.getForecastCondition()));
                
                repository.save(forecast);
            }
        } catch (Exception e) {
            logger.error("Erreur lors de la mise à jour des comparaisons OpenWeather : {}", e.getMessage());
        }
    }
    
    /**
     * Met à jour les comparaisons WeatherAPI avec les données réelles
     */
    private void updateWeatherApiComparisons(String city, Map<String, Object> currentData, LocalDateTime now) {
        try {
            List<WeatherComparison> pendingForecasts = repository.findPendingForecasts(
                city, "WeatherAPI", now);
                
            if (pendingForecasts.isEmpty()) {
                return;
            }
            
            // Extraire les données actuelles
            Map<String, Object> current = (Map<String, Object>) currentData.get("current");
            
            Double actualTemp = convertToDouble(current.get("temp_c"));
            Double actualHumidity = convertToDouble(current.get("humidity"));
            Double actualWindSpeed = convertToDouble(current.get("wind_kph"));
            
            Map<String, Object> condition = (Map<String, Object>) current.get("condition");
            String actualCondition = (String) condition.get("text");
            
            for (WeatherComparison forecast : pendingForecasts) {
                // Mise à jour avec les données actuelles
                forecast.setActualTemperature(actualTemp);
                forecast.setActualHumidity(actualHumidity);
                forecast.setActualWindSpeed(actualWindSpeed);
                forecast.setActualCondition(actualCondition);
                forecast.setObservedAt(now);
                
                // Calcul des écarts
                forecast.setTemperatureDelta(actualTemp - forecast.getForecastTemperature());
                forecast.setHumidityDelta(actualHumidity - forecast.getForecastHumidity());
                forecast.setWindSpeedDelta(actualWindSpeed - forecast.getForecastWindSpeed());
                forecast.setConditionMatch(actualCondition.equalsIgnoreCase(forecast.getForecastCondition()));
                
                repository.save(forecast);
            }
        } catch (Exception e) {
            logger.error("Erreur lors de la mise à jour des comparaisons WeatherAPI : {}", e.getMessage());
        }
    }
    
    /**
     * Récupère les statistiques de fiabilité des API
     */
    public Map<String, Object> getReliabilityStats(String city, LocalDateTime startDate, LocalDateTime endDate) {
        Map<String, Object> result = new HashMap<>();
        
        Double openWeatherTempDeviation = repository.getAverageTemperatureDeviation(
            city, "OpenWeather", startDate, endDate);
            
        Double weatherApiTempDeviation = repository.getAverageTemperatureDeviation(
            city, "WeatherAPI", startDate, endDate);
            
        result.put("city", city);
        result.put("period", Map.of(
            "start", startDate,
            "end", endDate
        ));
        
        Map<String, Object> openWeatherStats = new HashMap<>();
        openWeatherStats.put("averageTemperatureDeviation", openWeatherTempDeviation);
        
        Map<String, Object> weatherApiStats = new HashMap<>();
        weatherApiStats.put("averageTemperatureDeviation", weatherApiTempDeviation);
        
        result.put("openWeather", openWeatherStats);
        result.put("weatherApi", weatherApiStats);
        
        // Calculer des statistiques plus détaillées
        calculateDetailedStats(result, city, "OpenWeather", startDate, endDate);
        calculateDetailedStats(result, city, "WeatherAPI", startDate, endDate);
        
        return result;
    }
    
    /**
     * Calcule des statistiques détaillées pour une API
     */
    private void calculateDetailedStats(Map<String, Object> result, String city, 
                                       String source, LocalDateTime startDate, LocalDateTime endDate) {
        
        List<WeatherComparison> comparisons = repository.findByCityAndSourceAndForecastDateBetween(
            city, source, startDate, endDate);
            
        if (comparisons.isEmpty()) {
            return;
        }
        
        int total = comparisons.size();
        int completedCount = 0;
        double tempDeviationSum = 0;
        double humidityDeviationSum = 0;
        double windDeviationSum = 0;
        int conditionMatchCount = 0;
        
        // Déviations pour différentes périodes de prédiction
        Map<String, List<Double>> tempDeviationByForecastPeriod = new HashMap<>();
        
        for (WeatherComparison comparison : comparisons) {
            if (comparison.getActualTemperature() == null) {
                continue;
            }
            
            completedCount++;
            tempDeviationSum += Math.abs(comparison.getTemperatureDelta());
            humidityDeviationSum += Math.abs(comparison.getHumidityDelta());
            windDeviationSum += Math.abs(comparison.getWindSpeedDelta());
            
            if (Boolean.TRUE.equals(comparison.getConditionMatch())) {
                conditionMatchCount++;
            }
            
            // Calculer la période de prévision (en heures)
            long hoursBetween = ChronoUnit.HOURS.between(
                comparison.getRecordedAt(), comparison.getForecastDate());
                
            String periodKey;
            if (hoursBetween <= 3) {
                periodKey = "0-3h";
            } else if (hoursBetween <= 12) {
                periodKey = "3-12h";
            } else if (hoursBetween <= 24) {
                periodKey = "12-24h";
            } else if (hoursBetween <= 48) {
                periodKey = "24-48h";
            } else {
                periodKey = "48h+";
            }
            
            tempDeviationByForecastPeriod.computeIfAbsent(periodKey, k -> new ArrayList<>())
                .add(Math.abs(comparison.getTemperatureDelta()));
        }
        
        Map<String, Object> stats = (Map<String, Object>) result.get(
            source.equals("OpenWeather") ? "openWeather" : "weatherApi");
            
        if (completedCount > 0) {
            stats.put("totalForecasts", completedCount);
            stats.put("averageTemperatureDeviation", tempDeviationSum / completedCount);
            stats.put("averageHumidityDeviation", humidityDeviationSum / completedCount);
            stats.put("averageWindSpeedDeviation", windDeviationSum / completedCount);
            stats.put("conditionMatchPercentage", (double) conditionMatchCount / completedCount * 100);
            
            // Calculer les déviations moyennes par période
            Map<String, Double> avgDeviationByPeriod = new HashMap<>();
            for (Map.Entry<String, List<Double>> entry : tempDeviationByForecastPeriod.entrySet()) {
                double avg = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                avgDeviationByPeriod.put(entry.getKey(), avg);
            }
            
            stats.put("temperatureDeviationByPeriod", avgDeviationByPeriod);
        }
    }
    
    private double convertToDouble(Object number) {
        if (number instanceof Integer) {
            return ((Integer) number).doubleValue();
        } else if (number instanceof Long) {
            return ((Long) number).doubleValue();
        } else if (number instanceof Double) {
            return (Double) number;
        }
        return 0.0;
    }
}