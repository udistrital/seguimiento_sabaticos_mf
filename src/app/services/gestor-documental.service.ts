import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';
import { Observable, map } from 'rxjs';

export interface NuxeoDocumento {
  Enlace: string;
  Id: number;
  Nombre: string;
  Nuxeo: {
    'file:content': {
      data: string;
      name: string;
      'mime-type': string;
    };
    'dc:title': string;
    file: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GestorDocumentalService {

  constructor(private readonly requestManager: RequestManager) {
    this.requestManager.setPath('GESTOR_DOCUMENTAL_MID_SERVICE');
  }

  get(endpoint: string) {
    this.requestManager.setPath('GESTOR_DOCUMENTAL_MID_SERVICE');
    return this.requestManager.get(endpoint);
  }

  getDocumentoById(documentoId: number): Observable<NuxeoDocumento | null> {
    this.requestManager.setPath('GESTOR_DOCUMENTAL_MID_SERVICE');
    return this.requestManager.get(`document?query=id:${documentoId}`).pipe(
      map((res: any) => {
        const data = res?.Data;
        if (Array.isArray(data) && data.length > 0) {
          return data[0] as NuxeoDocumento;
        }
        return null;
      })
    );
  }

  getBlobUrlFromDocumento(doc: NuxeoDocumento): string | null {
    const base64 = doc?.Nuxeo?.file;
    if (!base64) {
      return null;
    }

    const mimeType = doc?.Nuxeo?.['file:content']?.['mime-type'] ?? 'application/pdf';
    const byteCharacters = atob(base64);
    const byteNumbers = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([byteNumbers], { type: mimeType });
    return URL.createObjectURL(blob);
  }
}
