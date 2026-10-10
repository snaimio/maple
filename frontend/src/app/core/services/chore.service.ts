import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Chore } from '../models';

export interface ChoresResponse {
  chores: Chore[];
}

export interface ChoreResponse {
  chore: Chore;
}

/**
 * Service managing household chores creation, updates, listing, and soft deletion.
 */
@Injectable({
  providedIn: 'root',
})
export class ChoreService {
  private readonly api = inject(ApiService);

  /**
   * Retrieves all active chores for a household.
   *
   * @param householdId The household ID
   * @returns Observable emitting an array of Chore objects
   */
  list(householdId: number): Observable<Chore[]> {
    return this.api
      .get<ChoresResponse>(`/households/${householdId}/chores`)
      .pipe(map((res) => res.chores || []));
  }

  /**
   * Creates a new chore within the specified household.
   *
   * @param householdId The household ID
   * @param data Chore data properties to persist
   * @returns Observable emitting the created Chore object
   */
  create(householdId: number, data: Partial<Chore>): Observable<Chore> {
    return this.api
      .post<ChoreResponse>(`/households/${householdId}/chores`, data)
      .pipe(map((res) => res.chore));
  }

  /**
   * Updates an existing chore's properties.
   *
   * @param choreId The ID of the chore to update
   * @param data Properties to modify
   * @returns Observable emitting the updated Chore object
   */
  update(choreId: number, data: Partial<Chore>): Observable<Chore> {
    return this.api
      .put<ChoreResponse>(`/chores/${choreId}`, data)
      .pipe(map((res) => res.chore));
  }

  /**
   * Soft-deletes a chore by setting is_active to 0.
   *
   * @param choreId The ID of the chore to remove
   * @returns Observable completing when the chore is deleted
   */
  remove(choreId: number): Observable<void> {
    return this.api
      .delete<unknown>(`/chores/${choreId}`)
      .pipe(map(() => void 0));
  }
}
