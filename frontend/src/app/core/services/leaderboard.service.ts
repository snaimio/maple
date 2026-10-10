import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { LeaderboardEntry } from '../models';

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

/**
 * Service managing household leaderboard rankings and point tallies.
 */
@Injectable({
  providedIn: 'root',
})
export class LeaderboardService {
  private readonly api = inject(ApiService);

  /**
   * Fetches the points leaderboard ranking for the specified household.
   *
   * @param householdId The household ID
   * @returns Observable emitting an array of ranked LeaderboardEntry items
   */
  get(householdId: number): Observable<LeaderboardEntry[]> {
    return this.api
      .get<LeaderboardResponse>(`/households/${householdId}/leaderboard`)
      .pipe(map((res) => res.leaderboard || []));
  }
}
