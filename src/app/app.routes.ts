import { provideRouter, RouterModule, Routes } from '@angular/router';
import { EmptyRouteComponent } from './empty-route/empty-route.component';
import { HistorialSabaticos } from './components/historial-sabaticos/historial-sabaticos';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ''
  },
  {
    path: '',
    component: HistorialSabaticos
  },
];