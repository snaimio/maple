import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { AssignmentService } from '../../core/services/assignment.service';
import { RewardService } from '../../core/services/reward.service';
import { HouseholdService } from '../../core/services/household.service';
import { CompletionService } from '../../core/services/completion.service';
import { Assignment, Reward } from '../../core/models';

/**
 * Child Dashboard component for kids to track their chores,
 * submit chore completions, monitor point balances, and preview rewards.
 */
@Component({
  selector: 'app-child-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="child-dashboard-page">
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
        <h1 class="greeting-title">Hey, {{ firstName }}!</h1>
        <p class="greeting-subtitle">Here are your chores for today</p>
      </header>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-container">
          <div class="skeleton-hero"></div>
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
        </div>
      } @else if (error(); as errMessage) {
        <!-- Error State -->
        <div class="error-box">
          <div class="error-header">
            <span class="error-icon">⚠️</span>
            <span class="error-title">Unable to load dashboard</span>
          </div>
          <p class="error-text">{{ errMessage }}</p>
          <button type="button" class="btn-retry" (click)="loadDashboardData()">
            Retry
          </button>
        </div>
      } @else {
        <!-- Points Hero Card -->
        <div class="points-hero-card">
          <div class="points-info">
            <span class="points-label">Your Points</span>
            <div class="points-number-row">
              <span class="points-number">{{ myPoints() }}</span>
              <span class="points-unit">pts</span>
            </div>
          </div>

          <div class="streak-badge">
            <span class="flame-icon">🔥</span>
            <span class="streak-text">5 day streak</span>
          </div>
        </div>

        <!-- Almost There Goal Card -->
        @if (almostThereReward(); as goal) {
          <div class="goal-card">
            <div class="goal-icon-circle">
              <span class="goal-emoji">🎯</span>
            </div>
            <div class="goal-content">
              @if (goal.type === 'within_reach') {
                <h3 class="goal-title">Almost there!</h3>
                <p class="goal-subtitle">
                  Just <strong>{{ goal.diff }} more points</strong> for <strong>{{ goal.title }}</strong>!
                </p>
              } @else {
                <h3 class="goal-title">Keep going!</h3>
                <p class="goal-subtitle">
                  Next reward: <strong>{{ goal.title }}</strong>
                </p>
              }
            </div>
          </div>
        }

        <!-- Chores Section -->
        <section class="section-container">
          <div class="section-header">
            <h2 class="section-title">Your Chores</h2>
            <span class="chores-count-badge">{{ activeChoresCount() }} active</span>
          </div>

          <div class="chores-list">
            @for (item of myAssignments(); track item.id) {
              <div class="chore-item-card" [class.is-rejected]="item.status === 'rejected'">
                <!-- Left: Title, Description, Points -->
                <div class="chore-info-col">
                  <div class="chore-title-row">
                    <h3 class="chore-title">{{ item.chore_title }}</h3>
                    <span class="points-pill">+{{ item.points || item.chore_points }} pts</span>
                  </div>

                  @if (item.chore_description || item.description) {
                    <p class="chore-desc">
                      {{ item.chore_description || item.description }}
                    </p>
                  }

                  @if (item.status === 'rejected') {
                    <div class="rejection-feedback">
                      <span class="feedback-icon">⚠️</span>
                      <span>
                        Parent said: {{ item.rejection_note || 'Needs another pass before approval.' }}
                      </span>
                    </div>
                  }

                  @if (item.due_date) {
                    <span class="due-info">Due {{ formatDueDate(item.due_date) }}</span>
                  }
                </div>

                <!-- Right: Status & Action -->
                <div class="chore-action-col">
                  <span class="status-badge" [class]="'status-' + item.status">
                    {{ getStatusLabel(item.status) }}
                  </span>

                  @if (canSubmit(item.status)) {
                    <button
                      type="button"
                      class="btn-mark-complete"
                      (click)="openSubmitModal(item)"
                    >
                      Mark Complete
                    </button>
                  }
                </div>
              </div>
            } @empty {
              <div class="empty-chores-card">
                <span class="empty-emoji">🎉</span>
                <h3 class="empty-title">All done!</h3>
                <p class="empty-subtitle">🎉 All done! No chores assigned right now.</p>
              </div>
            }
          </div>
        </section>

        <!-- Reward Store Preview -->
        <section class="section-container">
          <div class="section-header">
            <h2 class="section-title">Reward Store</h2>
            <span class="store-subtitle">Redeem your hard-earned points</span>
          </div>

          <div class="rewards-grid">
            @for (reward of topRewards(); track reward.id) {
              <div class="reward-card">
                <div class="reward-card-top">
                  <h3 class="reward-title">{{ reward.title }}</h3>
                  <span class="reward-cost">{{ getCost(reward) }} pts</span>
                </div>

                @if (reward.description) {
                  <p class="reward-desc">{{ reward.description }}</p>
                }

                <div class="reward-card-bottom">
                  <button
                    type="button"
                    class="btn-redeem"
                    [disabled]="myPoints() < getCost(reward)"
                    (click)="onRedeemClick(reward)"
                  >
                    @if (myPoints() >= getCost(reward)) {
                      <span>Redeem</span>
                    } @else {
                      <span>Need {{ getCost(reward) - myPoints() }} more pts</span>
                    }
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-rewards-card">
                <p>No rewards available yet. Ask a parent to add some!</p>
              </div>
            }
          </div>
        </section>
      }

      <!-- Submit Completion Modal -->
      @if (submittingItem(); as itemToSubmit) {
        <div class="modal-backdrop" (click)="closeSubmitModal()">
          <div
            class="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="submit-modal-title"
            (click)="$event.stopPropagation()"
          >
            <div class="modal-header">
              <h3 id="submit-modal-title" class="modal-title">Complete Chore</h3>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close dialog"
                (click)="closeSubmitModal()"
              >
                ✕
              </button>
            </div>

            <div class="modal-body">
              <p class="modal-lead">
                Did you finish <strong>{{ itemToSubmit.chore_title }}</strong>?
              </p>

              @if (submitModalError(); as modalErr) {
                <div class="modal-error-banner">
                  <span>{{ modalErr }}</span>
                </div>
              }

              <div class="form-group">
                <label for="submit-note-input" class="form-label">
                  Note for parents (optional)
                </label>
                <textarea
                  id="submit-note-input"
                  rows="3"
                  class="form-textarea"
                  placeholder="I did it! Here's what I did..."
                  [value]="submitNote()"
                  (input)="submitNote.set($any($event.target).value)"
                ></textarea>
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn-cancel"
                [disabled]="actionLoading()"
                (click)="closeSubmitModal()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-confirm-submit"
                [disabled]="actionLoading()"
                (click)="onConfirmSubmit()"
              >
                @if (actionLoading()) {
                  <span>Submitting...</span>
                } @else {
                  <span>Submit for Approval</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .child-dashboard-page {
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
      z-index: 60;
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
    .page-header {
      margin-bottom: 24px;
    }

    .greeting-title {
      font-size: 28px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 6px 0;
      letter-spacing: -0.02em;
    }

    .greeting-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    /* Points Hero Card */
    .points-hero-card {
      background: linear-gradient(135deg, #0F766E 0%, #115E59 100%);
      border-radius: 16px;
      padding: 28px;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 10px 15px -3px rgba(15, 118, 110, 0.2), 0 4px 6px -2px rgba(15, 118, 110, 0.05);
      margin-bottom: 20px;
    }

    .points-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .points-label {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.88;
    }

    .points-number-row {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .points-number {
      font-size: 52px;
      font-weight: 800;
      line-height: 1;
      letter-spacing: -0.02em;
    }

    .points-unit {
      font-size: 18px;
      font-weight: 600;
      opacity: 0.85;
    }

    .streak-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: rgba(255, 255, 255, 0.16);
      backdrop-filter: blur(4px);
      padding: 8px 14px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.25);
    }

    .flame-icon {
      font-size: 16px;
    }

    .streak-text {
      font-size: 14px;
      font-weight: 700;
      color: #FFFFFF;
    }

    /* Goal / Almost There Card */
    .goal-card {
      background-color: #FEF3C7;
      border: 1px solid #FDE68A;
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 28px;
    }

    .goal-icon-circle {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background-color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .goal-emoji {
      font-size: 20px;
    }

    .goal-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .goal-title {
      font-size: 15px;
      font-weight: 700;
      color: #92400E;
      margin: 0;
    }

    .goal-subtitle {
      font-size: 14px;
      color: #B45309;
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

    .section-title {
      font-size: 20px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      letter-spacing: -0.01em;
    }

    .chores-count-badge {
      font-size: 12px;
      font-weight: 700;
      background-color: #E5E7EB;
      color: #4B5563;
      padding: 3px 10px;
      border-radius: 9999px;
    }

    .store-subtitle {
      font-size: 13px;
      color: #6B7280;
    }

    /* Chores List */
    .chores-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .chore-item-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 18px 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      transition: border-color 150ms ease;
    }

    .chore-item-card:hover {
      border-color: #D1D5DB;
    }

    .chore-item-card.is-rejected {
      border-color: #FCA5A5;
      background-color: #FFFDFD;
    }

    .chore-info-col {
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
      min-width: 0;
    }

    .chore-title-row {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .chore-title {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.3;
    }

    .points-pill {
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .chore-desc {
      font-size: 13px;
      color: #6B7280;
      margin: 0;
      line-height: 1.4;
    }

    .rejection-feedback {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: #DC2626;
      background-color: #FEF2F2;
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid #FECACA;
      margin-top: 2px;
    }

    .feedback-icon {
      font-size: 13px;
    }

    .due-info {
      font-size: 12px;
      color: #9CA3AF;
    }

    .chore-action-col {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 10px;
      flex-shrink: 0;
    }

    .status-badge {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .status-pending {
      background-color: #F3F4F6;
      color: #4B5563;
    }

    .status-in_progress {
      background-color: #FEF3C7;
      color: #D97706;
    }

    .status-submitted {
      background-color: #DBEAFE;
      color: #1D4ED8;
    }

    .status-approved {
      background-color: #D1FAE5;
      color: #065F46;
    }

    .status-rejected {
      background-color: #FEE2E2;
      color: #991B1B;
    }

    .status-overdue {
      background-color: #FFEDD5;
      color: #C2410C;
    }

    .btn-mark-complete {
      padding: 8px 16px;
      background-color: #0F766E;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background-color 150ms ease;
      white-space: nowrap;
    }

    .btn-mark-complete:hover {
      background-color: #0D655E;
    }

    .empty-chores-card {
      background-color: #FFFFFF;
      border: 1px dashed #D1D5DB;
      border-radius: 12px;
      padding: 48px 24px;
      text-align: center;
    }

    .empty-emoji {
      font-size: 36px;
      margin-bottom: 10px;
      display: inline-block;
    }

    .empty-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 4px 0;
    }

    .empty-subtitle {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
    }

    /* Reward Store Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .reward-card {
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

    .reward-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .reward-title {
      font-size: 15px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.3;
    }

    .reward-cost {
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 12px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    .reward-desc {
      font-size: 13px;
      color: #6B7280;
      margin: 0;
      line-height: 1.4;
      flex: 1;
    }

    .reward-card-bottom {
      padding-top: 10px;
      border-top: 1px solid #F3F4F6;
    }

    .btn-redeem {
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #0F766E;
      background-color: #FFFFFF;
      color: #0F766E;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
    }

    .btn-redeem:hover:not(:disabled) {
      background-color: #F0FDFA;
    }

    .btn-redeem:disabled {
      border-color: #E5E7EB;
      background-color: #F9FAFB;
      color: #9CA3AF;
      cursor: not-allowed;
    }

    .empty-rewards-card {
      grid-column: 1 / -1;
      background-color: #FFFFFF;
      border: 1px dashed #D1D5DB;
      border-radius: 12px;
      padding: 36px 20px;
      text-align: center;
      color: #6B7280;
      font-size: 14px;
    }

    /* Skeleton Loading */
    .skeleton-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .skeleton-hero {
      height: 130px;
      background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 16px;
    }

    .skeleton-card {
      height: 80px;
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
      max-width: 440px;
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
      font-size: 15px;
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

    .btn-confirm-submit {
      padding: 8px 18px;
      background-color: #0F766E;
      color: #FFFFFF;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 150ms ease;
    }

    .btn-confirm-submit:hover:not(:disabled) {
      background-color: #0D655E;
    }

    .btn-confirm-submit:disabled,
    .btn-cancel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 768px) {
      .rewards-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .points-hero-card {
        padding: 24px;
      }

      .points-number {
        font-size: 44px;
      }
    }

    @media (max-width: 480px) {
      .child-dashboard-page {
        padding: 16px;
      }

      .greeting-title {
        font-size: 24px;
      }

      .greeting-subtitle {
        font-size: 13px;
      }

      .points-hero-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
        padding: 18px 16px;
        border-radius: 14px;
      }

      .points-number {
        font-size: 36px;
      }

      .streak-badge {
        padding: 6px 12px;
      }

      .goal-card {
        padding: 14px 16px;
        gap: 12px;
      }

      .chore-item-card {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 14px;
      }

      .chore-action-col {
        width: 100%;
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
        padding-top: 10px;
        border-top: 1px solid #F3F4F6;
      }

      .btn-mark-complete {
        width: 100%;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .rewards-grid {
        grid-template-columns: 1fr;
        gap: 14px;
      }

      .btn-redeem {
        min-height: 44px;
      }

      .modal-card {
        width: 95%;
        max-width: 100%;
      }

      .btn-confirm-submit,
      .btn-cancel {
        min-height: 44px;
      }
    }
  `],
})
export class ChildDashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly assignmentService = inject(AssignmentService);
  private readonly rewardService = inject(RewardService);
  private readonly householdService = inject(HouseholdService);
  private readonly completionService = inject(CompletionService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly myAssignments = signal<Assignment[]>([]);
  readonly rewards = signal<Reward[]>([]);
  readonly myPoints = signal<number>(0);

  readonly submittingItem = signal<Assignment | null>(null);
  readonly submittingId = computed(() => this.submittingItem()?.id ?? null);
  readonly submitNote = signal('');
  readonly submitModalError = signal<string | null>(null);
  readonly actionLoading = signal(false);
  readonly successMessage = signal<string | null>(null);

  private toastTimeout: any = null;

  get firstName(): string {
    const name = this.authService.currentUser()?.display_name || 'there';
    return name.trim().split(/\s+/)[0] || 'there';
  }

  readonly activeChoresCount = computed(() => {
    return this.myAssignments().filter(
      (a) => a.status === 'pending' || a.status === 'in_progress' || a.status === 'rejected'
    ).length;
  });

  readonly topRewards = computed(() => {
    return this.rewards().filter((r) => r.is_active).slice(0, 4);
  });

  readonly almostThereReward = computed(() => {
    const pts = this.myPoints();
    const activeList = this.rewards().filter((r) => r.is_active);
    if (activeList.length === 0) return null;

    // Check if there is a reward within reach (pts < cost <= pts + 20)
    const withinReach = activeList.find((r) => {
      const cost = this.getCost(r);
      return cost > pts && cost <= pts + 20;
    });

    if (withinReach) {
      return {
        type: 'within_reach' as const,
        diff: this.getCost(withinReach) - pts,
        title: withinReach.title,
      };
    }

    // Otherwise, find the next cheapest reward with cost > pts (or lowest cost overall)
    const sorted = [...activeList].sort((a, b) => this.getCost(a) - this.getCost(b));
    const nextReward = sorted.find((r) => this.getCost(r) > pts) || sorted[0];

    return {
      type: 'next' as const,
      diff: 0,
      title: nextReward ? nextReward.title : 'a reward',
    };
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const user = this.authService.currentUser();
    const householdId = this.authService.currentHouseholdId();

    if (!user || !householdId) {
      this.loading.set(false);
      this.error.set('No household or user account found. Please sign in or join a household.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      assignments: this.assignmentService.listByUser(user.id, householdId),
      rewards: this.rewardService.list(householdId),
      members: this.householdService.getMembers(householdId),
    }).subscribe({
      next: (res) => {
        this.myAssignments.set(res.assignments || []);
        this.rewards.set(res.rewards || []);

        const childMember = (res.members || []).find((m) => m.user_id === user.id);
        if (childMember) {
          this.myPoints.set(childMember.points_balance || 0);
        }

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load child dashboard data. Please try again.');
      },
    });
  }

  canSubmit(status: string): boolean {
    return status === 'pending' || status === 'rejected' || status === 'in_progress';
  }

  openSubmitModal(item: Assignment): void {
    this.submittingItem.set(item);
    this.submitNote.set('');
    this.submitModalError.set(null);
  }

  closeSubmitModal(): void {
    this.submittingItem.set(null);
    this.submitNote.set('');
    this.submitModalError.set(null);
  }

  onConfirmSubmit(): void {
    const item = this.submittingItem();
    if (!item) return;

    this.actionLoading.set(true);
    this.submitModalError.set(null);

    this.completionService.submit(item.id, this.submitNote()).subscribe({
      next: () => {
        // Update status locally to 'submitted'
        this.myAssignments.update((list) =>
          list.map((a) => (a.id === item.id ? { ...a, status: 'submitted' as const } : a))
        );
        this.actionLoading.set(false);
        this.closeSubmitModal();
        this.showToast('Chore submitted for approval!');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.submitModalError.set(
          err?.error?.error || 'Failed to submit chore. Please try again.'
        );
      },
    });
  }

  onRedeemClick(reward: Reward): void {
    if (this.myPoints() < this.getCost(reward)) return;
    this.showToast(`Redemptions opening soon for ${reward.title}!`);
  }

  getCost(reward: Reward): number {
    return reward.cost_points ?? reward.cost ?? 0;
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

  formatDueDate(dateStr?: string): string {
    if (!dateStr) return 'No due date';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Not started';
      case 'in_progress':
        return 'In progress';
      case 'submitted':
        return 'Waiting for approval';
      case 'approved':
        return '✅ Approved';
      case 'rejected':
        return '❌ Needs redone';
      case 'overdue':
        return '⚠️ Overdue';
      default:
        return status;
    }
  }
}
