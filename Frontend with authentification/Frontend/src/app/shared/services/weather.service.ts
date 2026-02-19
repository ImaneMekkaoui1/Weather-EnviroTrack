import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface WeatherData {
  current: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
    visibility?: number;
    weather?: {
      description: string;
      icon: string;
    };
    wind?: {
      speed: number;
      deg: number;
    };
  };
  coord?: {
    lat: number;
    lon: number;
  };
  sys?: {
    country?: string;
    sunrise?: number;
    sunset?: number;
  };
  name?: string;
  forecast?: {
    hourly: any[];
    daily: any[];
  };
}

interface DetailedWeather {
  current: {
    temp: number;
    feelsLike: number;
    condition: string;
    icon: string;
    humidity: number;
    pressure: number;
    visibility: number;
  };
  hourly: Array<{
    time: Date;
    temp: number;
    icon: string;
    condition: string;
    precipitation: number;
    windSpeed?: number;
  }>;
  daily: Array<{
    date: Date;
    maxTemp: number;
    minTemp: number;
    condition: string;
    icon: string;
    precipitation?: number;
  }>;
  coord: {
    lat: number;
    lon: number;
  };
  wind: {
    speed: number;
    direction: string;
  };
  sunrise: number;
  sunset: number;
}

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private apiUrl = 'http://localhost:8082/api/weather';
  private openWeatherIconUrl = 'https://openweathermap.org/img/wn/';

  constructor(private http: HttpClient) {}

  // AJOUT: Méthode optimisée pour OcpZoneComponent
  getBasicWeatherByCoords(lat: number, lon: number): Observable<{
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    pressure: number;
    visibility: number;
    condition: string;
  }> {
    return this.http.get<any>(`${this.apiUrl}/coordinates?lat=${lat}&lon=${lon}`).pipe(
      map(response => {
        if (!response?.current) {
          return this.getFallbackWeatherData(lat, lon);
        }

        const current = response.current;
        return {
          temperature: Math.round(current.temp),
          humidity: current.humidity,
          windSpeed: Math.round((current.wind?.speed || 0) * 3.6), // Convert m/s to km/h
          windDirection: this.getWindDirection(current.wind?.deg || 0),
          pressure: current.pressure,
          visibility: current.visibility ? current.visibility / 1000 : 10, // Convert m to km
          condition: current.weather?.[0]?.description || 'Inconnu'
        };
      }),
      catchError(error => {
        console.error('Error fetching basic weather:', error);
        return of(this.getFallbackWeatherData(lat, lon));
      })
    );
  }

  // AJOUT: Données de fallback pour le développement
  private getFallbackWeatherData(lat: number, lon: number): any {
    console.warn('Using fallback weather data');
    return {
      temperature: Math.round(20 + Math.random() * 15),
      humidity: Math.round(30 + Math.random() * 60),
      windSpeed: Math.round(5 + Math.random() * 20),
      windDirection: this.getWindDirection(Math.random() * 360),
      pressure: Math.round(1000 + Math.random() * 30),
      visibility: Math.round(5 + Math.random() * 15),
      condition: ['Ensoleillé', 'Nuageux', 'Pluvieux', 'Partiellement nuageux'][Math.floor(Math.random() * 4)]
    };
  }

  // VOTRE CODE EXISTANT (inchangé)
  getForecast(city: string, days: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/forecast/${encodeURIComponent(city)}?days=${days}`).pipe(
      catchError(this.handleError)
    );
  }

  getComparisonHistory() {
    throw new Error('Method not implemented.');
  }

  getWeather(city: string) {
    throw new Error('Method not implemented.');
  }

  getCurrentWeather(city: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(city)}`).pipe(
      catchError(this.handleError)
    );
  }

  getDetailedWeather(city: string): Observable<DetailedWeather> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(city)}`).pipe(
      map((response) => {
        if (!response || !response.current) {
          throw new Error('Données météo incomplètes');
        }

        const currentWeather = response.current;
        const weather = currentWeather.weather || { description: 'Inconnu', icon: '01d' };

        let hourlyData: any[] = [];
        if (response.forecast?.hourly) {
          hourlyData = response.forecast.hourly.map((hour: any) => ({
            time: new Date(hour.dt * 1000),
            temp: Math.round(hour.temp || 0),
            condition: hour.description || 'Inconnu',
            icon: `${this.openWeatherIconUrl}${hour.icon || '01d'}@2x.png`,
            precipitation: hour.pop ? Math.round(hour.pop * 100) : 0,
            windSpeed: hour.wind?.speed ? Math.round(hour.wind.speed * 3.6) : 0
          }));
        }

        let dailyData: any[] = [];
        if (response.forecast?.daily) {
          dailyData = response.forecast.daily.map((day: any) => ({
            date: new Date(day.dt * 1000),
            maxTemp: Math.round(day.temp?.max || 0),
            minTemp: Math.round(day.temp?.min || 0),
            condition: day.weather?.description || 'Inconnu',
            icon: `${this.openWeatherIconUrl}${day.weather?.icon || '01d'}@2x.png`,
            precipitation: day.pop ? Math.round(day.pop * 100) : 0
          }));
        }

        return {
          current: {
            temp: Math.round(currentWeather.temp || 0),
            feelsLike: Math.round(currentWeather.feels_like || 0),
            condition: weather.description || 'Inconnu',
            icon: `${this.openWeatherIconUrl}${weather.icon || '01d'}@2x.png`,
            humidity: currentWeather.humidity || 0,
            pressure: currentWeather.pressure || 0,
            visibility: currentWeather.visibility || 0,
          },
          hourly: hourlyData,
          daily: dailyData,
          coord: {
            lat: response.coord?.lat || 0,
            lon: response.coord?.lon || 0,
          },
          wind: {
            speed: Math.round((currentWeather.wind?.speed || 0) * 3.6),
            direction: this.getWindDirection(currentWeather.wind?.deg || 0),
          },
          sunrise: response.sys?.sunrise || 0,
          sunset: response.sys?.sunset || 0
        };
      }),
      catchError(this.handleError)
    );
  }

  searchLocations(query: string): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`)
      .pipe(catchError(this.handleError));
  }

  getWeatherByCoords(lat: number, lon: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/coordinates?lat=${lat}&lon=${lon}`)
      .pipe(
        map((response) => {
          if (!response) return null;
          
          const current = response.current || {};
          const weather = current.weather || { description: 'Inconnu', icon: '01d' };
          
          let hourlyData: any[] = [];
          if (response.forecast?.hourly) {
            hourlyData = response.forecast.hourly.map((hour: any) => ({
              time: new Date(hour.dt * 1000),
              temp: Math.round(hour.temp || 0),
              condition: hour.description || 'Inconnu',
              icon: `${this.openWeatherIconUrl}${hour.icon || '01d'}@2x.png`,
              precipitation: hour.pop ? Math.round(hour.pop * 100) : 0,
              windSpeed: hour.wind?.speed ? Math.round(hour.wind.speed * 3.6) : 0
            }));
          }
          
          let dailyData: any[] = [];
          if (response.forecast?.daily) {
            dailyData = response.forecast.daily.map((day: any) => ({
              date: new Date(day.dt * 1000),
              maxTemp: Math.round(day.temp?.max || 0),
              minTemp: Math.round(day.temp?.min || 0),
              condition: day.weather?.description || 'Inconnu',
              icon: `${this.openWeatherIconUrl}${day.weather?.icon || '01d'}@2x.png`,
              precipitation: day.pop ? Math.round(day.pop * 100) : 0
            }));
          }
            
          return {
            name: response.name || `Position (${lat.toFixed(2)}, ${lon.toFixed(2)})`,
            sys: response.sys || { country: 'MA' },
            current: {
              temp: Math.round(current.temp || 0),
              feelsLike: Math.round(current.feels_like || 0),
              condition: weather.description || 'Inconnu',
              icon: `${this.openWeatherIconUrl}${weather.icon || '01d'}@2x.png`,
              humidity: current.humidity || 0,
              pressure: current.pressure || 0,
              visibility: current.visibility || 0,
            },
            wind: {
              speed: Math.round((current.wind?.speed || 0) * 3.6),
              direction: this.getWindDirection(current.wind?.deg || 0),
            },
            coord: {
              lat: lat,
              lon: lon,
            },
            sunrise: response.sys?.sunrise || 0,
            sunset: response.sys?.sunset || 0,
            forecast: {
              hourly: hourlyData,
              daily: dailyData
            }
          };
        }),
        catchError(this.handleError)
      );
  }

  private getWindDirection(degrees: number): string {
    const directions = ['Nord', 'Nord-Est', 'Est', 'Sud-Est', 'Sud', 'Sud-Ouest', 'Ouest', 'Nord-Ouest'];
    const index = Math.round((degrees % 360) / 45);
    return directions[index % 8];
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
      if (error.status === 404) {
        errorMessage = 'Localisation non trouvée. Vérifiez le nom de la ville.';
      } else if (error.status === 401) {
        errorMessage = 'Erreur d\'authentification. Vérifiez votre clé API.';
      } else if (error.status >= 500) {
        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
      }
    }
    console.error('Weather Service Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}