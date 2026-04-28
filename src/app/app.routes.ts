import { provideRouter, RouterModule, Routes } from '@angular/router';
import { EmptyRouteComponent } from './empty-route/empty-route.component';
import { HistorialSabaticos } from './components/historial-sabaticos/historial-sabaticos';
import { getSingleSpaExtraProviders } from 'single-spa-angular';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { NgModule } from '@angular/core';

export const routes: Routes = [
  {
    path: '**',
    component: EmptyRouteComponent
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'historial-sabaticos'
  },
  {
    path: 'historial-sabaticos',
    component: HistorialSabaticos
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    provideRouter(routes),
    { provide: APP_BASE_HREF, useValue: '/seguimiento-sabaticos/' },
    getSingleSpaExtraProviders(),
    provideHttpClient(withFetch())]
})
export class AppRoutingModule { }