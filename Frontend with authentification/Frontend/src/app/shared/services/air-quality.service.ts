import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AirQualityData } from './mqtt.service';

@Injectable({
  providedIn: 'root'
})
export class AirQualityService {
  private apiUrl = 'http://localhost:8082/api/airquality';

  constructor(private http: HttpClient) {}

  getCurrentAirQuality(): Observable<AirQualityData> {
    return this.http.get<AirQualityData>(`${this.apiUrl}/current`).pipe(
      catchError(error => {
        console.error('Error fetching air quality:', error);
        return of(this.getDefaultData());
      })
    );
  }

  private getDefaultData(): AirQualityData {
    return {
      pm25: 0,
      pm10: 0,
      no2: 0,
      o3: 0,
      co: 0,
      aqi: 0
    };
  }
}