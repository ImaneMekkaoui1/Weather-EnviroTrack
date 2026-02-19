import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
  private openWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
  private apiKey = 'f7b4113173d775dbd8feadf99dfac5d5';

  constructor(private http: HttpClient) {}

  getWeather(city: string): Observable<any> {
    return this.http.get(`${this.openWeatherUrl}?q=${city}&appid=${this.apiKey}`);
  }
}