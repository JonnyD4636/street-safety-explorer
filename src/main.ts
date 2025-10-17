import 'zone.js';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { defineCustomElements } from '@ionic/core/loader';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

defineCustomElements(window);

bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes), provideHttpClient(), provideIonicAngular()],
}).catch(err => console.error(err));