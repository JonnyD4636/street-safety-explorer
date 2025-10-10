// src/app/home/home.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import {
  PoliceApiService,
  Force,
  Neighbourhood,
  Category,
  Crime,
  LatLng,
} from '../services/police-api.service';
import { Router } from '@angular/router';
import { MapStateService } from '../services/map-state.service';

function lastFullMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1, 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage implements OnInit {
  private api = inject(PoliceApiService);
  private toast = inject(ToastController);
  private router = inject(Router);
  private mapState = inject(MapStateService);

  forces: Force[] = [];
  neighbourhoods: Neighbourhood[] = [];
  categories: Category[] = [];
  crimes: Crime[] = [];

  loadingForces = false;
  loadingNeighs = false;
  loadingCrimes = false;

  selectedForceId: string | null = null;
  selectedNeighbourhoodId: string | null = null;
  selectedCategory: string = 'all-crime';
  selectedMonth: string = lastFullMonth();

  minMonthIso = '2011-01-01';
  maxMonthIso = `${lastFullMonth()}-01`;
  get monthIsoValue() { return `${this.selectedMonth}-01`; }

  get formattedMonth(): string {
    try {
      const [y, m] = this.selectedMonth.split('-').map(Number);
      const d = new Date(y, m - 1, 1);
      return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
    } catch {
      return this.selectedMonth;
    }
  }

  ngOnInit() {
    this.loadForces();
    this.loadCategories();
  }

  loadForces() {
    this.loadingForces = true;
    this.api.getForces().subscribe({
      next: (data) => { this.forces = data; this.loadingForces = false; },
      error: () => { this.loadingForces = false; this.showError('Failed to load forces'); }
    });
  }

  loadCategories() {
    this.api.getCrimeCategories().subscribe({
      next: (data) => this.categories = data,
      error: () => this.showError('Failed to load categories')
    });
  }

  onForceChange() {
    if (!this.selectedForceId) {
      this.neighbourhoods = [];
      this.selectedNeighbourhoodId = null;
      return;
    }
    this.loadingNeighs = true;
    this.selectedNeighbourhoodId = null;
    this.neighbourhoods = [];
    this.api.getNeighbourhoods(this.selectedForceId).subscribe({
      next: (data) => { this.neighbourhoods = data; this.loadingNeighs = false; },
      error: () => { this.loadingNeighs = false; this.showError('Failed to load neighbourhoods'); }
    });
  }

  onMonthChange(ev: CustomEvent) {
    const iso = (ev.detail as any).value as string;
    if (!iso) return;
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    this.selectedMonth = `${y}-${m}`;
    this.maxMonthIso = `${lastFullMonth()}-01`;
  }

  async fetchCrimes() {
    if (!this.selectedForceId || !this.selectedNeighbourhoodId) return;
    this.loadingCrimes = true;
    this.crimes = [];

    this.api.getNeighbourhoodBoundary(this.selectedForceId, this.selectedNeighbourhoodId).subscribe({
      next: (boundary) => {
        if (!boundary?.length) {
          this.loadingCrimes = false;
          this.showError('No boundary data available');
          return;
        }
        const { lat, lng } = this.centroid(boundary);
        this.api.getCrimesByLatLng(lat, lng, this.selectedMonth, this.selectedCategory).subscribe({
          next: (crimes: Crime[]) => { this.crimes = crimes; this.loadingCrimes = false; },
          error: () => { this.loadingCrimes = false; this.showError('Failed to load crimes'); }
        });
      },
      error: () => { this.loadingCrimes = false; this.showError('Failed to get neighbourhood boundary'); }
    });
  }

  async openMap() {
    if (!this.crimes.length) return;
    this.mapState.setCrimes(this.crimes);
    setTimeout(() => this.router.navigateByUrl('/map'), 0);
  }

  /* ---------- UI helpers ---------- */

  getCategoryColor(category: string): string {
    const c = (category || '').toLowerCase();
    if (c.includes('violence') || c.includes('robbery')) return 'danger';
    if (c.includes('burglary') || c.includes('theft') || c.includes('shoplifting')) return 'warning';
    if (c.includes('drugs')) return 'tertiary';
    if (c.includes('vehicle')) return 'medium';
    if (c.includes('public-order') || c.includes('anti-social')) return 'primary';
    if (c.includes('criminal-damage') || c.includes('arson')) return 'secondary';
    return 'dark';
  }

  get categoryCounts(): { name: string; count: number }[] {
    const map = new Map<string, number>();
    for (const c of this.crimes) {
      const key = (c?.category ?? 'Unknown').toString();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

  /** Safe street name extractor to satisfy strict template typing without changing behavior */
  streetName(c: Crime): string {
    return (c && (c as any).location && (c as any).location.street && (c as any).location.street.name)
      ? (c as any).location.street.name
      : '';
  }

  /* ---------- Utils ---------- */

  private centroid(points: LatLng[]): { lat: number; lng: number } {
    const n = points.length;
    const sum = points.reduce(
      (acc, p) => {
        acc.lat += parseFloat(p.latitude as unknown as string);
        acc.lng += parseFloat(p.longitude as unknown as string);
        return acc;
      },
      { lat: 0, lng: 0 }
    );
    return { lat: sum.lat / n, lng: sum.lng / n };
  }

  private async showError(message: string) {
    const t = await this.toast.create({ message, duration: 2500, color: 'danger' });
    await t.present();
  }
}