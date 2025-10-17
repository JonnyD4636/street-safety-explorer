import { Routes } from '@angular/router';
import { HomePage } from './home/home.page';
import { MapPage } from './map/map.page';
import { LandingPage } from './landing/landing.page';

export const routes: Routes = [
  { path: 'home', component: HomePage },
  { path: 'map', component: MapPage },
  { path: 'landing', component: LandingPage },
  { path: '', redirectTo: 'landing', pathMatch: 'full' },
];