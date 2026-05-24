import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { RequestManager } from '../../managers/requestManager';

export interface CrearSolicitudFormulario {
  [key: string]: unknown;
}

export interface CrearSolicitudRequest {
  TerceroId: number;
  TipoSolicitudId: string;
  SabaticoId: number;
  formulario: CrearSolicitudFormulario;
}

export interface CrearSolicitudResponse {
  Data?: {
    Solicitud?: {
      Id?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root'
})
export class SabaticosMidService {

  constructor(
    private readonly requestManager: RequestManager
  ) {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
  }

  crearSolicitud(payload: CrearSolicitudRequest): Observable<CrearSolicitudResponse> {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    // `RequestManager.post` se tipa como `Observable<HttpEvent<any>>` porque sus
    // opciones HTTP están declaradas como `any`. El backend devuelve siempre el
    // body parseado, así que casteamos para exponer una API tipada al consumidor.
    return this.requestManager.post('solicitud', payload) as unknown as Observable<CrearSolicitudResponse>;
  }

  subirSoporteSolicitud(formData: FormData): Observable<any> {
    this.requestManager.setPath('SABATICOS_MID_SERVICE');
    return this.requestManager.post_file('soporte_solicitud', formData) as unknown as Observable<any>;
  }
}
