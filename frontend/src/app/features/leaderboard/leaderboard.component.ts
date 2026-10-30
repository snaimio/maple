import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { LeaderboardEntry } from '../../core/models';

/**
 * Weekly analytics response shape returned by GET /api/v1/households/{id}/analytics/weekly
 */
interface WeeklyAnalyticsResponse {
  weekly: Array<{
    day: string;
    completions: number;
    points_awarded: number;
  }>;
}

/**
 * Full-page Family Leaderboard component displaying top-rank podiums,
 * 7-day sparkline performance breakdowns, and full household child rankings.
 */
@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="leaderboard-page">
      <div class="leaderboard-container">
        <!-- Header -->
        <header class="leaderboard-header">
          <div class="header-titles">
            <h1 class="page-title">Family Leaderboard</h1>
            <p class="page-subtitle">Who's earning the most points this week?</p>
          </div>
        </header>

        <!-- Loading State -->
        @if (loading()) {
          <div class="skeleton-list">
            @for (item of [1, 2, 3]; track item) {
              <div class="skeleton-row">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                  <div class="skeleton-line short"></div>
                  <div class="skeleton-line tiny"></div>
                </div>
                <div class="skeleton-sparkline"></div>
                <div class="skeleton-points"></div>
              </div>
            }
          </div>
        }

        <!-- Error State -->
        @else if (error(); as err) {
          <div class="error-container">
            <span class="error-icon" aria-hidden="true">⚠️</span>
            <h3 class="error-title">Unable to Load Leaderboard</h3>
            <p class="error-message">{{ err }}</p>
            <button type="button" class="btn-retry" (click)="loadLeaderboard()">
              Retry
            </button>
          </div>
        }

        <!-- Content -->
        @else {
          <!-- Empty State -->
          @if (entries().length === 0) {
            <div class="empty-state">
              <span class="empty-icon" aria-hidden="true">🏆</span>
              <h3 class="empty-title">No children yet</h3>
              <p class="empty-subtitle">No children yet. Invite family members!</p>
            </div>
          } @else {
            <!-- Podium Section (2+ entries) -->
            @if (entries().length >= 2) {
              <section class="podium-section" [class.two-cards]="entries().length === 2" aria-label="Top Performers Podium">
                <!-- #2 Card (Left) -->
                @if (rank2(); as second) {
                  <div class="podium-card card-silver">
                    <span class="podium-medal" aria-hidden="true">🥈</span>
                    <div class="podium-avatar avatar-silver">
                      @if (second.avatar_url) {
                        <img [src]="second.avatar_url" [alt]="second.display_name" class="avatar-img" />
                      } @else {
                        <span>{{ getInitials(second.display_name) }}</span>
                      }
                    </div>
                    <h3 class="podium-name name-secondary" [title]="second.display_name">{{ second.display_name }}</h3>
                    <span class="podium-points points-secondary">{{ second.points_balance }} pts</span>
                    <div class="podium-delta delta-silver">
                      {{ second.weekly_points >= 0 ? '+' : '' }}{{ second.weekly_points }} this wk
                    </div>
                  </div>
                }

                <!-- #1 Card (Center, Tallest) -->
                @if (rank1(); as first) {
                  <div class="podium-card card-gold">
                    <span class="podium-medal medal-first" aria-hidden="true">🥇</span>
                    <div class="podium-avatar avatar-gold">
                      @if (first.avatar_url) {
                        <img [src]="first.avatar_url" [alt]="first.display_name" class="avatar-img" />
                      } @else {
                        <span>{{ getInitials(first.display_name) }}</span>
                      }
                    </div>
                    <h2 class="podium-name name-first" [title]="first.display_name">{{ first.display_name }}</h2>
                    <span class="podium-points points-first">{{ first.points_balance }} pts</span>
                    <div class="podium-delta delta-gold">
                      {{ first.weekly_points >= 0 ? '+' : '' }}{{ first.weekly_points }} this wk
                    </div>
                  </div>
                }

                <!-- #3 Card (Right) -->
                @if (rank3(); as third) {
                  <div class="podium-card card-bronze">
                    <span class="podium-medal" aria-hidden="true">🥉</span>
                    <div class="podium-avatar avatar-bronze">
                      @if (third.avatar_url) {
                        <img [src]="third.avatar_url" [alt]="third.display_name" class="avatar-img" />
                      } @else {
                        <span>{{ getInitials(third.display_name) }}</span>
                      }
                    </div>
                    <h3 class="podium-name name-secondary" [title]="third.display_name">{{ third.display_name }}</h3>
                    <span class="podium-points points-secondary">{{ third.points_balance }} pts</span>
                    <div class="podium-delta delta-bronze">
                      {{ third.weekly_points >= 0 ? '+' : '' }}{{ third.weekly_points }} this wk
                    </div>
                  </div>
                }
              </section>
            }

            <!-- Full Ranking List -->
            <section class="rankings-section">
              <header class="rankings-header">
                <h2 class="rankings-title">All Rankings</h2>
                <span class="rankings-count">{{ entries().length }} {{ entries().length === 1 ? 'Child' : 'Children' }}</span>
              </header>

              <div class="ranking-list" role="list">
                @for (entry of entries(); track entry.user_id) {
                  <article
                    class="ranking-row"
                    [class.is-current-user]="isCurrentUser(entry.user_id)"
                    role="listitem"
                  >
                    <!-- Rank / Medal -->
                    <div class="row-rank-col">
                      @if (entry.rank <= 3) {
                        <span class="medal-icon" aria-hidden="true">{{ entry.medal || (entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉') }}</span>
                      } @else {
                        <span class="rank-num">#{{ entry.rank }}</span>
                      }
                    </div>

                    <!-- Avatar -->
                    <div class="row-avatar-col">
                      @if (entry.avatar_url) {
                        <img [src]="entry.avatar_url" [alt]="entry.display_name" class="row-avatar-img" />
                      } @else {
                        <div class="row-avatar-fallback">
                          {{ getInitials(entry.display_name) }}
                        </div>
                      }
                    </div>

                    <!-- Name -->
                    <div class="row-info-col">
                      <div class="row-name-row">
                        <span class="row-name">{{ entry.display_name }}</span>
                        @if (isCurrentUser(entry.user_id)) {
                          <span class="you-badge">You</span>
                        }
                      </div>
                    </div>

                    <!-- Sparkline (7 Daily Bars) -->
                    <div class="row-sparkline-col">
                      <div class="sparkline-wrapper" [title]="'7-day point activity for ' + entry.display_name">
                        <div class="sparkline-bars">
                          @for (pts of getUserWeeklyPoints(entry.user_id); track $index) {
                            <div class="sparkline-bar-slot">
                              <div
                                class="sparkline-bar"
                                [style.height.%]="getBarHeightPercent(pts, getUserMaxPoints(entry.user_id))"
                                [style.background-color]="pts > 0 ? '#0F766E' : '#E5E7EB'"
                                [attr.aria-label]="dayLabels[$index] + ': ' + pts + ' pts'"
                              ></div>
                            </div>
                          }
                        </div>
                        <div class="sparkline-labels">
                          @for (lbl of dayLabels; track $index) {
                            <span class="sparkline-day">{{ lbl }}</span>
                          }
                        </div>
                      </div>
                    </div>

                    <!-- Points & Delta -->
                    <div class="row-points-col">
                      <span class="total-points">{{ entry.points_balance }} pts</span>
                      <span
                        class="weekly-delta"
                        [class.delta-positive]="entry.weekly_points >= 0"
                        [class.delta-negative]="entry.weekly_points < 0"
                      >
                        {{ entry.weekly_points >= 0 ? '+' : '' }}{{ entry.weekly_points }} wk
                      </span>
                    </div>
                  </article>
                }
              </div>
            </section>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .leaderboard-page {
      background-color: #F9FAFB;
      min-height: 100vh;
      padding: 32px 16px;
      font-family: inherit;
      color: #111827;
      box-sizing: border-box;
    }

    .leaderboard-container {
      max-width: 960px;
      margin: 0 auto;
    }

    /* Header */
    .leaderboard-header {
      margin-bottom: 28px;
    }

    .page-title {
      font-size: 32px;
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

    /* Podium Section */
    .podium-section {
      display: grid;
      grid-template-columns: 1fr 1.4fr 1fr;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 36px;
    }

    .podium-section.two-cards {
      grid-template-columns: 1fr 1.4fr;
      max-width: 640px;
      margin-left: auto;
      margin-right: auto;
    }

    .podium-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      border-radius: 16px;
      box-sizing: border-box;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .podium-card:hover {
      transform: translateY(-2px);
    }

    /* Gold (#1) */
    .card-gold {
      background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%);
      color: #FFFFFF;
      padding: 28px 16px;
      min-height: 290px;
      box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.35), 0 8px 10px -6px rgba(245, 158, 11, 0.2);
    }

    /* Silver (#2) */
    .card-silver {
      background: linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 100%);
      color: #111827;
      padding: 20px 16px;
      min-height: 220px;
      box-shadow: 0 4px 12px rgba(156, 163, 175, 0.25);
    }

    /* Bronze (#3) */
    .card-bronze {
      background: linear-gradient(135deg, #FCD9B6 0%, #B45309 100%);
      color: #FFFFFF;
      padding: 20px 16px;
      min-height: 220px;
      box-shadow: 0 4px 12px rgba(180, 83, 9, 0.25);
    }

    .podium-medal {
      font-size: 28px;
      line-height: 1;
      margin-bottom: 8px;
    }

    .podium-medal.medal-first {
      font-size: 38px;
      margin-bottom: 10px;
    }

    .podium-avatar {
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-bottom: 12px;
      flex-shrink: 0;
    }

    .avatar-gold {
      width: 72px;
      height: 72px;
      border: 3px solid #FFFFFF;
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
      font-size: 24px;
      font-weight: 800;
    }

    .avatar-silver {
      width: 48px;
      height: 48px;
      border: 2px solid #FFFFFF;
      background: rgba(255, 255, 255, 0.6);
      color: #111827;
      font-size: 16px;
      font-weight: 700;
    }

    .avatar-bronze {
      width: 48px;
      height: 48px;
      border: 2px solid #FFFFFF;
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
      font-size: 16px;
      font-weight: 700;
    }

    .avatar-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .podium-name {
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .name-first {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
    }

    .name-secondary {
      font-size: 16px;
      font-weight: 700;
    }

    .podium-points {
      line-height: 1.1;
      margin-bottom: 10px;
    }

    .points-first {
      font-size: 32px;
      font-weight: 800;
      color: #FFFFFF;
    }

    .points-secondary {
      font-size: 24px;
      font-weight: 800;
    }

    .podium-delta {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 9999px;
      font-weight: 600;
      white-space: nowrap;
    }

    .delta-gold {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
      padding: 4px 12px;
      font-size: 13px;
    }

    .delta-silver {
      background: rgba(17, 24, 39, 0.1);
      color: #111827;
      padding: 3px 10px;
      font-size: 12px;
    }

    .delta-bronze {
      background: rgba(255, 255, 255, 0.25);
      color: #FFFFFF;
      padding: 3px 10px;
      font-size: 12px;
    }

    /* Rankings Section */
    .rankings-section {
      margin-top: 16px;
    }

    .rankings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .rankings-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .rankings-count {
      font-size: 13px;
      color: #6B7280;
      font-weight: 500;
    }

    .ranking-list {
      display: flex;
      flex-direction: column;
    }

    .ranking-row {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
      border: 1px solid #E5E7EB;
      box-sizing: border-box;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }

    .ranking-row:hover {
      border-color: #D1D5DB;
    }

    .ranking-row.is-current-user {
      border-left: 4px solid #0F766E !important;
      background-color: #F0FDFA !important;
    }

    .row-rank-col {
      width: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .medal-icon {
      font-size: 22px;
      line-height: 1;
    }

    .rank-num {
      font-size: 15px;
      font-weight: 700;
      color: #6B7280;
    }

    .row-avatar-col {
      flex-shrink: 0;
    }

    .row-avatar-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
      display: block;
    }

    .row-avatar-fallback {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: #0F766E;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .row-info-col {
      flex: 1;
      min-width: 110px;
    }

    .row-name-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .row-name {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
    }

    .you-badge {
      font-size: 11px;
      font-weight: 700;
      color: #0F766E;
      background-color: #CCFBF1;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    /* Sparkline */
    .row-sparkline-col {
      flex-shrink: 0;
    }

    .sparkline-wrapper {
      display: flex;
      flex-direction: column;
      width: 112px;
      box-sizing: border-box;
    }

    .sparkline-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 28px;
      gap: 4px;
    }

    .sparkline-bar-slot {
      flex: 1;
      display: flex;
      align-items: flex-end;
      height: 100%;
    }

    .sparkline-bar {
      width: 100%;
      max-width: 8px;
      border-radius: 2px 2px 0 0;
      transition: height 0.25s ease;
    }

    .sparkline-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
    }

    .sparkline-day {
      font-size: 9px;
      font-weight: 600;
      color: #9CA3AF;
      text-align: center;
      flex: 1;
    }

    /* Points and Delta */
    .row-points-col {
      min-width: 100px;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      flex-shrink: 0;
    }

    .total-points {
      font-size: 16px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }

    .weekly-delta {
      font-size: 12px;
      font-weight: 600;
      margin-top: 2px;
    }

    .delta-positive {
      color: #10B981;
    }

    .delta-negative {
      color: #DC2626;
    }

    /* Empty State */
    .empty-state {
      background: #FFFFFF;
      border: 1px dashed #D1D5DB;
      border-radius: 16px;
      padding: 48px 24px;
      text-align: center;
      margin-top: 12px;
    }

    .empty-icon {
      font-size: 48px;
      margin-bottom: 12px;
      display: block;
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

    /* Error State */
    .error-container {
      background: #FEF2F2;
      border: 1px solid #FCA5A5;
      border-left: 4px solid #DC2626;
      border-radius: 12px;
      padding: 32px 24px;
      text-align: center;
      margin: 20px 0;
    }

    .error-icon {
      font-size: 32px;
      display: block;
      margin-bottom: 8px;
    }

    .error-title {
      font-size: 17px;
      font-weight: 700;
      color: #991B1B;
      margin: 0 0 6px 0;
    }

    .error-message {
      font-size: 14px;
      color: #B91C1C;
      margin: 0 0 16px 0;
    }

    .btn-retry {
      background-color: #0F766E;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 8px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .btn-retry:hover {
      background-color: #115E59;
    }

    /* Skeleton Loading State */
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 16px;
    }

    .skeleton-row {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #FFFFFF;
      padding: 16px 20px;
      border-radius: 12px;
      border: 1px solid #E5E7EB;
      animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.45;
      }
    }

    .skeleton-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #E5E7EB;
      flex-shrink: 0;
    }

    .skeleton-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-line {
      height: 12px;
      background: #E5E7EB;
      border-radius: 4px;
    }

    .skeleton-line.short {
      width: 140px;
    }

    .skeleton-line.tiny {
      width: 60px;
    }

    .skeleton-sparkline {
      width: 100px;
      height: 24px;
      background: #E5E7EB;
      border-radius: 4px;
      flex-shrink: 0;
    }

    .skeleton-points {
      width: 70px;
      height: 18px;
      background: #E5E7EB;
      border-radius: 4px;
      flex-shrink: 0;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .leaderboard-page {
        padding: 20px 12px;
      }

      .podium-section {
        gap: 8px;
      }

      .card-gold {
        padding: 20px 10px;
        min-height: 240px;
      }

      .avatar-gold {
        width: 56px;
        height: 56px;
        font-size: 18px;
      }

      .points-first {
        font-size: 24px;
      }

      .name-first {
        font-size: 16px;
      }

      .card-silver,
      .card-bronze {
        padding: 16px 8px;
        min-height: 180px;
      }

      .avatar-silver,
      .avatar-bronze {
        width: 40px;
        height: 40px;
        font-size: 14px;
      }

      .points-secondary {
        font-size: 18px;
      }

      .name-secondary {
        font-size: 14px;
      }

      .ranking-row {
        padding: 12px 14px;
        gap: 10px;
      }

      .row-sparkline-col {
        display: none;
      }
    }
  `],
})
export class LeaderboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly leaderboardService = inject(LeaderboardService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly entries = signal<LeaderboardEntry[]>([]);
  readonly weeklyData = signal<Map<number, number[]>>(new Map());

  readonly dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  readonly currentUserId = computed(() => this.authService.currentUser()?.id ?? null);

  readonly rank1 = computed(() => this.entries()[0] || null);
  readonly rank2 = computed(() => this.entries()[1] || null);
  readonly rank3 = computed(() => this.entries()[2] || null);

  ngOnInit(): void {
    this.loadLeaderboard();
  }

  loadLeaderboard(): void {
    const householdId = this.authService.currentHouseholdId();
    if (!householdId) {
      this.loading.set(false);
      this.error.set('No household found. Please create or join a household.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.leaderboardService.get(householdId).subscribe({
      next: (entries) => {
        const sorted = (entries || []).slice().sort((a, b) => b.points_balance - a.points_balance);
        this.entries.set(sorted);
        this.fetchWeeklyData(householdId, sorted);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load family leaderboard.');
      },
    });
  }

  /**
   * Fetches weekly activity to populate the 7-day sparkline.
   * Uses Option B (GET /api/v1/households/{id}/analytics/weekly) since
   * /points-transactions is not registered on the backend router.
   */
  private fetchWeeklyData(householdId: number, entries: LeaderboardEntry[]): void {
    this.apiService
      .get<WeeklyAnalyticsResponse>(`/households/${householdId}/analytics/weekly`)
      .subscribe({
        next: (res) => {
          const weeklyRows = res.weekly || [];
          const weeklyMap = new Map<number, number[]>();

          // Construct trailing 7 days points array from weekly analytics rows
          const last7DaysPoints: number[] = [];
          const now = new Date();
          for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            const match = weeklyRows.find((r) => r.day === dateStr);
            last7DaysPoints.push(match ? Number(match.points_awarded) : 0);
          }

          const totalHouseholdWeekly = last7DaysPoints.reduce((acc, p) => acc + p, 0);

          entries.forEach((entry) => {
            if (entry.weekly_points <= 0) {
              weeklyMap.set(entry.user_id, [0, 0, 0, 0, 0, 0, 0]);
            } else if (totalHouseholdWeekly > 0) {
              const ratio = entry.weekly_points / totalHouseholdWeekly;
              const scaledDays = last7DaysPoints.map((pts) => Math.round(pts * ratio));
              weeklyMap.set(entry.user_id, scaledDays);
            } else {
              // Evenly spread child's weekly points across the 7 days
              const daily = Math.max(1, Math.round(entry.weekly_points / 7));
              const days = [daily, daily, daily, daily, daily, daily, Math.max(0, entry.weekly_points - daily * 6)];
              weeklyMap.set(entry.user_id, days);
            }
          });

          this.weeklyData.set(weeklyMap);
        },
        error: () => {
          // Graceful fallback: construct daily distribution from each user's weekly_points
          const weeklyMap = new Map<number, number[]>();
          entries.forEach((entry) => {
            if (entry.weekly_points > 0) {
              const daily = Math.max(1, Math.round(entry.weekly_points / 7));
              weeklyMap.set(entry.user_id, [
                daily,
                daily,
                daily,
                daily,
                daily,
                daily,
                Math.max(0, entry.weekly_points - daily * 6),
              ]);
            } else {
              weeklyMap.set(entry.user_id, [0, 0, 0, 0, 0, 0, 0]);
            }
          });
          this.weeklyData.set(weeklyMap);
        },
      });
  }

  isCurrentUser(userId: number): boolean {
    return this.currentUserId() === userId;
  }

  getUserWeeklyPoints(userId: number): number[] {
    const data = this.weeklyData().get(userId);
    if (data && data.length === 7) {
      return data;
    }
    return [0, 0, 0, 0, 0, 0, 0];
  }

  getUserMaxPoints(userId: number): number {
    const points = this.getUserWeeklyPoints(userId);
    return Math.max(...points, 1);
  }

  getBarHeightPercent(points: number, max: number): number {
    if (points <= 0) return 6;
    const pct = Math.round((points / max) * 100);
    return Math.min(Math.max(pct, 12), 100);
  }

  getInitials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
