import { provideRouter, RouterModule, Routes } from '@angular/router';
import { EmptyRouteComponent } from './empty-route/empty-route.component';
import { HistorialSabaticos } from './components/historial-sabaticos/historial-sabaticos';
import { AuthGuard } from '../_guards/auth.guard';
import { FormularioPlanTrabajo } from './components/formulario-plan-trabajo/formulario-plan-trabajo';
import { CrearSolicitud } from './crear-solicitud/crear-solicitud';

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
  {
    path: 'formulario-plan-trabajo',
    component: FormularioPlanTrabajo
  },
  {
    path: 'crear',
    canActivate: [AuthGuard],
    component: CrearSolicitud
  }

];