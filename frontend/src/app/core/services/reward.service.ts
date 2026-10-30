import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Reward } from '../models';

export interface RewardsResponse {
  rewards: Reward[];
}

/**
 * Service managing household rewards catalog and redemption options.
 */
@Injectable({
  providedIn: 'root',
})
export class RewardService {
  private readonly api = inject(ApiService);

  /**
   * Retrieves all active rewards available for redemption in a household.
   *
   * @param householdId The household ID
   * @returns Observable emitting an array of Reward items
   */
  list(householdId: number): Observable<Reward[]> {
    return this.api
      .get<RewardsResponse>(`/households/${householdId}/rewards`)
      .pipe(map((res) => res.rewards || []));
  }
}
