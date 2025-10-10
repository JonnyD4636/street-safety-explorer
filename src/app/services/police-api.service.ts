import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface Force { id: string; name: string; }
export interface Neighbourhood { id: string; name: string; }
export interface Category { url: string; name: string; }

export interface LatLng { latitude: string; longitude: string; }

export interface Crime {
  category: string;
  month: string;
  location: {
    latitude: string;
    longitude: string;
    street: { id: number; name: string };
  };
  outcome_status?: { category: string; date: string };
}

@Injectable({ providedIn: 'root' })
export class PoliceApiService {
  private http = inject(HttpClient);
  private base = environment.policeApiBase;

  getForces() {
    return this.http.get<Force[]>(`${this.base}/forces`);
  }

  getNeighbourhoods(forceId: string) {
    return this.http.get<Neighbourhood[]>(`${this.base}/${forceId}/neighbourhoods`);
  }

  getNeighbourhoodBoundary(forceId: string, neighbourhoodId: string) {
    return this.http.get<LatLng[]>(`${this.base}/${forceId}/${neighbourhoodId}/boundary`);
  }

  getCrimeCategories() {
    return this.http.get<Category[]>(`${this.base}/crime-categories`);
  }

  getCrimesByLatLng(lat: number, lng: number, month: string, category: string = 'all-crime') {
    const params = new HttpParams()
      .set('lat', String(lat))
      .set('lng', String(lng))
      .set('date', month);
    return this.http.get<Crime[]>(`${this.base}/crimes-street/${category}`, { params });
  }

  getCrimesByPoly(poly: string, month: string, category: string = 'all-crime') {
    const params = new HttpParams().set('poly', poly).set('date', month);
    return this.http.get<Crime[]>(`${this.base}/crimes-street/${category}`, { params });
  }
}