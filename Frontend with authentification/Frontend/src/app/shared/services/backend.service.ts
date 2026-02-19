import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BackendService {
  private apiUrl = 'http://localhost:8082/api';  // L'URL de  API backend

  constructor(private http: HttpClient) {}

  // Méthode pour obtenir les données des capteurs
  getSensors(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sensors`);
  }

  // Méthode pour ajouter un nouveau capteur
  addSensor(sensorData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sensors`, sensorData);
  }

  // Méthode pour supprimer un capteur
  deleteSensor(sensorId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/sensors/${sensorId}`);
  }
}
