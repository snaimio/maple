import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface CompletionActionResponse {
  completion: {
    id: number;
    status: 'approved' | 'rejected';
  };
  points_awarded?: number;
}

/**
 * Service managing chore completion reviews, approvals, and rejections.
 */
@Injectable({
  providedIn: 'root',
})
export class CompletionService {
  private readonly api = inject(ApiService);

  /**
   * Approves a pending chore completion and awards points to the assignee.
   *
   * @param completionId The completion ID in chore_completions
   * @returns Observable emitting the approval response
   */
  approve(completionId: number): Observable<CompletionActionResponse> {
    return this.api.put<CompletionActionResponse>(`/completions/${completionId}/approve`);
  }

  /**
   * Rejects a pending chore completion with an optional or required review note.
   *
   * @param completionId The completion ID in chore_completions
   * @param note Explanation note for the rejection
   * @returns Observable emitting the rejection response
   */
  reject(completionId: number, note: string): Observable<CompletionActionResponse> {
    return this.api.put<CompletionActionResponse>(`/completions/${completionId}/reject`, {
      note,
      rejection_note: note,
    });
  }
}
