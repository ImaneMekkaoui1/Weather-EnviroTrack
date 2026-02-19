import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { WeatherService } from '../../../shared/services/weather.service';
import { OpenAPIService } from '../../../shared/services/open-api.service';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';

interface WeatherComparison {
  city: string;
  timestamp: number;
  openWeather: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    description: string;
  };
  weatherApi: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
    description: string;
  };
  differences: {
    temperature: number;
    feelsLike: number;
    humidity: number;
    pressure: number;
    windSpeed: number;
  };
  loading: boolean;
  error: string | null;
}

interface ForecastComparison {
  date: Date;
  openWeather: {
    temperature: number;
    description: string;
  };
  weatherApi: {
    temperature: number;
    description: string;
  };
  actual: {
    temperature: number;
    description: string;
  };
  accuracy: {
    openWeather: number;
    weatherApi: number;
  };
}

interface HistoricalComparison {
  city: string;
  date: Date;
  forecastDate: Date;
  openWeather: {
    temperature: number;
    description: string;
  };
  weatherApi: {
    temperature: number;
    description: string;
  };
  actual: {
    temperature: number;
    description: string;
  };
  accuracy: {
    openWeather: number;
    weatherApi: number;
  };
}

@Component({
  selector: 'app-compare-weather',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './compare-weather.component.html',
  styleUrls: ['./compare-weather.component.css']
})
export class CompareWeatherComponent implements OnInit {
  searchForm: FormGroup;
  comparison: WeatherComparison | null = null;
  searchHistory: string[] = [];
  loading = false;
  accuracy = {
    openWeather: 0,
    weatherApi: 0
  };
  
  currentDate = new Date();
  recentCities = ['El Jadida', 'Casablanca', 'Rabat', 'Marrakech', 'Agadir'];
  
  // Nouvelles propriétés
  forecasts: ForecastComparison[] = [];
  historicalData: HistoricalComparison[] = [];
  selectedTab: 'current' | 'forecast' | 'history' = 'current';

  constructor(
    private formBuilder: FormBuilder,
    private weatherService: WeatherService,
    private openApiService: OpenAPIService
  ) {
    this.searchForm = this.formBuilder.group({
      cityName: ['', [Validators.required, Validators.minLength(2)]]
    });
    
    const savedHistory = localStorage.getItem('weatherComparisonHistory');
    if (savedHistory) {
      this.searchHistory = JSON.parse(savedHistory);
    }

    const savedHistoricalData = localStorage.getItem('weatherHistoricalData');
    if (savedHistoricalData) {
      this.historicalData = JSON.parse(savedHistoricalData);
    }
  }

  ngOnInit(): void {
    const lastCity = this.searchHistory[0] || 'El Jadida';
    this.searchForm.get('cityName')?.setValue(lastCity);
    this.compareWeather(lastCity);
  }

  onSubmit(): void {
    if (this.searchForm.valid) {
      const city = this.searchForm.get('cityName')?.value;
      if (city) {
        this.compareWeather(city);
      }
    }
  }

  compareWeather(city: string): void {
    this.loading = true;
    this.comparison = null;
    
    // Récupérer les données actuelles
    forkJoin({
      openWeather: this.weatherService.getCurrentWeather(city).pipe(
        catchError(err => {
          console.error('OpenWeather API error:', err);
          return of(null);
        })
      ),
      weatherApi: this.openApiService.getWeather(city).pipe(
        catchError(err => {
          console.error('WeatherAPI error:', err);
          return of(null);
        })
      ),
      // Récupérer les prévisions sur 6 jours
      openWeatherForecast: this.weatherService.getForecast(city, '6'),
      weatherApiForecast: this.openApiService.getForecast(city, '6')
    }).subscribe({
      next: (result) => {
        // Traiter les données actuelles
        this.processCurrentWeather(city, result.openWeather, result.weatherApi);
        
        // Traiter les prévisions
        this.processForecasts(city, result.openWeatherForecast, result.weatherApiForecast);
        
        // Sauvegarder les données historiques
        this.saveHistoricalData(city, result.openWeather, result.weatherApi);
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Comparison error:', err);
        this.loading = false;
        this.handleError(city, err);
      }
    });
  }

  private processCurrentWeather(city: string, openWeatherData: any, weatherApiData: any): void {
    const openWeatherProcessed = {
      temperature: this.extractOpenWeatherTemperature(openWeatherData),
      feelsLike: this.extractOpenWeatherFeelsLike(openWeatherData),
      humidity: this.extractOpenWeatherHumidity(openWeatherData),
      pressure: this.extractOpenWeatherPressure(openWeatherData),
      windSpeed: this.extractOpenWeatherWindSpeed(openWeatherData),
      description: this.extractOpenWeatherDescription(openWeatherData)
    };

    const weatherApiProcessed = {
      temperature: this.extractNumberValue(weatherApiData?.current?.temp_c),
      feelsLike: this.extractNumberValue(weatherApiData?.current?.feelslike_c),
      humidity: this.extractNumberValue(weatherApiData?.current?.humidity),
      pressure: this.extractNumberValue(weatherApiData?.current?.pressure_mb),
      windSpeed: this.extractNumberValue(weatherApiData?.current?.wind_kph, (val) => val / 3.6),
      description: weatherApiData?.current?.condition?.text || 'N/A'
    };

    const differences = {
      temperature: this.calculateDifference(openWeatherProcessed.temperature, weatherApiProcessed.temperature),
      feelsLike: this.calculateDifference(openWeatherProcessed.feelsLike, weatherApiProcessed.feelsLike),
      humidity: this.calculateDifference(openWeatherProcessed.humidity, weatherApiProcessed.humidity),
      pressure: this.calculateDifference(openWeatherProcessed.pressure, weatherApiProcessed.pressure),
      windSpeed: this.calculateDifference(openWeatherProcessed.windSpeed, weatherApiProcessed.windSpeed)
    };

    this.comparison = {
      city,
      timestamp: Date.now(),
      openWeather: openWeatherProcessed,
      weatherApi: weatherApiProcessed,
      differences,
      loading: false,
      error: null
    };

    this.calculateAccuracy();
    this.addToHistory(city);
  }

  private processForecasts(city: string, openWeatherForecast: any, weatherApiForecast: any): void {
    this.forecasts = [];
    // Traiter les prévisions sur 6 jours
    for (let i = 1; i <= 6; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const openWeatherDay = this.extractOpenWeatherForecast(openWeatherForecast, i);
      const weatherApiDay = this.extractWeatherApiForecast(weatherApiForecast, i);
      // On ne calcule plus de température réelle fictive
      const accuracy = {
        openWeather: 0,
        weatherApi: 0
      };
      // Si les deux APIs ont une valeur, on compare à la moyenne
      if (openWeatherDay.temperature && weatherApiDay.temperature) {
        const avg = (openWeatherDay.temperature + weatherApiDay.temperature) / 2;
        accuracy.openWeather = this.calculateForecastAccuracy(openWeatherDay.temperature, avg);
        accuracy.weatherApi = this.calculateForecastAccuracy(weatherApiDay.temperature, avg);
      }
      this.forecasts.push({
        date,
        openWeather: openWeatherDay,
        weatherApi: weatherApiDay,
        actual: { temperature: 0, description: 'N/A' }, // On ne met plus de "température réelle"
        accuracy
      });
    }
  }

  private saveHistoricalData(city: string, openWeatherData: any, weatherApiData: any): void {
    const historicalEntry: HistoricalComparison = {
      city,
      date: new Date(),
      forecastDate: new Date(),
      openWeather: {
        temperature: this.extractOpenWeatherTemperature(openWeatherData),
        description: this.extractOpenWeatherDescription(openWeatherData)
      },
      weatherApi: {
        temperature: this.extractNumberValue(weatherApiData?.current?.temp_c),
        description: weatherApiData?.current?.condition?.text || 'N/A'
      },
      actual: {
        temperature: (this.extractOpenWeatherTemperature(openWeatherData) + 
                     this.extractNumberValue(weatherApiData?.current?.temp_c)) / 2,
        description: this.extractOpenWeatherDescription(openWeatherData)
      },
      accuracy: {
        openWeather: 0,
        weatherApi: 0
      }
    };

    // Calculer la précision
    historicalEntry.accuracy.openWeather = this.calculateForecastAccuracy(
      historicalEntry.openWeather.temperature,
      historicalEntry.actual.temperature
    );
    historicalEntry.accuracy.weatherApi = this.calculateForecastAccuracy(
      historicalEntry.weatherApi.temperature,
      historicalEntry.actual.temperature
    );

    // Ajouter aux données historiques
    this.historicalData.unshift(historicalEntry);
    
    // Garder seulement les 100 dernières entrées
    if (this.historicalData.length > 100) {
      this.historicalData = this.historicalData.slice(0, 100);
    }

    // Sauvegarder dans le localStorage
    localStorage.setItem('weatherHistoricalData', JSON.stringify(this.historicalData));
  }

  private calculateForecastAccuracy(forecast: number, actual: number): number {
    const difference = Math.abs(forecast - actual);
    if (difference <= 1) return 100;
    if (difference <= 2) return 80;
    if (difference <= 3) return 60;
    if (difference <= 4) return 40;
    if (difference <= 5) return 20;
    return 0;
  }

  private extractOpenWeatherForecast(data: any, dayIndex: number): { temperature: number; description: string } {
    if (!data?.daily?.[dayIndex]) {
      return { temperature: 0, description: 'N/A' };
    }
    const day = data.daily[dayIndex];
    // PAS de conversion Kelvin->Celsius car l'API renvoie déjà en Celsius
    return {
      temperature: day.temp?.day ?? day.temp?.max ?? 0,
      description: (day.weather && day.weather[0] && day.weather[0].description)
        || day.condition?.text
        || day.description
        || 'N/A'
    };
  }

  private extractWeatherApiForecast(data: any, dayIndex: number): { temperature: number; description: string } {
    if (!data?.forecast?.forecastday?.[dayIndex]) {
      return { temperature: 0, description: 'N/A' };
    }
    
    return {
      temperature: data.forecast.forecastday[dayIndex].day.avgtemp_c,
      description: data.forecast.forecastday[dayIndex].day.condition.text
    };
  }

  // Vérifier si les données sont valides
  private hasValidData(data: any): boolean {
    return !!data && typeof data === 'object';
  }

  // NOUVELLES MÉTHODES D'EXTRACTION pour gérer les différentes structures possibles de la réponse OpenWeather
  private extractOpenWeatherTemperature(data: any): number {
    if (!data) return 0;
    
    // Vérifier d'abord si nous avons la structure "current"
    if (data.current && typeof data.current.temp === 'number') {
      return this.roundValue(data.current.temp);
    }
    
    // Sinon, vérifier la structure "main"
    if (data.main && typeof data.main.temp === 'number') {
      // Convertir de Kelvin à Celsius si nécessaire (OpenWeather retourne Kelvin par défaut)
      return this.kelvinToCelsius(data.main.temp);
    }
    
    // Vérifier s'il y a une propriété "temp" directement dans l'objet
    if (typeof data.temp === 'number') {
      return this.roundValue(data.temp);
    }
    
    return 0;
  }

  private extractOpenWeatherFeelsLike(data: any): number {
    if (!data) return 0;
    
    // Structure "current"
    if (data.current && typeof data.current.feels_like === 'number') {
      return this.roundValue(data.current.feels_like);
    }
    
    // Structure "main"
    if (data.main && typeof data.main.feels_like === 'number') {
      return this.kelvinToCelsius(data.main.feels_like);
    }
    
    // Propriété directe
    if (typeof data.feels_like === 'number') {
      return this.roundValue(data.feels_like);
    }
    
    return 0;
  }

  private extractOpenWeatherHumidity(data: any): number {
    if (!data) return 0;
    
    // Structure "current"
    if (data.current && typeof data.current.humidity === 'number') {
      return this.roundValue(data.current.humidity);
    }
    
    // Structure "main"
    if (data.main && typeof data.main.humidity === 'number') {
      return this.roundValue(data.main.humidity);
    }
    
    // Propriété directe
    if (typeof data.humidity === 'number') {
      return this.roundValue(data.humidity);
    }
    
    return 0;
  }

  private extractOpenWeatherPressure(data: any): number {
    if (!data) return 0;
    
    // Structure "current"
    if (data.current && typeof data.current.pressure === 'number') {
      return this.roundValue(data.current.pressure);
    }
    
    // Structure "main"
    if (data.main && typeof data.main.pressure === 'number') {
      return this.roundValue(data.main.pressure);
    }
    
    // Propriété directe
    if (typeof data.pressure === 'number') {
      return this.roundValue(data.pressure);
    }
    
    return 0;
  }

  private extractOpenWeatherWindSpeed(data: any): number {
    if (!data) return 0;
    
    // Structure "current"
    if (data.current && data.current.wind && typeof data.current.wind.speed === 'number') {
      return this.roundValue(data.current.wind.speed);
    }
    
    // Structure standard
    if (data.wind && typeof data.wind.speed === 'number') {
      return this.roundValue(data.wind.speed);
    }
    
    // Propriété imbriquée
    if (data.wind && data.wind.speed) {
      return this.roundValue(data.wind.speed);
    }
    
    return 0;
  }
  
  // Méthode pour extraire la description météo OpenWeather
  private extractOpenWeatherDescription(data: any): string {
    if (!data) return 'N/A';
    
    // Structure "current"
    if (data.current && data.current.weather && Array.isArray(data.current.weather) && data.current.weather.length > 0) {
      return data.current.weather[0].description || 'N/A';
    }
    
    // Structure standard
    if (data.weather && Array.isArray(data.weather) && data.weather.length > 0) {
      return data.weather[0].description || 'N/A';
    }
    
    return 'N/A';
  }

  // Extraction sécurisée des valeurs numériques avec conversion optionnelle
  private extractNumberValue(value: any, converter?: (val: number) => number): number {
    if (value === undefined || value === null || isNaN(Number(value))) {
      return 0;
    }
    const numValue = Number(value);
    return converter ? converter(numValue) : numValue;
  }

  // Calcul sécurisé des différences
  private calculateDifference(val1: number, val2: number): number {
    if (isNaN(val1) || isNaN(val2)) {
      return 0;
    }
    return Number((val1 - val2).toFixed(2));
  }

  // Conversion de Kelvin à Celsius avec arrondi
  private kelvinToCelsius(kelvin: number): number {
    if (isNaN(kelvin) || kelvin === 0) return 0;
    return Number((kelvin - 273.15).toFixed(2));
  }
  
  // Arrondir à deux décimales
  private roundValue(value: number): number {
    if (isNaN(value)) return 0;
    return Number(value.toFixed(2));
  }
  
  private addToHistory(city: string): void {
    this.searchHistory = this.searchHistory.filter(c => c.toLowerCase() !== city.toLowerCase());
    this.searchHistory.unshift(city);
    if (this.searchHistory.length > 10) {
      this.searchHistory.pop();
    }
    localStorage.setItem('weatherComparisonHistory', JSON.stringify(this.searchHistory));
  }
  
  selectCity(city: string): void {
    this.searchForm.get('cityName')?.setValue(city);
    this.compareWeather(city);
  }
  
  // Méthode de calcul d'exactitude sécurisée pour éviter les NaN
  private calculateAccuracy(): void {
    if (!this.comparison) return;
    
    // Vérifier si nous avons des données valides pour au moins une API
    const hasOpenWeatherData = this.comparison.openWeather.temperature > 0 || 
                              this.comparison.openWeather.humidity > 0 ||
                              this.comparison.openWeather.pressure > 0;
    
    const hasWeatherApiData = this.comparison.weatherApi.temperature > 0 || 
                             this.comparison.weatherApi.humidity > 0 ||
                             this.comparison.weatherApi.pressure > 0;
    
    if (!hasOpenWeatherData && !hasWeatherApiData) {
      this.accuracy.openWeather = 0;
      this.accuracy.weatherApi = 0;
      return;
    }
    
    // Si une seule API a des données, lui attribuer toute la précision
    if (!hasOpenWeatherData && hasWeatherApiData) {
      this.accuracy.openWeather = 0;
      this.accuracy.weatherApi = 100;
      return;
    }
    
    if (hasOpenWeatherData && !hasWeatherApiData) {
      this.accuracy.openWeather = 100;
      this.accuracy.weatherApi = 0;
      return;
    }
    
    // Calculer la précision basée sur la différence absolue
    const tempDiff = Math.abs(this.comparison.differences.temperature) || 0;
    const humidityDiff = Math.abs(this.comparison.differences.humidity) || 0;
    const pressureDiff = Math.abs(this.comparison.differences.pressure) || 0;
    const windDiff = Math.abs(this.comparison.differences.windSpeed) || 0;
    
    // Calculer des scores sur 100 pour chaque paramètre
    const tempScore = this.calculateParameterScore(tempDiff, 10);
    const humidityScore = this.calculateParameterScore(humidityDiff, 20);
    const pressureScore = this.calculateParameterScore(pressureDiff, 50);
    const windScore = this.calculateParameterScore(windDiff, 5);
    
    // Moyenne pondérée des scores
    const totalScore = (tempScore * 0.4) + (humidityScore * 0.2) + (pressureScore * 0.2) + (windScore * 0.2);
    
    // Répartir le score entre les deux APIs
    if (Math.abs(totalScore) < 0.01) {
      // Si le score est pratiquement identique, distribution égale
      this.accuracy.openWeather = 50;
      this.accuracy.weatherApi = 50;
    } else {
      // Répartition proportionnelle basée sur les lectures de température
      // Plus la température est proche de la moyenne des deux, plus elle est précise
      const avgTemp = (this.comparison.openWeather.temperature + this.comparison.weatherApi.temperature) / 2;
      
      const diffOpen = Math.abs(this.comparison.openWeather.temperature - avgTemp);
      const diffApi = Math.abs(this.comparison.weatherApi.temperature - avgTemp);

      if (diffOpen < diffApi) {
        this.accuracy.openWeather = 100;
        this.accuracy.weatherApi = 0;
      } else if (diffApi < diffOpen) {
        this.accuracy.openWeather = 0;
        this.accuracy.weatherApi = 100;
      } else {
        this.accuracy.openWeather = 50;
        this.accuracy.weatherApi = 50;
      }
    }
  }
  
  // Calcule un score sur 100 pour un paramètre (plus la différence est petite, plus le score est élevé)
  private calculateParameterScore(difference: number, maxAllowableDiff: number): number {
    return Math.max(0, 100 - ((difference / maxAllowableDiff) * 100));
  }
  
  getDifferenceClass(value: number): string {
    if (isNaN(value) || value === 0) return 'text-gray-600';
    
    const absValue = Math.abs(value);
    if (absValue < 0.5) return 'text-green-600';
    if (absValue < 2) return 'text-yellow-600';
    return 'text-red-600';
  }
  
  refreshData(): void {
    if (this.comparison) {
      this.compareWeather(this.comparison.city);
    } else {
      this.onSubmit();
    }
  }

  switchTab(tab: 'current' | 'forecast' | 'history'): void {
    this.selectedTab = tab;
  }

  getAverageAccuracy(service: 'openWeather' | 'weatherApi'): number {
    if (this.historicalData.length === 0) return 0;
    
    const sum = this.historicalData.reduce((acc, curr) => acc + curr.accuracy[service], 0);
    return Math.round(sum / this.historicalData.length);
  }

  private handleError(city: string, err: any): void {
    this.comparison = {
      city,
      timestamp: Date.now(),
      openWeather: {
        temperature: 0,
        feelsLike: 0,
        humidity: 0,
        pressure: 0,
        windSpeed: 0,
        description: 'N/A'
      },
      weatherApi: {
        temperature: 0,
        feelsLike: 0,
        humidity: 0,
        pressure: 0,
        windSpeed: 0,
        description: 'N/A'
      },
      differences: {
        temperature: 0,
        feelsLike: 0,
        humidity: 0,
        pressure: 0,
        windSpeed: 0
      },
      loading: false,
      error: 'Erreur lors de la comparaison: ' + (err?.message || 'Erreur inconnue')
    };
  }
}