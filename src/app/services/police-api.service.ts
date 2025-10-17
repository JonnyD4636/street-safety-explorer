// src/app/services/police-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpResponse } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { map, catchError } from 'rxjs/operators';
import { Observable, throwError } from 'rxjs';

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
  private readonly base = environment.apiBase; // 'https://data.police.uk/api'
  private readonly jsonHeaders = new HttpHeaders({ 'Accept': 'application/json' });

  private label(code?: number): string {
    switch (code) {
      case 200: return 'OK';
      case 201: return 'Created';
      case 204: return 'No Content';
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 414: return 'URI Too Long';
      case 429: return 'Too Many Requests';
      case 500: return 'Server Error';
      default:  return code ? `HTTP ${code}` : 'Network error';
    }
  }

  private unwrap<T>(obs: Observable<HttpResponse<T>>, url: string): Observable<T> {
    return obs.pipe(
      map(res => {
        if (!res || res.status < 200 || res.status >= 300) {
          const err = Object.assign(new Error(this.label(res?.status)), { status: res?.status, __url: url });
          throw err;
        }
        return res.body as T;
      }),
      catchError(err => {
        (err as any).__summary = `[${err?.status ?? '??'}] ${this.label(err?.status)}`;
        if (!(err as any).__url) (err as any).__url = url;
        return throwError(() => err);
      })
    );
  }

  // ---- Forces
  getForces(): Observable<Force[]> {
    const url = `${this.base}/forces`;
    return this.unwrap(this.http.get<Force[]>(url, { headers: this.jsonHeaders, observe: 'response' }), url);
  }

  // ---- Neighbourhoods (list)
  getNeighbourhoods(forceId: string): Observable<Neighbourhood[]> {
    const url = `${this.base}/${encodeURIComponent(forceId)}/neighbourhoods`;
    return this.unwrap(this.http.get<Neighbourhood[]>(url, { headers: this.jsonHeaders, observe: 'response' }), url);
  }

  // ---- Neighbourhood details (centre coords)  ← NEW
  getNeighbourhoodDetails(forceId: string, neighbourhoodId: string): Observable<{
    id: string;
    name: string;
    centre?: { latitude: string; longitude: string };
    // other fields exist but we don't need them now
  }> {
    const url = `${this.base}/${encodeURIComponent(forceId)}/${encodeURIComponent(neighbourhoodId)}`;
    return this.unwrap(this.http.get<any>(url, { headers: this.jsonHeaders, observe: 'response' }), url);
  }

  // (We keep boundary function in case you still use it elsewhere)
  getNeighbourhoodBoundary(forceId: string, neighbourhoodId: string): Observable<LatLng[]> {
    const url = `${this.base}/${encodeURIComponent(forceId)}/${encodeURIComponent(neighbourhoodId)}/boundary`;
    return this.unwrap(this.http.get<LatLng[]>(url, { headers: this.jsonHeaders, observe: 'response' }), url);
  }

  // ---- Categories
  getCrimeCategories(date?: string): Observable<Category[]> {
    const url = `${this.base}/crime-categories`;
    const params = date ? new HttpParams().set('date', date) : undefined;
    return this.unwrap(
      this.http.get<Category[]>(url, { headers: this.jsonHeaders, params, observe: 'response' }),
      params ? `${url}?date=${date}` : url
    );
  }

  // ---- Crimes
  getCrimesByLatLng(lat: number, lng: number, month: string, category = 'all-crime'): Observable<Crime[]> {
    const url = `${this.base}/crimes-street/${encodeURIComponent(category)}`;
    const params = new HttpParams().set('lat', String(lat)).set('lng', String(lng)).set('date', month);
    return this.unwrap(
      this.http.get<Crime[]>(url, { headers: this.jsonHeaders, params, observe: 'response' }),
      `${url}?lat=${lat}&lng=${lng}&date=${month}`
    );
  }

  getCrimesByPoly(poly: string, month: string, category = 'all-crime'): Observable<Crime[]> {
    const url = `${this.base}/crimes-street/${encodeURIComponent(category)}`;
    const params = new HttpParams().set('poly', poly).set('date', month);
    return this.unwrap(
      this.http.get<Crime[]>(url, { headers: this.jsonHeaders, params, observe: 'response' }),
      `${url}?poly=[poly]&date=${month}`
    );
  }
}