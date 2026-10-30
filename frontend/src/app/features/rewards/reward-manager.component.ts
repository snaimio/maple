import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { RewardService } from '../../core/services/reward.service';
import { Reward, Redemption } from '../../core/models';

/**
 * Parent Reward Manager component for parents to manage the reward catalog,
 * create/edit/delete rewards, and approve or reject redemption requests from children.
 */
@Component({
  selector: 'app-reward-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reward-manager-page">
      <!-- Toast Notification -->
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
      <header class="manager-header">
        <div>
          <h1 class="page-title">Rewards Hub</h1>
          <p class="page-subtitle">Set up family rewards and review redemption requests</p>
        </div>
      </header>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-list">
          <div class="skeleton-hero"></div>
          <div class="skeleton-card"></div>
        </div>
      } @else if (error(); as errMessage) {
        <!-- Error State -->
        <div class="error-box">
          <div class="error-header">
            <span class="error-icon">⚠️</span>
            <span class="error-title">Unable to load rewards</span>
          </div>
          <p class="error-text">{{ errMessage }}</p>
          <button type="button" class="btn-retry" (click)="loadData()">
            Retry
          </button>
        </div>
      } @else {
        <!-- 1. Pending Redemptions Section (only if non-empty) -->
        @if (pendingRedemptions().length > 0) {
          <section class="section-container redemptions-section">
            <div class="section-header">
              <div class="section-title-group">
                <span class="pulse-indicator"></span>
                <h2 class="section-title">Pending Redemptions</h2>
              </div>
              <span class="count-tag">{{ pendingRedemptions().length }} awaiting review</span>
            </div>

            <div class="redemptions-list">
              @for (item of pendingRedemptions(); track item.id) {
                <div class="redemption-card">
                  <div class="redemption-left">
                    <div class="child-avatar">
                      @if (item.child_avatar_url) {
                        <img [src]="item.child_avatar_url" [alt]="item.child_name || 'Child'" class="avatar-img" />
                      } @else {
                        {{ getInitials(item.child_name) }}
                      }
                    </div>

                    <div class="redemption-info">
                      <p class="redemption-headline">
                        <strong>{{ item.child_name || 'Child' }}</strong> wants to redeem
                        <strong>"{{ item.reward_title }}"</strong>
                      </p>
                      @if (item.created_at || item.requested_at) {
                        <span class="redemption-time">
                          Requested {{ formatTimestamp(item.created_at || item.requested_at) }}
                        </span>
                      }
                    </div>
                  </div>

                  <div class="redemption-right">
                    <span class="cost-pill">{{ item.cost_points || item.points_spent }} pts</span>
                    <div class="action-buttons">
                      <button
                        type="button"
                        class="btn-approve"
                        [disabled]="actionLoading()"
                        (click)="onApprove(item)"
                      >
                        Approve
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
              }
            </div>
          </section>
        }

        <!-- 2. Manage Rewards Section -->
        <section class="section-container">
          <div class="section-header">
            <h2 class="section-title">Manage Rewards</h2>
            <button type="button" class="btn-primary" (click)="openCreateForm()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              + New Reward
            </button>
          </div>

          <div class="rewards-grid">
            @for (reward of rewards(); track reward.id) {
              <div class="reward-manage-card">
                <div class="card-main">
                  <div class="title-row">
                    <h3 class="reward-title">{{ reward.title }}</h3>
                    <span class="cost-badge">{{ getCost(reward) }} pts</span>
                  </div>

                  @if (reward.description) {
                    <p class="reward-desc">{{ reward.description }}</p>
                  }
                </div>

                <div class="card-actions">
                  <button type="button" class="btn-edit" (click)="openEditForm(reward)">
                    Edit
                  </button>
                  <button type="button" class="btn-delete" (click)="onDelete(reward)">
                    Delete
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-rewards-card">
                <span class="empty-emoji">🎁</span>
                <h3 class="empty-title">No rewards yet</h3>
                <p class="empty-subtitle">Create your first one to motivate your family!</p>
                <button type="button" class="btn-primary" (click)="openCreateForm()">
                  + Create First Reward
                </button>
              </div>
            }
          </div>
        </section>
      }

      <!-- New / Edit Reward Modal Form -->
      @if (showForm()) {
        <div class="modal-backdrop" (click)="closeForm()">
          <div
            class="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-dialog-title"
            (click)="$event.stopPropagation()"
          >
            <div class="modal-header">
              <h3 id="form-dialog-title" class="modal-title">
                {{ editingReward() ? 'Edit Reward' : 'Create New Reward' }}
              </h3>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close dialog"
                (click)="closeForm()"
              >
                ✕
              </button>
            </div>

            <form (ngSubmit)="onSaveForm()" class="modal-body">
              @if (formError(); as err) {
                <div class="form-error-banner">
                  <span>{{ err }}</span>
                </div>
              }

              <!-- Title -->
              <div class="form-group">
                <label for="reward-title-input" class="form-label">
                  Title <span class="required">*</span>
                </label>
                <input
                  id="reward-title-input"
                  type="text"
                  class="form-input"
                  placeholder="e.g., 30 mins video games, Trip to the zoo"
                  [value]="formTitle()"
                  (input)="formTitle.set($any($event.target).value)"
                  required
                />
              </div>

              <!-- Cost -->
              <div class="form-group">
                <label for="reward-cost-input" class="form-label">
                  Cost (Points) <span class="required">*</span>
                </label>
                <input
                  id="reward-cost-input"
                  type="number"
                  min="1"
                  max="10000"
                  class="form-input"
                  [value]="formCost()"
                  (input)="formCost.set(+$any($event.target).value)"
                  required
                />
              </div>

              <!-- Description -->
              <div class="form-group">
                <label for="reward-desc-input" class="form-label">Description</label>
                <textarea
                  id="reward-desc-input"
                  rows="3"
                  class="form-textarea"
                  placeholder="Optional details or rules for this reward..."
                  [value]="formDescription()"
                  (input)="formDescription.set($any($event.target).value)"
                ></textarea>
              </div>

              <div class="modal-footer">
                <button
                  type="button"
                  class="btn-cancel"
                  [disabled]="actionLoading()"
                  (click)="closeForm()"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="btn-primary"
                  [disabled]="actionLoading()"
                >
                  @if (actionLoading()) {
                    <span>Saving...</span>
                  } @else {
                    <span>Save</span>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- Reject Reason Modal -->
      @if (rejectingRedemption(); as item) {
        <div class="modal-backdrop" (click)="closeRejectModal()">
          <div
            class="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-redemption-title"
            (click)="$event.stopPropagation()"
          >
            <div class="modal-header">
              <h3 id="reject-redemption-title" class="modal-title">Reject Redemption</h3>
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
                Reject redemption for <strong>"{{ item.reward_title }}"</strong> requested by
                <strong>{{ item.child_name || 'Child' }}</strong>?
              </p>

              <div class="form-group">
                <label for="rejection-note-input" class="form-label">
                  Reason (optional)
                </label>
                <textarea
                  id="rejection-note-input"
                  rows="3"
                  class="form-textarea"
                  placeholder="Explain why this reward cannot be granted right now..."
                  [value]="rejectionNote()"
                  (input)="rejectionNote.set($any($event.target).value)"
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
    .reward-manager-page {
      max-width: 960px;
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
      z-index: 60;
      margin-bottom: 20px;
      display: flex;
      justify-content: center;
      animation: slideDown 200ms ease;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .toast-content {
      background-color: #0F766E;
      color: #FFFFFF;
      padding: 10px 20px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .toast-icon {
      width: 18px;
      height: 18px;
    }

    /* Header */
    .manager-header {
      margin-bottom: 28px;
    }

    .page-title {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .page-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    /* Section Container */
    .section-container {
      margin-bottom: 36px;
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .section-title-group {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .pulse-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #F59E0B;
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
    }

    .count-tag {
      font-size: 13px;
      font-weight: 600;
      background-color: #FEF3C7;
      color: #B45309;
      padding: 3px 10px;
      border-radius: 9999px;
    }

    /* Pending Redemptions List */
    .redemptions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .redemption-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }

    .redemption-left {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 0;
    }

    .child-avatar {
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
      flex-shrink: 0;
    }

    .avatar-img {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .redemption-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .redemption-headline {
      font-size: 15px;
      color: #111827;
      margin: 0;
      line-height: 1.35;
    }

    .redemption-time {
      font-size: 12px;
      color: #9CA3AF;
    }

    .redemption-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .cost-pill {
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .action-buttons {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn-approve {
      padding: 7px 14px;
      background-color: #10B981;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .btn-approve:hover:not(:disabled) {
      background-color: #059669;
    }

    .btn-reject {
      padding: 7px 12px;
      background-color: #FFFFFF;
      color: #DC2626;
      border: 1px solid #DC2626;
      border-radius: 6px;
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

    /* Manage Rewards Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .reward-manage-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 14px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .card-main {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .reward-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.3;
    }

    .cost-badge {
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 12px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .reward-desc {
      font-size: 13px;
      color: #6B7280;
      margin: 0;
      line-height: 1.45;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid #F3F4F6;
    }

    .btn-edit {
      flex: 1;
      padding: 7px 12px;
      background-color: #FFFFFF;
      color: #0F766E;
      border: 1px solid #0F766E;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .btn-edit:hover {
      background-color: #F0FDFA;
    }

    .btn-delete {
      padding: 7px 12px;
      background-color: #FFFFFF;
      color: #6B7280;
      border: 1px solid #D1D5DB;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-delete:hover {
      color: #DC2626;
      border-color: #FCA5A5;
      background-color: #FEF2F2;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 9px 16px;
      background-color: #0F766E;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 150ms ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #0D655E;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-icon {
      width: 16px;
      height: 16px;
    }

    /* Empty Rewards State */
    .empty-rewards-card {
      grid-column: 1 / -1;
      background-color: #FFFFFF;
      border: 1px dashed #D1D5DB;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .empty-emoji {
      font-size: 40px;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .empty-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0 0 12px 0;
    }

    /* Skeleton Loading */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skeleton-hero {
      height: 80px;
      background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 12px;
    }

    .skeleton-card {
      height: 160px;
      background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
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

    /* Modal Backdrop */
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
      max-width: 480px;
      overflow: hidden;
      animation: scaleUp 150ms ease;
    }

    @keyframes scaleUp {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
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

    .form-error-banner {
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

    .form-input,
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
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #0F766E;
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
    }

    .form-textarea {
      resize: vertical;
    }

    .modal-lead {
      font-size: 15px;
      color: #111827;
      margin: 0;
      line-height: 1.4;
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
    }

    @media (max-width: 768px) {
      .reward-manager-page {
        padding: 24px 20px;
      }

      .rewards-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }
    }

    @media (max-width: 480px) {
      .reward-manager-page {
        padding: 16px;
      }

      .page-title {
        font-size: 24px;
      }

      .page-subtitle {
        font-size: 13px;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .btn-primary {
        width: 100%;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .redemption-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
      }

      .redemption-left {
        width: 100%;
      }

      .redemption-right {
        width: 100%;
        justify-content: space-between;
        align-items: center;
        padding-top: 10px;
        border-top: 1px solid #F3F4F6;
      }

      .btn-approve,
      .btn-reject {
        min-height: 44px;
        padding: 8px 14px;
      }

      .rewards-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .btn-edit,
      .btn-delete {
        min-height: 44px;
      }

      .modal-card {
        width: 95%;
        max-width: 100%;
        border-radius: 12px;
      }

      .btn-cancel,
      .btn-confirm-reject {
        min-height: 44px;
      }
    }
  `],
})
export class RewardManagerComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly rewardService = inject(RewardService);

  readonly rewards = signal<Reward[]>([]);
  readonly pendingRedemptions = signal<Redemption[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly showForm = signal(false);
  readonly editingReward = signal<Reward | null>(null);
  readonly actionLoading = signal(false);
  readonly successMessage = signal<string | null>(null);

  readonly formTitle = signal('');
  readonly formDescription = signal('');
  readonly formCost = signal<number>(50);
  readonly formError = signal<string | null>(null);

  readonly rejectingRedemption = signal<Redemption | null>(null);
  readonly rejectionNote = signal('');

  private toastTimeout: any = null;

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const householdId = this.authService.currentHouseholdId();
    if (!householdId) {
      this.loading.set(false);
      this.error.set('No household found.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      rewards: this.rewardService.list(householdId),
      redemptions: this.rewardService.listRedemptions(householdId),
    }).subscribe({
      next: (res) => {
        this.rewards.set(res.rewards || []);
        this.pendingRedemptions.set(res.redemptions || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load rewards hub data.');
      },
    });
  }

  getCost(reward: Reward): number {
    return reward.cost_points ?? reward.cost ?? 0;
  }

  openCreateForm(): void {
    this.editingReward.set(null);
    this.formTitle.set('');
    this.formDescription.set('');
    this.formCost.set(50);
    this.formError.set(null);
    this.showForm.set(true);
  }

  openEditForm(reward: Reward): void {
    this.editingReward.set(reward);
    this.formTitle.set(reward.title || '');
    this.formDescription.set(reward.description || '');
    this.formCost.set(this.getCost(reward) || 50);
    this.formError.set(null);
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingReward.set(null);
    this.formError.set(null);
  }

  onSaveForm(): void {
    const title = this.formTitle().trim();
    if (!title) {
      this.formError.set('Title is required.');
      return;
    }

    const cost = Number(this.formCost());
    if (isNaN(cost) || cost < 1) {
      this.formError.set('Cost must be at least 1 point.');
      return;
    }

    const householdId = this.authService.currentHouseholdId();
    if (!householdId) return;

    this.actionLoading.set(true);
    this.formError.set(null);

    const payload: Partial<Reward> = {
      title,
      description: this.formDescription().trim() || null,
      cost_points: cost,
    };

    const editTarget = this.editingReward();
    if (editTarget) {
      this.rewardService.update(editTarget.id, payload).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeForm();
          this.loadData();
          this.showToast('Reward updated!');
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.formError.set(err?.error?.error || 'Failed to update reward.');
        },
      });
    } else {
      this.rewardService.create(householdId, payload).subscribe({
        next: () => {
          this.actionLoading.set(false);
          this.closeForm();
          this.loadData();
          this.showToast('Reward created!');
        },
        error: (err) => {
          this.actionLoading.set(false);
          this.formError.set(err?.error?.error || 'Failed to create reward.');
        },
      });
    }
  }

  onDelete(reward: Reward): void {
    if (!confirm(`Are you sure you want to delete "${reward.title}"?`)) {
      return;
    }

    this.rewardService.remove(reward.id).subscribe({
      next: () => {
        this.rewards.update((list) => list.filter((r) => r.id !== reward.id));
        this.showToast('Reward removed.');
      },
      error: () => {
        this.showToast('Failed to remove reward.');
      },
    });
  }

  onApprove(item: Redemption): void {
    this.actionLoading.set(true);
    this.rewardService.approveRedemption(item.id).subscribe({
      next: () => {
        this.pendingRedemptions.update((list) => list.filter((r) => r.id !== item.id));
        this.actionLoading.set(false);
        this.showToast('Redemption approved — points deducted!');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showToast(err?.error?.error || 'Failed to approve redemption.');
      },
    });
  }

  openRejectModal(item: Redemption): void {
    this.rejectingRedemption.set(item);
    this.rejectionNote.set('');
  }

  closeRejectModal(): void {
    this.rejectingRedemption.set(null);
    this.rejectionNote.set('');
  }

  onConfirmReject(): void {
    const item = this.rejectingRedemption();
    if (!item) return;

    this.actionLoading.set(true);
    this.rewardService.rejectRedemption(item.id, this.rejectionNote()).subscribe({
      next: () => {
        this.pendingRedemptions.update((list) => list.filter((r) => r.id !== item.id));
        this.actionLoading.set(false);
        this.closeRejectModal();
        this.showToast('Redemption rejected.');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showToast(err?.error?.error || 'Failed to reject redemption.');
      },
    });
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

  showToast(message: string): void {
    this.successMessage.set(message);
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.successMessage.set(null);
    }, 3000);
  }
}
