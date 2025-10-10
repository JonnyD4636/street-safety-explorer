import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./home/home.page').then(m => m.HomePage),
  },
  {
    path: 'map',
    loadComponent: () => import('./map/map.page').then(m => m.MapPage),
  },
  {
    path: 'landing',
    loadComponent: () => import('./landing/landing.page').then(m => m.LandingPage),
  },
  {
    path: '',
    redirectTo: 'landing',
    pathMatch: 'full',
  },
];