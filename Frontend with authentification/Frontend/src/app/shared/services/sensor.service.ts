import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Capteur {
  id: number;
  nom: string;
  type: string;
  localisation: string;
  statut: string;
  dateCreation?: string;
  derniereModification?: string;
  valeur?: string;
  derniereMiseAJour?: Date;
  commentaire?: string;
  coordinates?: {
    x: number;
    y: number;
  };
}

export interface HistoryEntry {
  date: Date;
  status: string;
  comment: string;
}

@Injectable({
  providedIn: 'root'
})
export class CapteurService {
  private readonly baseUrl = 'http://localhost:8082/api/capteurs';

  constructor(private http: HttpClient) {}

  getAllCapteurs(): Observable<Capteur[]> {
    return this.http.get<Capteur[]>(this.baseUrl);
  }

  getCurrentCapteurs(): Observable<Capteur[]> {
    return this.http.get<Capteur[]>(`${this.baseUrl}/current`);
  }

  getCapteurById(id: number): Observable<Capteur> {
    return this.http.get<Capteur>(`${this.baseUrl}/${id}`);
  }

  createCapteur(capteur: Omit<Capteur, 'id'>): Observable<Capteur> {
    const formattedCapteur = {
      ...capteur,
      localisation: capteur.localisation.startsWith('MAP:') ? 
        capteur.localisation : 
        `TEXT:${capteur.localisation}`
    };
    
    return this.http.post<Capteur>(this.baseUrl, formattedCapteur);
  }

  updateCapteur(id: number, capteur: Partial<Capteur>): Observable<Capteur> {
    return this.http.put<Capteur>(`${this.baseUrl}/${id}`, capteur);
  }

  deleteCapteur(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  generateData(id: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/generate-data`, {});
  }

  updateCapteurHistory(id: number, history: string): Observable<Capteur> {
    return this.http.put<Capteur>(`${this.baseUrl}/${id}/history`, { history });
  }

  getCapteurHistory(id: number): Observable<string> {
    return this.http.get<string>(`${this.baseUrl}/${id}/history`, { 
      responseType: 'text' as 'json' 
    });
  }

  parseCoordinates(localisation: string): { x: number, y: number } | null {
    if (!localisation.startsWith('MAP:')) return null;
    
    try {
      const [x, y] = localisation
        .substring(4)
        .split(',')
        .map(coord => parseFloat(coord.trim()));
      
      return { x, y };
    } catch (e) {
      console.error('Error parsing coordinates:', e);
      return null;
    }
  }

  formatCoordinates(x: number, y: number): string {
    return `MAP:${x},${y}`;
  }
}