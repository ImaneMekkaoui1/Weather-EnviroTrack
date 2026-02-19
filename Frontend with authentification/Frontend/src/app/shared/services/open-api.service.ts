import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class OpenAPIService {
  private apiUrl = 'http://localhost:8082/api/weather-api';

  constructor(private http: HttpClient) {}

  getForecast(city: string, days: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/forecast/${encodeURIComponent(city)}?days=${days}`).pipe(
      catchError(this.handleError)
    );
  }

  getWeather(city: string): Observable<any> {
    // Utiliser le backend comme proxy pour ne pas exposer la clé API dans le frontend
    return this.http.get(`${this.apiUrl}/${encodeURIComponent(city)}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  compareWeatherApis(city: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/compare-weather/${encodeURIComponent(city)}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue avec WeatherAPI';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Server-side error
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
      if (error.status === 404) {
        errorMessage = 'Localisation non trouvée dans WeatherAPI. Vérifiez le nom de la ville.';
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Erreur d\'authentification avec WeatherAPI. Vérifiez votre clé API.';
      } else if (error.status >= 500) {
        errorMessage = 'Erreur serveur WeatherAPI. Veuillez réessayer plus tard.';
      }
    }
    console.error('WeatherAPI Service Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}