import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Household, HouseholdMember } from '../models';

export interface HouseholdResponse {
  household: Household;
}

export interface HouseholdMembersResponse {
  members: HouseholdMember[];
}

/**
 * Service managing household creation, joining via invite codes,
 * and fetching household members.
 */
@Injectable({
  providedIn: 'root',
})
export class HouseholdService {
  private readonly api = inject(ApiService);

  /**
   * Creates a new household with the specified name.
   *
   * @param name The household name (e.g. "The Miller Family")
   * @returns Observable emitting the created Household object including its generated invite_code
   */
  create(name: string): Observable<Household> {
    return this.api
      .post<HouseholdResponse>('/households', { name })
      .pipe(map((res) => res.household));
  }

  /**
   * Joins an existing household using an 8-character invite code.
   *
   * @param inviteCode The 8-character unique invite code
   * @returns Observable emitting the joined Household object
   */
  join(inviteCode: string): Observable<Household> {
    return this.api
      .post<HouseholdResponse>('/households/join', { invite_code: inviteCode })
      .pipe(map((res) => res.household));
  }

  /**
   * Retrieves all members associated with a given household, including roles and points balances.
   *
   * @param householdId The household ID
   * @returns Observable emitting the list of HouseholdMember objects
   */
  getMembers(householdId: number): Observable<HouseholdMember[]> {
    return this.api
      .get<HouseholdMembersResponse>(`/households/${householdId}/members`)
      .pipe(map((res) => res.members));
  }
}
