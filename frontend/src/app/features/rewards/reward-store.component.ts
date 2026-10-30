import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { RewardService } from '../../core/services/reward.service';
import { Reward, HouseholdMember, Redemption } from '../../core/models';

/**
 * Child Reward Store component for children to view available rewards,
 * check their points balance, and request reward redemptions.
 */
@Component({
  selector: 'app-reward-store',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reward-store-page">
      <!-- Success Toast -->
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

      <!-- Header -->
      <header class="store-header">
        <div>
          <h1 class="page-title">Reward Store</h1>
          <p class="page-subtitle">Redeem your hard-earned points for awesome rewards</p>
        </div>
        <div class="points-badge-pill">
          <span class="points-label">Your Balance:</span>
          <span class="points-value">{{ myPoints() }} pts</span>
        </div>
      </header>

      <!-- Loading State -->
      @if (loading()) {
        <div class="skeleton-grid">
          <div class="skeleton-card"></div>
          <div class="skeleton-card"></div>
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
          <button type="button" class="btn-retry" (click)="loadStoreData()">
            Retry
          </button>
        </div>
      } @else {
        <!-- Rewards Grid -->
        <div class="rewards-grid">
          @for (reward of rewards(); track reward.id) {
            <div class="reward-card">
              <div class="card-top">
                <div class="title-row">
                  <h3 class="reward-title">{{ reward.title }}</h3>
                  <span class="cost-pill">{{ getCost(reward) }} pts</span>
                </div>
                @if (reward.description) {
                  <p class="reward-desc">{{ reward.description }}</p>
                }
              </div>

              <div class="card-bottom">
                @if (pendingRewardIds().has(reward.id)) {
                  <button type="button" class="btn-action btn-pending" disabled>
                    ⏳ Pending approval
                  </button>
                } @else if (myPoints() < getCost(reward)) {
                  <button type="button" class="btn-action btn-disabled" disabled>
                    Need {{ getCost(reward) - myPoints() }} more pts
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn-action btn-redeem"
                    (click)="openRedeemModal(reward)"
                  >
                    Redeem
                  </button>
                }
              </div>
            </div>
          } @empty {
            <div class="empty-store-card">
              <span class="empty-emoji">🎁</span>
              <h3 class="empty-title">No rewards available yet</h3>
              <p class="empty-subtitle">Ask a parent to add some rewards to the catalog!</p>
            </div>
          }
        </div>
      }

      <!-- Redeem Confirmation Modal -->
      @if (redeemingItem(); as item) {
        <div class="modal-backdrop" (click)="closeRedeemModal()">
          <div
            class="modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="redeem-dialog-title"
            (click)="$event.stopPropagation()"
          >
            <div class="modal-header">
              <h3 id="redeem-dialog-title" class="modal-title">Confirm Redemption</h3>
              <button
                type="button"
                class="modal-close-btn"
                aria-label="Close dialog"
                (click)="closeRedeemModal()"
              >
                ✕
              </button>
            </div>

            <div class="modal-body">
              <p class="modal-lead">
                Redeem <strong>{{ item.title }}</strong> for <strong>{{ getCost(item) }} pts</strong>?
              </p>
              <p class="modal-sub">
                A parent will be notified to review and fulfill your reward.
              </p>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn-cancel"
                [disabled]="actionLoading()"
                (click)="closeRedeemModal()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-confirm-redeem"
                [disabled]="actionLoading()"
                (click)="confirmRedeem(item)"
              >
                @if (actionLoading()) {
                  <span>Requesting...</span>
                } @else {
                  <span>Confirm Redeem</span>
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .reward-store-page {
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
    .store-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 28px;
      flex-wrap: wrap;
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

    .points-badge-pill {
      background: linear-gradient(135deg, #0F766E, #115E59);
      color: #FFFFFF;
      padding: 10px 18px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 4px rgba(15, 118, 110, 0.2);
    }

    .points-label {
      font-size: 13px;
      opacity: 0.9;
    }

    .points-value {
      font-size: 16px;
      font-weight: 800;
    }

    /* Rewards Grid */
    .rewards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .reward-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: border-color 150ms ease, box-shadow 150ms ease;
    }

    .reward-card:hover {
      border-color: #D1D5DB;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
    }

    .card-top {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .title-row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }

    .reward-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0;
      line-height: 1.3;
    }

    .cost-pill {
      background-color: #FEF3C7;
      color: #B45309;
      font-size: 13px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .reward-desc {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
      line-height: 1.45;
    }

    .card-bottom {
      padding-top: 12px;
      border-top: 1px solid #F3F4F6;
    }

    .btn-action {
      width: 100%;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 150ms ease;
      text-align: center;
    }

    .btn-redeem {
      background-color: #0F766E;
      color: #FFFFFF;
      border: none;
    }

    .btn-redeem:hover {
      background-color: #0D655E;
    }

    .btn-pending {
      background-color: #FEF3C7;
      color: #B45309;
      border: 1px solid #FDE68A;
      cursor: not-allowed;
    }

    .btn-disabled {
      background-color: #F3F4F6;
      color: #9CA3AF;
      border: 1px solid #E5E7EB;
      cursor: not-allowed;
    }

    /* Empty State */
    .empty-store-card {
      grid-column: 1 / -1;
      background-color: #FFFFFF;
      border: 1px dashed #D1D5DB;
      border-radius: 14px;
      padding: 56px 24px;
      text-align: center;
    }

    .empty-emoji {
      font-size: 44px;
      margin-bottom: 12px;
      display: inline-block;
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

    /* Skeleton Loading */
    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
    }

    .skeleton-card {
      height: 180px;
      background: linear-gradient(90deg, #E5E7EB 25%, #F3F4F6 50%, #E5E7EB 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 14px;
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
      gap: 8px;
    }

    .modal-lead {
      font-size: 16px;
      color: #111827;
      margin: 0;
      line-height: 1.4;
    }

    .modal-sub {
      font-size: 13px;
      color: #6B7280;
      margin: 0;
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

    .btn-confirm-redeem {
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

    .btn-confirm-redeem:hover:not(:disabled) {
      background-color: #0D655E;
    }

    .btn-confirm-redeem:disabled,
    .btn-cancel:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    @media (max-width: 900px) {
      .rewards-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (max-width: 640px) {
      .reward-store-page {
        padding: 20px 16px;
      }

      .store-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .rewards-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class RewardStoreComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly rewardService = inject(RewardService);

  readonly rewards = signal<Reward[]>([]);
  readonly myPoints = signal<number>(0);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly redeemingItem = signal<Reward | null>(null);
  readonly actionLoading = signal(false);
  readonly successMessage = signal<string | null>(null);
  readonly pendingRewardIds = signal<Set<number>>(new Set());

  private toastTimeout: any = null;

  ngOnInit(): void {
    this.loadStoreData();
  }

  loadStoreData(): void {
    const user = this.authService.currentUser();
    const householdId = this.authService.currentHouseholdId();

    if (!user || !householdId) {
      this.loading.set(false);
      this.error.set('No household found.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      rewards: this.rewardService.list(householdId),
      membersRes: this.apiService.get<{ members: HouseholdMember[] }>(`/households/${householdId}/members`),
      redemptions: this.rewardService.listRedemptions(householdId),
    }).subscribe({
      next: (res) => {
        this.rewards.set(res.rewards || []);

        const childMember = (res.membersRes.members || []).find((m) => m.user_id === user.id);
        if (childMember) {
          this.myPoints.set(childMember.points_balance || 0);
        }

        const pendingSet = new Set<number>();
        (res.redemptions || []).forEach((r) => {
          if (r.status === 'pending' && (r.user_id === user.id || r.redeemed_by === user.id)) {
            pendingSet.add(r.reward_id);
          }
        });
        this.pendingRewardIds.set(pendingSet);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Failed to load rewards. Please try again.');
      },
    });
  }

  getCost(reward: Reward): number {
    return reward.cost_points ?? reward.cost ?? 0;
  }

  openRedeemModal(reward: Reward): void {
    this.redeemingItem.set(reward);
  }

  closeRedeemModal(): void {
    this.redeemingItem.set(null);
  }

  confirmRedeem(reward: Reward): void {
    this.actionLoading.set(true);
    this.rewardService.redeem(reward.id).subscribe({
      next: () => {
        this.pendingRewardIds.update((set) => {
          const next = new Set(set);
          next.add(reward.id);
          return next;
        });
        this.actionLoading.set(false);
        this.closeRedeemModal();
        this.showToast('Redeem request sent!');
      },
      error: (err) => {
        this.actionLoading.set(false);
        this.showToast(err?.error?.error || 'Failed to redeem reward.');
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
}
