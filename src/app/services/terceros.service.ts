import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';

@Injectable({
  providedIn: 'root'
})
export class TercerosService {

  constructor(private readonly requestManager: RequestManager) {
    this.requestManager.setPath('TERCEROS_SERVICE');
  }

  get(endpoint: string) {
    this.requestManager.setPath('TERCEROS_SERVICE');
    return this.requestManager.get(endpoint);
  }
}
