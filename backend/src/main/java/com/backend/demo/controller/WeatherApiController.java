package com.backend.demo.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/weather-api")
public class WeatherApiController {

    private static final Logger logger = LoggerFactory.getLogger(WeatherApiController.class);

    @Value("${weatherapi.api.key}")
    private String weatherApiKey;
    
    @Value("${openweather.api.key}")
    private String openWeatherApiKey;

    private final RestTemplate restTemplate;

    public WeatherApiController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/{city}")
    public ResponseEntity<Map<String, Object>> getWeatherApiData(@PathVariable String city) {
        try {
            logger.debug("Fetching WeatherAPI data for city: {}", city);
            
            String url = "https://api.weatherapi.com/v1/current.json?key=" + weatherApiKey + 
                         "&q=" + city;
            
            logger.debug("Calling WeatherAPI with key: {}", weatherApiKey);
            logger.debug("Full URL: {}", url);
            
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response == null) {
                throw new RuntimeException("Null response from WeatherAPI");
            }
            
            logger.debug("WeatherAPI response: {}", response);
            
            // Process and return the data
            return ResponseEntity.ok(processWeatherApiData(response));
            
        } catch (Exception e) {
            logger.error("Failed to fetch WeatherAPI data for city: {}", city, e);
            logger.error("Error details: {}", e.getMessage());
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch WeatherAPI data: " + e.getMessage());
            errorResponse.put("city", city);
            
            // Return a valid but empty object to avoid client-side errors
            return ResponseEntity.status(500).body(errorResponse);
        }
    }
    
    @GetMapping("/compare-weather/{city}")
public ResponseEntity<Map<String, Object>> compareWeatherApis(@PathVariable String city) {
    try {
        logger.debug("Comparing weather APIs for city: {}", city);
        
        // Fetch data from both APIs
        String openWeatherUrl = "https://api.openweathermap.org/data/2.5/weather?q=" + city + 
                               "&appid=" + openWeatherApiKey + "&units=metric";
        
        String weatherApiUrl = "https://api.weatherapi.com/v1/current.json?key=" + 
                              weatherApiKey + "&q=" + city;
        
        // Get OpenWeatherMap data
        Map<String, Object> openWeatherData = restTemplate.getForObject(openWeatherUrl, Map.class);
        
        // Get WeatherAPI data
        Map<String, Object> weatherApiData = restTemplate.getForObject(weatherApiUrl, Map.class);
        
        // Ajoutez des logs pour déboguer
        logger.debug("OpenWeather response: {}", openWeatherData);
        logger.debug("WeatherAPI response: {}", weatherApiData);
        
        // Process and compare the data
        Map<String, Object> result = new HashMap<>();
        result.put("city", city);
        result.put("timestamp", new Date().getTime());
        
        // Extract data from OpenWeatherMap avec vérification supplémentaire
        Map<String, Object> openWeatherResult = new HashMap<>();
        if (openWeatherData != null) {
            if (openWeatherData.containsKey("main")) {
                Map<String, Object> main = (Map<String, Object>) openWeatherData.get("main");
                openWeatherResult.put("temperature", main.get("temp"));
                openWeatherResult.put("feels_like", main.get("feels_like"));
                openWeatherResult.put("humidity", main.get("humidity"));
                openWeatherResult.put("pressure", main.get("pressure"));
            }
            
            if (openWeatherData.containsKey("wind")) {
                Map<String, Object> wind = (Map<String, Object>) openWeatherData.get("wind");
                openWeatherResult.put("wind_speed", wind.get("speed"));
            }
            
            if (openWeatherData.containsKey("weather") && ((List<?>) openWeatherData.get("weather")).size() > 0) {
                Map<String, Object> weather = (Map<String, Object>) ((List<?>) openWeatherData.get("weather")).get(0);
                openWeatherResult.put("condition", weather.get("description"));
                openWeatherResult.put("icon", weather.get("icon"));
            }
        }
        result.put("openWeatherMap", openWeatherResult);
        
        // Extract data from WeatherAPI
        Map<String, Object> weatherApiResult = new HashMap<>();
        if (weatherApiData != null && weatherApiData.containsKey("current")) {
            Map<String, Object> current = (Map<String, Object>) weatherApiData.get("current");
            weatherApiResult.put("temperature", current.get("temp_c"));
            weatherApiResult.put("feels_like", current.get("feelslike_c"));
            weatherApiResult.put("humidity", current.get("humidity"));
            weatherApiResult.put("pressure", current.get("pressure_mb"));
            weatherApiResult.put("wind_speed", current.get("wind_kph"));
            
            if (current.containsKey("condition")) {
                Map<String, Object> condition = (Map<String, Object>) current.get("condition");
                weatherApiResult.put("condition", condition.get("text"));
                weatherApiResult.put("icon", condition.get("icon"));
            }
        }
        result.put("weatherAPI", weatherApiResult);
        
        // Generate analysis
        String analysis = generateAnalysis(openWeatherResult, weatherApiResult);
        result.put("analysis", analysis);
        
        return ResponseEntity.ok(result);
        
    } catch (Exception e) {
        logger.error("Failed to compare weather APIs for city: {}", city, e);
        
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Failed to compare weather APIs: " + e.getMessage());
        errorResponse.put("city", city);
        
        // Return a fallback response with dummy data
        return ResponseEntity.status(500).body(getFallbackComparisonData(city));
    }
}
    
    @GetMapping("/forecast/{city}")
    public ResponseEntity<Map<String, Object>> getForecast(@PathVariable String city) {
        try {
            logger.debug("Fetching WeatherAPI forecast data for city: {}", city);
            
            String url = "https://api.weatherapi.com/v1/forecast.json?key=" + weatherApiKey + 
                         "&q=" + city + "&days=6&lang=fr";
            
            logger.debug("Calling WeatherAPI forecast: {}", url.replace(weatherApiKey, "API_KEY"));
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            
            if (response == null) {
                throw new RuntimeException("Null response from WeatherAPI");
            }
            
            // Process and return the data
            Map<String, Object> result = new HashMap<>();
            
            if (response.containsKey("forecast")) {
                Map<String, Object> forecast = (Map<String, Object>) response.get("forecast");
                List<Map<String, Object>> forecastdays = (List<Map<String, Object>>) forecast.get("forecastday");
                
                List<Map<String, Object>> daily = new ArrayList<>();
                List<Map<String, Object>> hourly = new ArrayList<>();
                
                for (Map<String, Object> day : forecastdays) {
                    // Process daily forecast
                    Map<String, Object> dayForecast = new HashMap<>();
                    dayForecast.put("date", day.get("date"));
                    
                    Map<String, Object> dayData = (Map<String, Object>) day.get("day");
                    dayForecast.put("temp", Map.of(
                        "max", dayData.get("maxtemp_c"),
                        "min", dayData.get("mintemp_c")
                    ));
                    dayForecast.put("humidity", dayData.get("avghumidity"));
                    dayForecast.put("wind_speed", dayData.get("maxwind_kph"));
                    
                    Map<String, Object> condition = (Map<String, Object>) dayData.get("condition");
                    dayForecast.put("weather", Map.of(
                        "description", condition.get("text"),
                        "icon", condition.get("icon"),
                        "main", condition.get("text")
                    ));
                    
                    daily.add(dayForecast);
                    
                    // Process hourly forecast
                    List<Map<String, Object>> hours = (List<Map<String, Object>>) day.get("hour");
                    for (Map<String, Object> hour : hours) {
                        Map<String, Object> hourForecast = new HashMap<>();
                        hourForecast.put("time", hour.get("time"));
                        hourForecast.put("temp", hour.get("temp_c"));
                        hourForecast.put("humidity", hour.get("humidity"));
                        hourForecast.put("wind_speed", hour.get("wind_kph"));
                        
                        Map<String, Object> hourCondition = (Map<String, Object>) hour.get("condition");
                        hourForecast.put("weather", Map.of(
                            "description", hourCondition.get("text"),
                            "icon", hourCondition.get("icon"),
                            "main", hourCondition.get("text")
                        ));
                        
                        hourly.add(hourForecast);
                    }
                }
                
                result.put("daily", daily);
                result.put("hourly", hourly);
            }
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Failed to fetch WeatherAPI forecast data for city: {}", city, e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch WeatherAPI forecast data: " + e.getMessage());
            errorResponse.put("city", city);
            
            // Return a valid but empty object to avoid client-side errors
            return ResponseEntity.status(500).body(Map.of(
                "daily", new ArrayList<>(),
                "hourly", new ArrayList<>()
            ));
        }
    }
    
    @GetMapping("/test-config")
    public ResponseEntity<Map<String, Object>> testConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("weatherApiKey", weatherApiKey != null ? "Configured" : "Not configured");
        config.put("openWeatherApiKey", openWeatherApiKey != null ? "Configured" : "Not configured");
        return ResponseEntity.ok(config);
    }
    
    private Map<String, Object> processWeatherApiData(Map<String, Object> data) {
        Map<String, Object> result = new HashMap<>();
        
        // Process location data
        if (data.containsKey("location")) {
            result.put("location", data.get("location"));
        }
        
        // Process current weather data
        if (data.containsKey("current")) {
            result.put("current", data.get("current"));
        }
        
        return result;
    }
    
    private String generateAnalysis(Map<String, Object> openWeatherData, Map<String, Object> weatherApiData) {
        StringBuilder analysis = new StringBuilder();
        
        try {
            // Compare temperatures
            if (openWeatherData.containsKey("temperature") && weatherApiData.containsKey("temperature")) {
                double openWeatherTemp = convertToDouble(openWeatherData.get("temperature"));
                double weatherApiTemp = convertToDouble(weatherApiData.get("temperature"));
                double tempDiff = Math.abs(openWeatherTemp - weatherApiTemp);
                
                analysis.append("Les deux API montrent une température de ");
                if (tempDiff < 0.5) {
                    analysis.append("quasiment identique avec une différence mineure de ")
                           .append(String.format("%.1f", tempDiff)).append("°C. ");
                } else if (tempDiff < 2.0) {
                    analysis.append("similaire avec une différence modérée de ")
                           .append(String.format("%.1f", tempDiff)).append("°C. ");
                } else {
                    analysis.append("différente avec un écart significatif de ")
                           .append(String.format("%.1f", tempDiff)).append("°C. ");
                }
            }
            
            // Compare humidity
            if (openWeatherData.containsKey("humidity") && weatherApiData.containsKey("humidity")) {
                double openWeatherHumidity = convertToDouble(openWeatherData.get("humidity"));
                double weatherApiHumidity = convertToDouble(weatherApiData.get("humidity"));
                double humidityDiff = Math.abs(openWeatherHumidity - weatherApiHumidity);
                
                analysis.append("L'humidité est ");
                if (humidityDiff < 5) {
                    analysis.append("très similaire avec seulement ").append((int)humidityDiff).append("% d'écart.");
                } else if (humidityDiff < 15) {
                    analysis.append("assez similaire avec ").append((int)humidityDiff).append("% d'écart.");
                } else {
                    analysis.append("significativement différente avec ").append((int)humidityDiff).append("% d'écart.");
                }
            }
            
            if (analysis.length() == 0) {
                analysis.append("Impossible de comparer les données en raison d'informations manquantes.");
            }
            
        } catch (Exception e) {
            logger.error("Error generating analysis", e);
            analysis = new StringBuilder("Analyse indisponible en raison d'erreurs de traitement.");
        }
        
        return analysis.toString();
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
    
    private Map<String, Object> getFallbackComparisonData(String city) {
        Map<String, Object> result = new HashMap<>();
        result.put("city", city);
        result.put("timestamp", new Date().getTime());
        
        Map<String, Object> openWeatherMap = new HashMap<>();
        openWeatherMap.put("temperature", 18.2);
        openWeatherMap.put("humidity", 65);
        openWeatherMap.put("condition", "Ensoleillé");
        
        Map<String, Object> alternativeApi = new HashMap<>();
        alternativeApi.put("temperature", 17.8);
        alternativeApi.put("humidity", 63);
        alternativeApi.put("condition", "Clair");
        
        result.put("openWeatherMap", openWeatherMap);
        result.put("alternativeApi", alternativeApi);
        result.put("analysis", "Les deux API montrent des conditions similaires (données de secours).");
        result.put("fallback", true);
        
        return result;
    }
}