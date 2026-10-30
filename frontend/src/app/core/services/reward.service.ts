import { inject, Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiService } from './api.service';
import { Reward, Redemption } from '../models';

export interface RewardsResponse {
  rewards: Reward[];
}

export interface RewardResponse {
  reward: Reward;
}

export interface RedemptionsResponse {
  redemptions: Redemption[];
}

export interface RedemptionResponse {
  redemption: Redemption;
  points_deducted?: number;
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

  /**
   * Creates a new reward within the specified household.
   *
   * @param householdId The household ID
   * @param data Reward data properties to persist
   * @returns Observable emitting the created Reward object
   */
  create(householdId: number, data: Partial<Reward>): Observable<Reward> {
    return this.api
      .post<RewardResponse>(`/households/${householdId}/rewards`, {
        title: data.title,
        description: data.description,
        cost_points: data.cost_points ?? data.cost,
      })
      .pipe(map((res) => res.reward));
  }

  /**
   * Updates an existing reward's properties.
   *
   * @param rewardId The ID of the reward to update
   * @param data Properties to modify
   * @returns Observable emitting the updated Reward object
   */
  update(rewardId: number, data: Partial<Reward>): Observable<Reward> {
    return this.api
      .put<RewardResponse>(`/rewards/${rewardId}`, {
        title: data.title,
        description: data.description,
        cost_points: data.cost_points ?? data.cost,
        is_active: data.is_active,
      })
      .pipe(map((res) => res.reward));
  }

  /**
   * Soft-deletes a reward by setting is_active to false.
   *
   * @param rewardId The ID of the reward to remove
   * @returns Observable completing when the reward is deleted
   */
  remove(rewardId: number): Observable<void> {
    return this.api
      .delete<unknown>(`/rewards/${rewardId}`)
      .pipe(map(() => void 0));
  }

  /**
   * Submits a redemption request for a reward on behalf of the current child user.
   *
   * @param rewardId The ID of the reward being redeemed
   * @returns Observable emitting the redemption response
   */
  redeem(rewardId: number): Observable<RedemptionResponse> {
    return this.api.post<RedemptionResponse>(`/rewards/${rewardId}/redeem`, {});
  }

  /**
   * Retrieves all pending redemptions for a given household.
   *
   * @param householdId The household ID
   * @returns Observable emitting an array of pending Redemption records
   */
  listRedemptions(householdId: number): Observable<Redemption[]> {
    return this.api
      .get<RedemptionsResponse>(`/households/${householdId}/redemptions`)
      .pipe(map((res) => res.redemptions || []));
  }

  /**
   * Approves a pending reward redemption and deducts points from the child's balance.
   *
   * @param redemptionId The redemption ID
   * @returns Observable emitting the approval response
   */
  approveRedemption(redemptionId: number): Observable<RedemptionResponse> {
    return this.api.put<RedemptionResponse>(`/redemptions/${redemptionId}/approve`);
  }

  /**
   * Rejects a pending reward redemption with an explanation note.
   *
   * @param redemptionId The redemption ID
   * @param note Explanation note for the rejection
   * @returns Observable emitting the rejection response
   */
  rejectRedemption(redemptionId: number, note: string): Observable<RedemptionResponse> {
    return this.api.put<RedemptionResponse>(`/redemptions/${redemptionId}/reject`, {
      note,
      rejection_note: note,
    });
  }
}
