import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Base API service that wraps Angular HttpClient and ensures
 * all requests are targeted to the /api/v1 endpoint prefix.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  /**
   * Formats the given endpoint path with the /api/v1 prefix.
   *
   * @param path Relative path (e.g. '/households' or 'households')
   * @returns Formatted URL path prefixed with /api/v1
   */
  private buildUrl(path: string): string {
    if (path.startsWith(this.baseUrl)) {
      return path;
    }
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  /**
   * Performs an HTTP GET request to the specified API path.
   *
   * @template T Expected response body type
   * @param path API endpoint path (e.g. '/auth/me')
   * @param params Optional query parameters
   * @returns Observable of response type T
   */
  get<T>(path: string, params?: HttpParams | Record<string, string | number | boolean>): Observable<T> {
    return this.http.get<T>(this.buildUrl(path), { params });
  }

  /**
   * Performs an HTTP POST request to the specified API path with a payload.
   *
   * @template T Expected response body type
   * @param path API endpoint path (e.g. '/auth/login')
   * @param body Request body payload
   * @returns Observable of response type T
   */
  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(this.buildUrl(path), body);
  }

  /**
   * Performs an HTTP PUT request to the specified API path with a payload.
   *
   * @template T Expected response body type
   * @param path API endpoint path (e.g. '/chores/1')
   * @param body Request body payload
   * @returns Observable of response type T
   */
  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(this.buildUrl(path), body);
  }

  /**
   * Performs an HTTP DELETE request to the specified API path.
   *
   * @template T Expected response body type
   * @param path API endpoint path (e.g. '/chores/1')
   * @returns Observable of response type T
   */
  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.buildUrl(path));
  }
}
