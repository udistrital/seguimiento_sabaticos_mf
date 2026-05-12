import { Injectable } from '@angular/core';
import { RequestManager } from '../../managers/requestManager';

@Injectable({
  providedIn: 'root'
})
export class SabaticosCrudService {

  constructor(
    private readonly requestManager: RequestManager
  ) {
    this.requestManager.setPath('SABATICOS_CRUD_SERVICE');
  }

  get(endpoint: string) {
    this.requestManager.setPath('SABATICOS_CRUD_SERVICE');
    return this.requestManager.get(endpoint);
  }
}
