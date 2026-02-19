import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly API_URL = 'http://localhost:8082/api';
  private readonly TEST_API_URL = 'http://localhost:8082/api/users/test';
  
  constructor(private http: HttpClient) { }
  
  // Récupère tous les utilisateurs
  getAllUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/admin/users`);
  }
  
  // Récupère les utilisateurs en attente
  getPendingUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/admin/users/pending`);
  }
  
  // Crée un utilisateur
  createUser(user: any): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/users`, user);
  }
  
  // Met à jour un utilisateur existant
  updateUser(id: number, user: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/users/${id}`, user);
  }
  
  // Supprime un utilisateur - CORRECTION ICI: utiliser l'endpoint admin
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/admin/users/${id}`);
  }
  
  // Approuve un utilisateur
  approveUser(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/users/${id}/approve`, {});
  }
  
  // Rejette un utilisateur (mettre à jour pour retourner l'utilisateur)
  rejectUser(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/users/${id}/reject`, {});
  }
  
  // Désactive un utilisateur
  deactivateUser(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/users/${id}/deactivate`, {});
  }
  
  // Change le rôle d'un utilisateur
  changeUserRole(id: number, role: string): Observable<any> {
    return this.http.patch<any>(`${this.API_URL}/admin/users/${id}/role`, { role });
  }
  
  // Suspend un utilisateur
  suspendUser(id: number): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/admin/users/${id}/suspend`, {});
  }
  
  // Appel de l'API de test (message en texte)
  getTestMessage(): Observable<string> {
    return this.http.get(this.TEST_API_URL, { responseType: 'text' });
  }
}