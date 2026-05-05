import { Injectable } from '@angular/core';
import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';
import { catchError, map } from 'rxjs/operators';
import { HttpErrorManager } from './errorManager'

/**
 * This class manage the http connections with internal REST services. Use the response format {
 *  Code: 'xxxxx',
 *  Body: 'Some Data' (this element is returned if the request is success)
 *  ...
 * }
 */
@Injectable({
  providedIn: 'root',
})
export class RequestManager {
  private path!: any;
  public httpOptions: any;
  private readonly rawHttp: HttpClient;
  constructor(private readonly http: HttpClient, private readonly errManager: HttpErrorManager, httpBackend: HttpBackend) {
    this.rawHttp = new HttpClient(httpBackend);
    const acces_token = window.localStorage.getItem('access_token');
    if (acces_token !== null) {
      this.httpOptions = {
         headers: new HttpHeaders({
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${acces_token}`,
         }),
      }
    }
  }


  /**
   * Use for set the source path of the service (service's name must be present at src/environment/environment.ts)
   * @param service: string
   */
  public setPath(service: string) {
    this.path = environment[service as keyof typeof environment];
  }


  /**
   * Perform a GET http request
   * @param endpoint service's end-point
   * @param params (an Key, Value object with que query params for the request)
   * @returns Observable<any>
   */
  get(endpoint: any) {
    return this.http.get<any>(`${this.path}${endpoint}`, this.httpOptions).pipe(
      map(
        (res) => {
          if (res.hasOwnProperty('Body')) {
            return res;
          } else {
            return res;
          }
        },
      ),
      catchError(this.errManager.handleError.bind(this)),
    );
  }

  /**
   * Perform a GET http request expecting an XML response
   * @param endpoint service's end-point
   * @returns Observable<string>
   */
  getXml(endpoint: any) {
    const acces_token = window.localStorage.getItem('access_token');
    const headers = acces_token
      ? new HttpHeaders({ 'Authorization': `Bearer ${acces_token}` })
      : new HttpHeaders();

    return this.http.get(`${this.path}${endpoint}`, {
      headers,
      responseType: 'text'
    }).pipe(
      catchError(this.errManager.handleError.bind(this)),
    );
  }

  /**
   * Perform a POST http request
   * @param endpoint service's end-point
   * @param element data to send as JSON
   * @returns Observable<any>
   */
  post(endpoint: any, element: any) {
    return this.http.post<any>(`${this.path}${endpoint}`, element, this.httpOptions).pipe(
      catchError(this.errManager.handleError),
    );
  }

  /**
   * Perform a POST http request for FormData
   * @param endpoint service's end-point
   * @param element FormData to send
   * @returns Observable<any>
   */
  post_file(endpoint: any, element: FormData) {
    const acces_token = window.localStorage.getItem('access_token');
    const headers = acces_token
      ? new HttpHeaders({ 'Authorization': `Bearer ${acces_token}` })
      : new HttpHeaders();
    
    return this.http.post<any>(`${this.path}${endpoint}`, element, { headers }).pipe(
      catchError(this.errManager.handleError),
    );
  }

  post_file_without_spinner(endpoint: any, element: FormData) {
    const acces_token = window.localStorage.getItem('access_token');
    const headers = acces_token
      ? new HttpHeaders({ 'Authorization': `Bearer ${acces_token}` })
      : new HttpHeaders();

    return this.rawHttp.post<any>(`${this.path}${endpoint}`, element, { headers }).pipe(
      catchError(this.errManager.handleError),
    );
  }

  /**
   * Perform a PUT http request
   * @param endpoint service's end-point
   * @param element data to send as JSON, With the id to UPDATE
   * @returns Observable<any>
   */
  put(endpoint: any, element: { Id: any; }) {
    const path = (element.Id) ? `${this.path}${endpoint}/${element.Id}` : `${this.path}${endpoint}`;
    return this.http.put<any>(path, element, this.httpOptions).pipe(
      catchError(this.errManager.handleError),
    );
  }

  /**
   * Perform a DELETE http request
   * @param endpoint service's end-point
   * @param id element's id for remove
   * @returns Observable<any>
   */
  delete(endpoint: any, id: any) {
    return this.http.delete<any>(`${this.path}${endpoint}/${id}`, this.httpOptions).pipe(
      catchError(this.errManager.handleError),
    );
  }
};
