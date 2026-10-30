import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Base API service that wraps Angular HttpClient and ensures
 * all requests are targeted to the /api/v1 endpoint prefix.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  private formatPath(path: string): string {
    return path.startsWith('/') ? `${this.baseUrl}${path}` : `${this.baseUrl}/${path}`;
  }

  get<T>(path: string, params?: any): Observable<T> {
    return this.http.get<T>(this.formatPath(path), { params });
  }

  post<T>(path: string, body?: any): Observable<T> {
    return this.http.post<T>(this.formatPath(path), body ?? {});
  }

  put<T>(path: string, body?: any): Observable<T> {
    return this.http.put<T>(this.formatPath(path), body ?? {});
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.formatPath(path));
  }
}