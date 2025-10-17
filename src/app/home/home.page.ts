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
} from '../services/police-api.service';
import { Router } from '@angular/router';
import { MapStateService } from '../services/map-state.service';
import { finalize, take, timeout } from 'rxjs/operators';

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
  categoryCountsList: { name: string; count: number }[] = [];

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

  ngOnInit() {
    this.loadForces();
    this.loadCategories();
  }

  // ---------- Loads ----------

  loadForces() {
    this.loadingForces = true;
    this.api.getForces()
      .pipe(take(1), timeout(15000), finalize(() => this.loadingForces = false))
      .subscribe({
        next: (data) => { this.forces = Array.isArray(data) ? data : []; },
        error: (err) => { this.showError((err as any)?.__summary || 'Failed to load forces', (err as any)?.__url, err?.status); }
      });
  }

  loadCategories() {
    this.api.getCrimeCategories()
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: (data) => { this.categories = Array.isArray(data) ? data : []; },
        error: (err) => { this.showError((err as any)?.__summary || 'Failed to load categories', (err as any)?.__url, err?.status); }
      });
  }

  // ---------- Selections ----------

  onForceChange() {
    if (!this.selectedForceId) {
      this.neighbourhoods = [];
      this.selectedNeighbourhoodId = null;
      return;
    }
    this.loadingNeighs = true;
    this.selectedNeighbourhoodId = null;
    this.neighbourhoods = [];

    this.api.getNeighbourhoods(this.selectedForceId)
      .pipe(take(1), timeout(15000), finalize(() => this.loadingNeighs = false))
      .subscribe({
        next: (data) => { this.neighbourhoods = Array.isArray(data) ? data : []; },
        error: (err) => { this.showError((err as any)?.__summary || 'Failed to load neighbourhoods', (err as any)?.__url, err?.status); }
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

  // ---------- Fetch crimes (use neighbourhood centre; no boundary) ----------

  fetchCrimes() {
    if (!this.selectedForceId || !this.selectedNeighbourhoodId) return;

    this.loadingCrimes = true;
    this.crimes = [];
    this.categoryCountsList = [];

    // Get neighbourhood details (includes centre {lat, lng})
    this.api.getNeighbourhoodDetails(this.selectedForceId, this.selectedNeighbourhoodId)
      .pipe(take(1), timeout(15000))
      .subscribe({
        next: (details) => {
          const lat = parseFloat(details?.centre?.latitude ?? '');
          const lng = parseFloat(details?.centre?.longitude ?? '');
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            this.loadingCrimes = false;
            this.showError('No centre coordinates available for this neighbourhood.');
            return;
          }

          this.api.getCrimesByLatLng(lat, lng, this.selectedMonth, this.selectedCategory)
            .pipe(take(1), timeout(20000), finalize(() => this.loadingCrimes = false))
            .subscribe({
              next: (crimes) => {
                this.crimes = (crimes ?? []).filter(c => !!c?.location?.latitude && !!c?.location?.longitude);
                this.categoryCountsList = this.buildCounts(this.crimes);
              },
              error: (err) => {
                this.showError((err as any)?.__summary || 'Failed to load crimes', (err as any)?.__url, err?.status);
              }
            });
        },
        error: (err) => {
          this.loadingCrimes = false;
          this.showError((err as any)?.__summary || 'Failed to load neighbourhood details', (err as any)?.__url, err?.status);
        }
      });
  }

  openMap() {
    if (!this.crimes.length) return;
    this.mapState.setCrimes(this.crimes);
    setTimeout(() => this.router.navigateByUrl('/map'), 0);
  }

  // ---------- Utils ----------

  private buildCounts(items: Crime[]): { name: string; count: number }[] {
    const map = new Map<string, number>();
    for (const c of items ?? []) {
      const k = (c?.category ?? 'Unknown').toString();
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }

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

  streetName(c: Crime): string {
    return (c as any)?.location?.street?.name ?? '';
  }

  private async showError(message: string, url?: string, status?: number) {
    const text = url ? `${message}\n${url}${typeof status === 'number' ? ` (status ${status})` : ''}` : message;
    const t = await this.toast.create({ message: text, duration: 4000, color: 'danger', cssClass: 'text-left' });
    await t.present();
  }
}