package com.backend.demo.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.text.SimpleDateFormat;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "http://localhost:4200")
@RestController
@RequestMapping("/api/weather")
public class WeatherController {

    private static final Logger logger = LoggerFactory.getLogger(WeatherController.class);

    @Value("${openweather.api.key}")
    private String openWeatherKey;

    private final RestTemplate restTemplate;

    public WeatherController(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @GetMapping("/{city}")
    public ResponseEntity<Map<String, Object>> getWeatherData(@PathVariable String city) {
        Map<String, Object> response = new LinkedHashMap<>();
        
        try {
            logger.debug("Fetching weather data for city: {}", city);
            
            // 1. Get current weather
            Map<String, Object> currentWeather = getOpenWeatherData("weather", city);
            if (currentWeather.containsKey("error")) {
                throw new RuntimeException((String) currentWeather.get("error"));
            }
            
            // Extract coordinates for forecast
            Map<String, Object> coord = (Map<String, Object>) currentWeather.get("coord");
            if (coord == null) {
                throw new RuntimeException("Could not find coordinates for city: " + city);
            }
            
            double lat = convertToDouble(coord.get("lat"));
            double lon = convertToDouble(coord.get("lon"));
            
            // 2. Get forecast using coordinates
            Map<String, Object> forecast = getOpenWeatherData("forecast", lat, lon);
            if (forecast.containsKey("error")) {
                throw new RuntimeException((String) forecast.get("error"));
            }
            
            // 3. Process data
            response.put("current", processCurrentWeather(currentWeather));
            response.put("forecast", processForecastData(forecast));
            response.put("coord", currentWeather.get("coord"));
            response.put("sys", currentWeather.get("sys"));
            response.put("name", currentWeather.get("name"));
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Failed to fetch weather data for city: {}", city, e);
            response.put("error", "Failed to fetch weather data: " + e.getMessage());
            
            // Add default fields to avoid client-side errors
            response.put("current", getDefaultCurrentWeather());
            response.put("forecast", getDefaultForecast());
            response.put("coord", Map.of("lat", 0, "lon", 0));
            response.put("sys", Map.of("country", ""));
            response.put("name", city);
            
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchLocations(@RequestParam String q) {
        String url = "https://api.openweathermap.org/geo/1.0/direct?q=" + q + 
                    "&limit=5&appid=" + openWeatherKey;
        
        try {
            logger.debug("Searching locations for query: {}", q);
            Object[] locations = restTemplate.getForObject(url, Object[].class);
            return ResponseEntity.ok(Map.of("locations", locations != null ? locations : new Object[0]));
        } catch (Exception e) {
            logger.error("Location search failed for query: {}", q, e);
            return ResponseEntity.status(500)
                .body(Map.of("error", "Location search failed: " + e.getMessage()));
        }
    }

    @GetMapping("/coordinates")
    public ResponseEntity<Map<String, Object>> getWeatherByCoordinates(
            @RequestParam double lat, 
            @RequestParam double lon) {
        
        try {
            logger.debug("Fetching weather data for coordinates: lat={}, lon={}", lat, lon);
            
            // 1. Get current weather data
            String weatherUrl = "https://api.openweathermap.org/data/2.5/weather?lat=" + lat + 
                      "&lon=" + lon + "&appid=" + openWeatherKey + "&units=metric&lang=fr";
            
            logger.debug("Calling current weather API: {}", weatherUrl.replace(openWeatherKey, "API_KEY"));
            Map<String, Object> weatherData = restTemplate.getForObject(weatherUrl, Map.class);
            
            if (weatherData == null) {
                throw new RuntimeException("Null response from weather API");
            }
            
            // 2. Get forecast data - using direct approach instead of helper method
            String forecastUrl = "https://api.openweathermap.org/data/2.5/forecast?lat=" + lat + 
                      "&lon=" + lon + "&appid=" + openWeatherKey + "&units=metric&lang=fr";
            
            logger.debug("Calling forecast API: {}", forecastUrl.replace(openWeatherKey, "API_KEY"));
            Map<String, Object> forecastData = restTemplate.getForObject(forecastUrl, Map.class);
            
            if (forecastData == null) {
                throw new RuntimeException("Null response from forecast API");
            }
            
            logger.debug("Processing weather and forecast data");
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("current", processCurrentWeather(weatherData));
            response.put("forecast", processForecastData(forecastData));
            response.put("coord", weatherData.get("coord"));
            response.put("sys", weatherData.get("sys"));
            response.put("name", weatherData.get("name"));
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Weather by coordinates failed: lat={}, lon={}", lat, lon, e);
            
            Map<String, Object> errorResponse = new LinkedHashMap<>();
            errorResponse.put("error", "Weather by coordinates failed: " + e.getMessage());
            errorResponse.put("coord", Map.of("lat", lat, "lon", lon));
            
            // Return a valid but empty object to avoid client-side errors
            errorResponse.put("current", getDefaultCurrentWeather());
            errorResponse.put("forecast", getDefaultForecast());
            errorResponse.put("name", "");
            errorResponse.put("sys", Map.of("country", ""));
            
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    @GetMapping("/forecast/{city}")
    public ResponseEntity<Map<String, Object>> getForecast(@PathVariable String city) {
        try {
            logger.debug("Fetching forecast data for city: {}", city);
            
            // Get forecast using coordinates
            Map<String, Object> forecast = getOpenWeatherData("forecast", city);
            if (forecast.containsKey("error")) {
                throw new RuntimeException((String) forecast.get("error"));
            }
            
            // Process and return the data
            return ResponseEntity.ok(processForecastData(forecast));
            
        } catch (Exception e) {
            logger.error("Failed to fetch forecast data for city: {}", city, e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to fetch forecast data: " + e.getMessage());
            errorResponse.put("city", city);
            
            // Return a valid but empty object to avoid client-side errors
            return ResponseEntity.status(500).body(getDefaultForecast());
        }
    }

    private Map<String, Object> getOpenWeatherData(String endpoint, String city) {
        String url = "https://api.openweathermap.org/data/2.5/" + endpoint + 
                    "?q=" + city + "&appid=" + openWeatherKey + "&units=metric&lang=fr";
        return fetchWeatherData(url);
    }

    private Map<String, Object> getOpenWeatherData(String endpoint, double lat, double lon) {
        String url = "https://api.openweathermap.org/data/2.5/" + endpoint + 
                    "?lat=" + lat + "&lon=" + lon + "&appid=" + openWeatherKey + 
                    "&units=metric&lang=fr";
        return fetchWeatherData(url);
    }

    private Map<String, Object> fetchWeatherData(String url) {
        try {
            logger.debug("Fetching data from: {}", url.replace(openWeatherKey, "API_KEY"));
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response == null) {
                return Map.of("error", "Null response from weather API");
            }
            return response;
        } catch (Exception e) {
            logger.error("Error fetching weather data", e);
            return Map.of("error", "Error fetching weather data: " + e.getMessage());
        }
    }

    private Map<String, Object> getDefaultCurrentWeather() {
        return Map.of(
            "temp", 0,
            "feels_like", 0,
            "humidity", 0,
            "pressure", 0,
            "visibility", 0,
            "weather", Map.of(
                "description", "Inconnu",
                "icon", "01d"
            ),
            "wind", Map.of(
                "speed", 0,
                "deg", 0
            )
        );
    }

    private Map<String, Object> getDefaultForecast() {
        return Map.of(
            "hourly", new ArrayList<>(),
            "daily", new ArrayList<>()
        );
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> processCurrentWeather(Map<String, Object> data) {
        try {
            Map<String, Object> main = (Map<String, Object>) data.get("main");
            Map<String, Object> wind = (Map<String, Object>) data.get("wind");
            List<Map<String, Object>> weather = (List<Map<String, Object>>) data.get("weather");
            
            if (main == null) main = new HashMap<>();
            if (wind == null) wind = new HashMap<>();
            if (weather == null || weather.isEmpty()) {
                weather = Collections.singletonList(Map.of(
                    "description", "Inconnu",
                    "icon", "01d"
                ));
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("temp", convertToDouble(main.getOrDefault("temp", 0)));
            result.put("feels_like", convertToDouble(main.getOrDefault("feels_like", 0)));
            result.put("humidity", convertToDouble(main.getOrDefault("humidity", 0)));
            result.put("pressure", convertToDouble(main.getOrDefault("pressure", 0)));
            result.put("visibility", data.containsKey("visibility") ? 
                    convertToDouble(data.get("visibility")) / 1000 : 0);
            result.put("weather", weather.get(0));
            result.put("wind", wind);
            
            return result;
        } catch (Exception e) {
            logger.error("Error processing current weather data", e);
            // Return a valid object even in case of error
            return getDefaultCurrentWeather();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> processForecastData(Map<String, Object> forecast) {
        try {
            List<Map<String, Object>> list = (List<Map<String, Object>>) forecast.get("list");
            if (list == null || list.isEmpty()) {
                return getDefaultForecast();
            }
            
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd");
            
            // Hourly forecast (next 24 hours)
            List<Map<String, Object>> hourly = list.stream()
                .limit(24)
                .map(item -> {
                    try {
                        Map<String, Object> main = (Map<String, Object>) item.get("main");
                        List<Map<String, Object>> weather = (List<Map<String, Object>>) item.get("weather");
                        Map<String, Object> wind = (Map<String, Object>) item.get("wind");
                        
                        if (main == null) main = new HashMap<>();
                        if (weather == null || weather.isEmpty()) {
                            weather = Collections.singletonList(Map.of(
                                "description", "Inconnu",
                                "icon", "01d"
                            ));
                        }
                        if (wind == null) wind = Map.of("speed", 0, "deg", 0);
                        
                        Map<String, Object> result = new HashMap<>();
                        result.put("dt", item.get("dt"));
                        result.put("temp", convertToDouble(main.getOrDefault("temp", 0)));
                        result.put("icon", weather.get(0).get("icon"));
                        result.put("description", weather.get(0).get("description"));
                        result.put("pop", convertToDouble(item.getOrDefault("pop", 0)));
                        result.put("wind", wind);
                        
                        return result;
                    } catch (Exception e) {
                        logger.error("Error processing hourly forecast item", e);
                        // Return a valid object in case of error
                        return Map.of(
                            "dt", System.currentTimeMillis() / 1000,
                            "temp", 0,
                            "icon", "01d",
                            "description", "Inconnu",
                            "pop", 0,
                            "wind", Map.of("speed", 0, "deg", 0)
                        );
                    }
                })
                .collect(Collectors.toList());
            
            // Daily forecast (next 5 days)
            Map<String, List<Map<String, Object>>> dailyMap = new LinkedHashMap<>();
            
            list.forEach(item -> {
                try {
                    Object dtObj = item.get("dt");
                    long dt = 0;
                    if (dtObj instanceof Integer) {
                        dt = ((Integer) dtObj).longValue() * 1000L;
                    } else if (dtObj instanceof Long) {
                        dt = (Long) dtObj * 1000L;
                    }
                    
                    String date = sdf.format(new Date(dt));
                    dailyMap.computeIfAbsent(date, k -> new ArrayList<>()).add(item);
                } catch (Exception e) {
                    logger.error("Error processing daily forecast grouping", e);
                    // Ignore items with errors
                }
            });
            
            List<Map<String, Object>> daily = dailyMap.entrySet().stream()
                .limit(7) // Get the first 5 days
                .map(entry -> {
                    try {
                        List<Map<String, Object>> dayItems = entry.getValue();
                        List<Double> temps = dayItems.stream()
                            .map(i -> {
                                Map<String, Object> main = (Map<String, Object>) i.get("main");
                                return main != null ? convertToDouble(main.getOrDefault("temp", 0)) : 0.0;
                            })
                            .collect(Collectors.toList());
                        
                        Map<String, Object> firstItem = dayItems.get(0);
                        List<Map<String, Object>> weather = (List<Map<String, Object>>) firstItem.get("weather");
                        
                        if (weather == null || weather.isEmpty()) {
                            weather = Collections.singletonList(Map.of(
                                "description", "Inconnu",
                                "icon", "01d"
                            ));
                        }
                        
                        Map<String, Object> result = new HashMap<>();
                        result.put("dt", firstItem.get("dt"));
                        result.put("temp", Map.of(
                            "min", temps.isEmpty() ? 0 : Collections.min(temps),
                            "max", temps.isEmpty() ? 0 : Collections.max(temps)
                        ));
                        result.put("weather", weather.get(0));
                        result.put("pop", dayItems.stream()
                            .mapToDouble(i -> convertToDouble(i.getOrDefault("pop", 0d)))
                            .max()
                            .orElse(0d));
                        
                        return result;
                    } catch (Exception e) {
                        logger.error("Error processing daily forecast item", e);
                        // Return a valid object in case of error
                        return Map.of(
                            "dt", System.currentTimeMillis() / 1000,
                            "temp", Map.of("min", 0, "max", 0),
                            "weather", Map.of("description", "Inconnu", "icon", "01d"),
                            "pop", 0
                        );
                    }
                })
                .collect(Collectors.toList());
            
            return Map.of(
                "hourly", hourly,
                "daily", daily
            );
        } catch (Exception e) {
            logger.error("Error processing forecast data", e);
            // Return a valid object in case of error
            return getDefaultForecast();
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

    private long convertTimestamp(Object timestamp) {
        if (timestamp instanceof Integer) {
            return ((Integer) timestamp).longValue() * 1000L;
        } else if (timestamp instanceof Long) {
            return (Long) timestamp * 1000L;
        }
        return 0L;
    }
}