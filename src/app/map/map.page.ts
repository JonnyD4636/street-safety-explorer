import { Component, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import * as L from 'leaflet';
import { CommonModule } from '@angular/common';
import { MapStateService } from '../services/map-state.service';
import { Crime } from '../services/police-api.service';
import { Router } from '@angular/router';

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '../assets/leaflet/marker-icon-2x.png',
  iconUrl: '../assets/leaflet/marker-icon.png',
  shadowUrl: '../assets/leaflet/marker-shadow.png',
});

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [IonicModule, CommonModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Crime Map</ion-title>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen>
      <div id="map"></div>
    </ion-content>
  `,
  styles: [`
    ion-content { --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 0; }
    #map { position: absolute; inset: 0; }
  `]
})
export class MapPage implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private mapState = inject(MapStateService);

  crimes: Crime[] = [];
  private map: L.Map | null = null;
  private destroyed = false;

  ngAfterViewInit() {
    this.crimes = this.mapState.getCrimes();
    if (!this.crimes.length) {
      this.router.navigateByUrl('/home');
      return;
    }

    requestAnimationFrame(() => setTimeout(() => this.initMap(), 40));
  }

  private initMap() {
    if (this.destroyed || this.map) return;

    const container = document.getElementById('map');
    if (!container) return;

    try { (container as any)._leaflet_id = null; } catch {}

    const first = this.crimes.find(c => {
      const lat = parseFloat(c.location?.latitude as any);
      const lng = parseFloat(c.location?.longitude as any);
      return !isNaN(lat) && !isNaN(lng);
    });

    const startLat = first ? parseFloat(first.location!.latitude as any) : 51.5074;
    const startLng = first ? parseFloat(first.location!.longitude as any) : -0.1278;

    this.map = L.map(container, {
      preferCanvas: true,        
      zoomControl: true,
      attributionControl: true,
    }).setView([startLat, startLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(this.map);

    const pts: L.LatLngExpression[] = [];
    for (const c of this.crimes) {
      const lat = parseFloat(c.location?.latitude as any);
      const lng = parseFloat(c.location?.longitude as any);
      if (isNaN(lat) || isNaN(lng)) continue;

      pts.push([lat, lng]);
      L.marker([lat, lng])
        .addTo(this.map)
        .bindPopup(`<b>${this.escape(c.category)}</b><br>${this.escape(c.location?.street?.name ?? 'Unknown')}`);
    }

    if (pts.length > 1) {
      this.map.fitBounds(L.latLngBounds(pts), { padding: [16, 16] });
    }

    setTimeout(() => this.map && this.map.invalidateSize(true), 80);
  }

  ngOnDestroy() {
    this.destroyed = true;
    try { this.map?.remove(); } catch {}
    this.map = null;

  }

  private escape(v: any): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}