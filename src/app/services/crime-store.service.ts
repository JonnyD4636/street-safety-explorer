import { Injectable } from '@angular/core';
import { Crime } from './police-api.service';

@Injectable({ providedIn: 'root' })
export class CrimeStoreService {
  crimes: Crime[] = [];
}