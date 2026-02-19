import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class WeatherApiComparisonService {
  private apiUrl = 'http://localhost:8082/api/weather-api/compare-weather';

  constructor(private http: HttpClient) {}

  compareWeather(city: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${encodeURIComponent(city)}`).pipe(
      map(response => {
        console.log('Weather comparison response:', response);
        return response;
      }),
      catchError(error => {
        console.error('Error comparing weather data:', error);
        if (error instanceof HttpErrorResponse) {
          return throwError(() => new Error(`Erreur: ${error.status} - ${error.message}`));
        }
        // En cas d'erreur, retourner des données factices pour éviter les erreurs d'affichage
        return of(this.getFallbackData(city));
      })
    );
  }

  private getFallbackData(city: string) {
    return {
      city: city,
      timestamp: new Date().toISOString(),
      openWeatherMap: {
        temperature: 20.0,
        humidity: 60,
        condition: 'Ensoleillé'
      },
      alternativeApi: {
        temperature: 19.8,
        humidity: 62,
        condition: 'Clair'
      },
      analysis: 'Données générées en mode fallback (erreur de connexion au service).',
      fallback: true
    };
  }
}