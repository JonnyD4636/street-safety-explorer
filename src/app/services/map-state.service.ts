import { Injectable } from '@angular/core';
import { Crime } from './police-api.service';

@Injectable({ providedIn: 'root' })
export class MapStateService {
  private _crimes: Crime[] = [];

  setCrimes(crimes: Crime[]) {
    this._crimes = crimes ?? [];
  }

  getCrimes(): Crime[] {
    return this._crimes;
  }

  clear() {
    this._crimes = [];
  }
}