import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WeatherComparison } from '../../models/weather-comparison.model';

@Injectable({
  providedIn: 'root'
})
export class WeatherReliabilityService {
  private baseUrl = 'http://localhost:8082/api/weather-reliability';

  constructor(private http: HttpClient) { }

  // Enregistrer les prévisions pour une ville
  recordForecasts(city: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/record/${city}`);
  }

  // Récupérer les comparaisons pour une ville
  getComparisons(city: string): Observable<WeatherComparison[]> {
    return this.http.get<WeatherComparison[]>(`${this.baseUrl}/comparisons/${city}`);
  }

  // Récupérer les comparaisons pour une ville et une source spécifique
  getComparisonsBySource(city: string, source: string): Observable<WeatherComparison[]> {
    return this.http.get<WeatherComparison[]>(`${this.baseUrl}/comparisons/${city}/${source}`);
  }

  // Récupérer les statistiques de fiabilité
  getReliabilityStats(city: string, startDate?: string, endDate?: string): Observable<any> {
    let url = `${this.baseUrl}/stats/${city}`;
    
    if (startDate && endDate) {
      url += `?startDate=${startDate}&endDate=${endDate}`;
    } else if (startDate) {
      url += `?startDate=${startDate}`;
    } else if (endDate) {
      url += `?endDate=${endDate}`;
    }
    
    return this.http.get<any>(url);
  }

  // Récupérer les comparaisons par plage de dates
  getComparisonsByDateRange(city: string, startDate: string, endDate: string): Observable<WeatherComparison[]> {
    return this.http.get<WeatherComparison[]>(
      `${this.baseUrl}/comparison-by-date-range/${city}?startDate=${startDate}&endDate=${endDate}`
    );
  }

  // Mettre à jour manuellement les prévisions avec les données réelles
  updateForecastsManually(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/update-forecasts`, {});
  }
}