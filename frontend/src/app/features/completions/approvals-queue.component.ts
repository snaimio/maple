import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { CompletionService } from '../../core/services/completion.service';
import { Assignment } from '../../core/models';

/**
 * Approvals Queue component for parents to review, approve, or reject
 * chores submitted by children.
 */
@Component({
  selector: 'app-approvals-queue',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="approvals-page">
      <!-- Success Toast Notification -->
      @if (successMessage(); as msg) {
        <div class="toast-banner">
          <div class="toast-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="toast-icon">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span>{{ msg }}</span>
          </div>
        </div>
      }

      <!-- Page Header -->
      <header class="page-header">
        <h1 class="page-title">Approvals Queue</h1>
        <p class="page-subtitle">Review and approve submitted chores</p>
      </header>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-list">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      } @else if (error(); as errMessage) {
        <!-- Error State -->
        <div class="error-box">
          <div class="error-header">
            <span class="error-icon">⚠️</span>
            <span class="error-title">Unable to load approvals</span>
          </div>
          <p class="error-text">{{ errMessage }}</p>
          <button type="button" class="btn-retry" (click)="loadApprovals()">
            Retry
          </button>
        </div>
      } @else {
        <!-- Approvals List -->
        <div class="approvals-list">
          @for (item of pendingApprovals(); track item.id) {
            <div class="approval-card">
              <!-- Left: Avatar -->
              <div class="card-left">
                @if (item.child_avatar_url) {
                  <img
                    [src]="item.child_avatar_url"
                    [alt]="item.child_name || item.assigned_to_name"
                    class="avatar-img"
                  />
                } @else {
                  <div class="avatar-circle">
                    {{ getInitials(item.child_name || item.assigned_to_name) }}
                  </div>
                }
              </div>

              <!-- Middle: Details -->
              <div class="card-middle">
                <div class="title-row">
                  <h3 class="chore-title">{{ item.chore_title }}</h3>
                  <span class="assignee-tag">by {{ item.child_name || item.assigned_to_name }}</span>
                </div>

                @if (item.submission_note) {
                  <p class="submission-note">
                    Note: "{{ item.submission_note }}"
                  </p>
                }

                @if (item.submitted_at) {
                  <span class="submitted-timestamp">
                    Submitted {{ formatTimestamp(item.submitted_at) }}
                  </span>
                }
              </div>

              <!-- Right: Points & Actions -->
              <div class="card-right">
                <span class="points-pill">
                  +{{ item.points || item.chore_points }} pts
                </span>

                <div class="actions-group">
                  <button
                    type="button"
                    class="btn-approve"
                    [disabled]="actionLoading()"
                    (click)="onApprove(item)"
                  >
                    @if (actionLoading() && approvingId() === item.id) {
                      <span>Approving...</span>
                    } @else {
                      <span>Approve</span>
                    }
                  </button>
                  <button
                    type="button"
                    class="btn-reject"
                    [disabled]="actionLoading()"
                    (click)="openRejectModal(item)"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          } @empty {
            <!-- Empty State -->
            <div class="empty-state-card">
              <div class="empty-emoji">🎉</div>
              <h2 class="empty-title">No pending approvals</h2>
              <p class="empty-subtitle">All submitted chores have been reviewed!</p>
            </div>
          }
        </div>
      }

      <!-- Reject Reason Modal -->
      @if (rejectingItem(); as itemToReject) {
        <div class="modal-backdrop" (click)="closeRejectModal()">
          <div
            class="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-dialog-title"
            (click)="$event.stopPropagation()"
          >
            <div class="modal-header">
              <h3 id="reject-dialog-title" class="modal-title">Reject Submission</h3>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close dialog"
                (click)="closeRejectModal()"
              >
                ✕
              </button>
            </div>

            <div class="modal-body">
              <p class="modal-lead">
                Rejecting completion for <strong>{{ itemToReject.chore_title }}</strong> submitted by
                <strong>{{ itemToReject.child_name || itemToReject.assigned_to_name }}</strong>.
              </p>

              @if (rejectModalError(); as modalErr) {
                <div class="modal-error-banner">
                  <span>{{ modalErr }}</span>
                </div>
              }

              <div class="form-group">
                <label for="reject-note-input" class="form-label">
                  Reason for rejection <span class="required">*</span>
                </label>
                <textarea
                  id="reject-note-input"
                  rows="3"
                  class="form-textarea"
                  placeholder="Explain what needs to be redone or improved..."
                  [value]="rejectNote()"
                  (input)="rejectNote.set($any($event.target).value)"
                  required
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn-cancel"
                [disabled]="actionLoading()"
                (click)="closeRejectModal()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-confirm-reject"
                [disabled]="actionLoading()"
                (click)="onConfirmReject()"
              >
                @if (actionLoading()) {
                  <span>Rejecting...</span>
                } @else {
                  <span>Confirm Reject</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .approvals-page {
      max-width: 900px;
      margin: 0 auto;
      padding: 32px 24px;
      min-height: 100vh;
      background-color: #F9FAFB;
      font-family: inherit;
      box-sizing: border-box;
    }

    /* Toast Notification */
    .toast-banner {
      position: sticky;
      top: 16px;
      z-index: 50;
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
      animation: slideDown 200ms ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .toast-content {
      background-color: #0F766E;
      color: #FFFFFF;
      padding: 10px 18px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    .toast-icon {
      width: 18px;
      height: 18px;
    }

    /* Header */
    .page-header {
      margin-bottom: 28px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    /* Loading Skeletons */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .skeleton-card {
      height: 92px;
      background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }

    @keyframes shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    /* Error Box */
    .error-box {
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      border-radius: 12px;
      padding: 20px;
      color: #991B1B;
      margin: 20px 0;
    }

    .error-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 15px;
      margin-bottom: 6px;
    }

    .error-text {
      font-size: 14px;
      color: #7F1D1D;
      margin: 0 0 14px 0;
    }

    .btn-retry {
      padding: 8px 16px;
      background-color: #DC2626;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    /* Approvals List */
    .approvals-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .approval-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .approval-card:hover {
      border-color: #D1D5DB;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.07);
    }

    /* Left: Avatar */
    .card-left {
      flex-shrink: 0;
    }

    .avatar-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #0F766E;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .avatar-img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    /* Middle: Info */
    .card-middle {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .chore-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.3;
    }

    .assignee-tag {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }

    .submission-note {
      font-size: 14px;
      font-style: italic;
      color: #4B5563;
      margin: 0;
      line-height: 1.4;
    }

    .submitted-timestamp {
      font-size: 12px;
      color: #9CA3AF;
    }

    /* Right: Points & Actions */
    .card-right {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-shrink: 0;
    }

    .points-pill {
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .actions-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-approve {
      padding: 8px 16px;
      background-color: #10B981;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .btn-approve:hover:not(:disabled) {
      background-color: #059669;
    }

    .btn-reject {
      padding: 8px 14px;
      background-color: #FFFFFF;
      color: #DC2626;
      border: 1px solid #DC2626;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-reject:hover:not(:disabled) {
      background-color: #FEF2F2;
    }

    .btn-approve:disabled,
    .btn-reject:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Empty State */
    .empty-state-card {
      background-color: #FFFFFF;
      border: 1px dashed #D1D5DB;
      border-radius: 12px;
      padding: 56px 24px;
      text-align: center;
      margin-top: 12px;
    }

    .empty-emoji {
      font-size: 40px;
      margin-bottom: 12px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 6px 0;
    }

    .empty-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    /* Reject Modal */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(17, 24, 39, 0.45);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 1000;
      animation: fadeIn 150ms ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-card {
      background-color: #FFFFFF;
      border-radius: 14px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      animation: scaleUp 150ms ease;
    }

    @keyframes scaleUp {
      from {
        opacity: 0;
        transform: scale(0.96);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .modal-header {
      padding: 20px 20px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #F3F4F6;
    }

    .modal-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .modal-close-btn {
      background: none;
      border: none;
      font-size: 16px;
      color: #9CA3AF;
      cursor: pointer;
      padding: 4px 6px;
      border-radius: 4px;
    }

    .modal-close-btn:hover {
      color: #111827;
      background-color: #F3F4F6;
    }

    .modal-body {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .modal-lead {
      font-size: 14px;
      color: #374151;
      margin: 0;
      line-height: 1.4;
    }

    .modal-error-banner {
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      color: #991B1B;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-label {
      font-size: 13px;
      font-weight: 600;
      color: #374151;
    }

    .required {
      color: #DC2626;
    }

    .form-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 10px 12px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      font-size: 14px;
      color: #111827;
      background-color: #FFFFFF;
      font-family: inherit;
      resize: vertical;
    }

    .form-textarea:focus {
      outline: none;
      border-color: #0F766E;
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
    }

    .modal-footer {
      padding: 14px 20px 20px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid #F3F4F6;
    }

    .btn-cancel {
      padding: 8px 16px;
      background-color: #FFFFFF;
      color: #374151;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-cancel:hover:not(:disabled) {
      background-color: #F3F4F6;
    }

    .btn-confirm-reject {
      padding: 8px 16px;
      background-color: #DC2626;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .btn-confirm-reject:hover:not(:disabled) {
      background-color: #B91C1C;
    }

    .btn-confirm-reject:disabled,
    .btn-cancel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 640px) {
      .approval-card {
        flex-direction: column;
        align-items: flex-start;
      }

      .card-right {
        width: 100%;
        justify-content: space-between;
        padding-top: 12px;
        border-top: 1px solid #F3F4F6;
      }
    }
  `],
})
export class ApprovalsQueueComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly completionService = inject(CompletionService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendingApprovals = signal<Assignment[]>([]);
  readonly rejectingItem = signal<Assignment | null>(null);
  readonly rejectNote = signal('');
  readonly rejectModalError = signal<string | null>(null);
  readonly actionLoading = signal(false);
  readonly approvingId = signal<number | null>(null);
  readonly successMessage = signal<string | null>(null);

  private toastTimeout: any = null;

  ngOnInit(): void {
    this.loadApprovals();
  }

  loadApprovals(): void {
    const householdId = this.authService.currentHouseholdId();
    if (!householdId) {
      this.loading.set(false);
      this.error.set('No household found.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.apiService
      .get<{ assignments: Assignment[] }>(`/assignments?status=submitted&household_id=${householdId}`)
      .subscribe({
        next: (res) => {
          this.pendingApprovals.set(res.assignments || []);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to load submitted approvals.');
        },
      });
  }

  onApprove(item: Assignment): void {
    const completionId = item.completion_id;
    if (!completionId) {
      this.error.set('No completion ID found for this assignment.');
      return;
    }

    this.actionLoading.set(true);
    this.approvingId.set(item.id);
    this.completionService.approve(completionId).subscribe({
      next: () => {
        this.pendingApprovals.update((list) => list.filter((a) => a.id !== item.id));
        this.actionLoading.set(false);
        this.approvingId.set(null);
        this.showToast('Chore approved — points awarded!');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.approvingId.set(null);
        this.error.set(err?.error?.error || 'Failed to approve chore.');
      },
    });
  }

  openRejectModal(item: Assignment): void {
    this.rejectingItem.set(item);
    this.rejectNote.set('');
    this.rejectModalError.set(null);
  }

  closeRejectModal(): void {
    this.rejectingItem.set(null);
    this.rejectNote.set('');
    this.rejectModalError.set(null);
  }

  onConfirmReject(): void {
    const item = this.rejectingItem();
    if (!item) return;

    const note = this.rejectNote().trim();
    if (!note) {
      this.rejectModalError.set('A rejection note is required.');
      return;
    }

    const completionId = item.completion_id;
    if (!completionId) {
      this.rejectModalError.set('No completion ID found for this assignment.');
      return;
    }

    this.actionLoading.set(true);
    this.rejectModalError.set(null);

    this.completionService.reject(completionId, note).subscribe({
      next: () => {
        this.pendingApprovals.update((list) => list.filter((a) => a.id !== item.id));
        this.actionLoading.set(false);
        this.closeRejectModal();
        this.showToast('Chore rejected');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.rejectModalError.set(err?.error?.error || 'Failed to reject chore.');
      },
    });
  }

  showToast(message: string): void {
    this.successMessage.set(message);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
  }

  getInitials(name?: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  formatTimestamp(dateStr?: string | null): string {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  }
}
