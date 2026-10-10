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
}
