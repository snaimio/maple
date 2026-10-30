import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Assignment } from '../models';

export interface AssignmentsResponse {
  assignments: Assignment[];
}

/**
 * Service managing chore assignments across household members.
 */
@Injectable({
  providedIn: 'root',
})
export class AssignmentService {
  private readonly api = inject(ApiService);

  /**
   * Retrieves assignments filtered by completion status for a given household.
   *
   * @param householdId The household ID
   * @param status The assignment status filter (e.g. 'submitted', 'pending', 'approved')
   * @returns Observable emitting an array of Assignment records
   */
  listByStatus(householdId: number, status: string): Observable<Assignment[]> {
    return this.api
      .get<AssignmentsResponse>('/assignments', { status })
      .pipe(
        map((res) =>
          (res.assignments || []).filter((a) => a.household_id === householdId)
        )
      );
  }

  /**
   * Retrieves all assignments for a given household.
   *
   * @param householdId The household ID
   * @returns Observable emitting an array of Assignment records
   */
  listByHousehold(householdId: number): Observable<Assignment[]> {
    return this.api
      .get<AssignmentsResponse>('/assignments', { household_id: householdId })
      .pipe(
        map((res) =>
          (res.assignments || []).filter((a) => a.household_id === householdId)
        )
      );
  }

  /**
   * Retrieves assignments assigned to a specific user within a household.
   *
   * @param userId The user (child) ID
   * @param householdId The household ID
   * @returns Observable emitting an array of Assignment records
   */
  listByUser(userId: number, householdId: number): Observable<Assignment[]> {
    return this.api
      .get<AssignmentsResponse>('/assignments', {
        user_id: userId,
        household_id: householdId,
      })
      .pipe(
        map((res) =>
          (res.assignments || []).filter(
            (a) => a.household_id === householdId && a.assigned_to === userId
          )
        )
      );
  }
}
