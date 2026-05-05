import { provideRouter, RouterModule, Routes } from '@angular/router';
import { EmptyRouteComponent } from './empty-route/empty-route.component';
import { HistorialSabaticos } from './components/historial-sabaticos/historial-sabaticos';
import { AuthGuard } from '../_guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: ''
  },
  {
    path: '',
    canActivate: [AuthGuard],
    component: HistorialSabaticos
  },
];