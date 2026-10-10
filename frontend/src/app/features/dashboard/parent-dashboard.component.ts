import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { ChoreService } from '../../core/services/chore.service';
import { AssignmentService } from '../../core/services/assignment.service';
import { LeaderboardService } from '../../core/services/leaderboard.service';
import { Assignment, Chore, LeaderboardEntry, HouseholdMember } from '../../core/models';

interface DailyPointStat {
  day: string;
  points: number;
}

/**
 * Parent Dashboard component for household coordination.
 *
 * Displays overview KPIs, pending chore approval requests, weekly chores,
 * family leaderboard, and a 7-day points activity visualization.
 */
@Component({
  selector: 'app-parent-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="dashboard-page">
      <!-- Header -->
      <header class="dashboard-header">
        <div>
          <h1 class="page-title">Family Dashboard</h1>
          <p class="page-subtitle">
            Welcome back, {{ authService.currentUser()?.display_name || 'Parent' }}
          </p>
        </div>
        <div class="header-actions">
          <a routerLink="/households/create" class="btn-outline">
            + New Household
          </a>
        </div>
      </header>

      <!-- Loading State -->
      @if (loading()) {
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading family dashboard...</p>
        </div>
      } @else if (error(); as errMessage) {
        <!-- Error State -->
        <div class="error-card">
          <div class="error-icon">⚠️</div>
          <div class="error-content">
            <h3>Something went wrong</h3>
            <p>{{ errMessage }}</p>
            <div class="error-actions">
              @if (!authService.currentHouseholdId()) {
                <a routerLink="/households/create" class="btn-primary">Create a Household</a>
                <a routerLink="/households/join" class="btn-secondary">Join Household</a>
              } @else {
                <button type="button" class="btn-primary" (click)="loadDashboardData()">
                  Retry
                </button>
              }
            </div>
          </div>
        </div>
      } @else {
        <!-- Dashboard Content -->
        <div class="dashboard-grid">
          <!-- KPI Cards Row -->
          <section class="kpi-row">
            <!-- Card 1: Chores Completed -->
            <div class="kpi-card">
              <div class="kpi-icon-wrapper teal-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="kpi-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="kpi-info">
                <span class="kpi-label">Chores Completed</span>
                <span class="kpi-value">{{ completedChoresCount() }}</span>
              </div>
            </div>

            <!-- Card 2: Points Earned -->
            <div class="kpi-card">
              <div class="kpi-icon-wrapper amber-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" class="kpi-icon">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
              </div>
              <div class="kpi-info">
                <span class="kpi-label">Points Earned</span>
                <span class="kpi-value">{{ totalPointsEarned() }} pts</span>
              </div>
            </div>

            <!-- Card 3: Family Streak -->
            <div class="kpi-card">
              <div class="kpi-icon-wrapper orange-icon">
                <svg viewBox="0 0 24 24" fill="currentColor" class="kpi-icon">
                  <path d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
              </div>
              <div class="kpi-info">
                <span class="kpi-label">Family Streak</span>
                <span class="kpi-value">5 days</span>
              </div>
            </div>
          </section>

          <!-- Main 2-Column Split -->
          <div class="main-columns">
            <!-- Left Column: Pending Approvals -->
            <div class="column-left">
              <section class="dashboard-card">
                <header class="card-title-row">
                  <h2 class="card-title">Pending Approvals</h2>
                  <span class="badge-count">{{ pendingApprovals().length }}</span>
                </header>

                <div class="approval-list">
                  @for (item of pendingApprovals(); track item.id) {
                    <article class="approval-item">
                      <div class="avatar-circle">
                        {{ getAssigneeInitials(item.assigned_to_name) }}
                      </div>
                      <div class="approval-details">
                        <h4 class="chore-title">{{ item.chore_title }}</h4>
                        <p class="approval-meta">
                          Submitted by <strong>{{ item.assigned_to_name }}</strong> • Due {{ item.due_date }}
                        </p>
                      </div>
                      <div class="approval-points">
                        <span class="badge-points">⭐ {{ item.chore_points }} pts</span>
                      </div>
                    </article>
                  } @empty {
                    <div class="empty-state">
                      <span class="empty-emoji">🎉</span>
                      <p class="empty-text">No pending approvals</p>
                      <span class="empty-subtext">All submitted chores have been reviewed!</span>
                    </div>
                  }
                </div>
              </section>
            </div>

            <!-- Right Column: Chores & Leaderboard -->
            <div class="column-right">
              <!-- Top 5 Chores -->
              <section class="dashboard-card">
                <header class="card-title-row">
                  <h2 class="card-title">This Week's Chores</h2>
                  <a routerLink="/chores" class="card-action-link">View all</a>
                </header>

                <div class="chore-list">
                  @for (chore of topChores(); track chore.id) {
                    <div class="chore-item">
                      <div class="chore-bullet"></div>
                      <div class="chore-info">
                        <span class="chore-name">{{ chore.title }}</span>
                        @if (chore.category) {
                          <span class="chore-category">{{ chore.category }}</span>
                        }
                      </div>
                      <span class="chore-pts">+{{ chore.points }} pts</span>
                    </div>
                  } @empty {
                    <div class="empty-state-compact">
                      <p>No chores listed for this week.</p>
                    </div>
                  }
                </div>
              </section>

              <!-- Top 5 Leaderboard -->
              <section class="dashboard-card">
                <header class="card-title-row">
                  <h2 class="card-title">Leaderboard</h2>
                  <a routerLink="/leaderboard" class="card-action-link">View all</a>
                </header>

                <div class="leaderboard-list">
                  @for (entry of topLeaderboard(); track entry.user_id) {
                    <div class="leaderboard-item">
                      <span class="rank-medal">{{ entry.medal || ('#' + entry.rank) }}</span>
                      <div class="leader-avatar">
                        {{ getAssigneeInitials(entry.display_name) }}
                      </div>
                      <span class="leader-name">{{ entry.display_name }}</span>
                      <span class="leader-points">{{ entry.points_balance }} pts</span>
                    </div>
                  } @empty {
                    <div class="empty-state-compact">
                      <p>No points recorded yet.</p>
                    </div>
                  }
                </div>
              </section>
            </div>
          </div>

          <!-- Bottom: Weekly Points Mini-Chart -->
          <section class="dashboard-card chart-card">
            <header class="card-title-row">
              <div>
                <h2 class="card-title">Weekly Points Activity</h2>
                <p class="chart-subtitle">Points awarded across all chores over the last 7 days</p>
              </div>
            </header>

            <div class="bar-chart-container">
              <div class="chart-bars">
                @for (dayStat of weeklyPointsData; track dayStat.day) {
                  <div class="chart-column">
                    <span class="bar-tooltip">{{ dayStat.points }}</span>
                    <div class="bar-track">
                      <div
                        class="bar-fill"
                        [style.height.%]="(dayStat.points / maxWeeklyPoints) * 100"
                      ></div>
                    </div>
                    <span class="bar-label">{{ dayStat.day }}</span>
                  </div>
                }
              </div>
            </div>
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      font-family: Inter, system-ui, sans-serif;
      background-color: #F9FAFB;
      color: #111827;
    }

    .dashboard-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 32px 24px;
      box-sizing: border-box;
    }

    /* Header */
    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
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
      font-size: 15px;
      color: #6B7280;
      margin: 0;
    }

    .btn-outline {
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      color: #374151;
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      background-color: #FFFFFF;
      transition: all 150ms ease;
    }

    .btn-outline:hover {
      background-color: #F3F4F6;
      border-color: #9CA3AF;
    }

    /* KPI Row */
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }

    .kpi-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .kpi-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .teal-icon {
      background-color: #F0FDFA;
      color: #0F766E;
    }

    .amber-icon {
      background-color: #FEF3C7;
      color: #F59E0B;
    }

    .orange-icon {
      background-color: #FFEDD5;
      color: #EA580C;
    }

    .kpi-icon {
      width: 24px;
      height: 24px;
    }

    .kpi-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .kpi-label {
      font-size: 13px;
      font-weight: 500;
      color: #6B7280;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .kpi-value {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      line-height: 1.2;
    }

    /* Main Columns */
    .main-columns {
      display: grid;
      grid-template-columns: 3fr 2fr;
      gap: 24px;
      margin-bottom: 24px;
    }

    .column-left,
    .column-right {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Dashboard Cards */
    .dashboard-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .card-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
      border-bottom: 1px solid #F3F4F6;
      padding-bottom: 12px;
    }

    .card-title {
      font-size: 17px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    .badge-count {
      background-color: #0F766E;
      color: #FFFFFF;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }

    .card-action-link {
      font-size: 13px;
      font-weight: 600;
      color: #0F766E;
      text-decoration: none;
    }

    .card-action-link:hover {
      text-decoration: underline;
    }

    /* Pending Approvals */
    .approval-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .approval-item {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 12px;
      border-radius: 8px;
      background-color: #F9FAFB;
      border: 1px solid #F3F4F6;
      transition: background-color 150ms ease;
    }

    .approval-item:hover {
      background-color: #F3F4F6;
    }

    .avatar-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #0F766E;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .approval-details {
      flex: 1;
      min-width: 0;
    }

    .chore-title {
      font-size: 15px;
      font-weight: 600;
      color: #111827;
      margin: 0 0 4px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .approval-meta {
      font-size: 13px;
      color: #6B7280;
      margin: 0;
    }

    .badge-points {
      background-color: #FEF3C7;
      color: #92400E;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      white-space: nowrap;
    }

    /* Chores List */
    .chore-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .chore-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
    }

    .chore-item:last-child {
      border-bottom: none;
    }

    .chore-bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #0F766E;
      flex-shrink: 0;
    }

    .chore-info {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      overflow: hidden;
    }

    .chore-name {
      font-size: 14px;
      font-weight: 500;
      color: #1F2937;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chore-category {
      font-size: 11px;
      background-color: #F3F4F6;
      color: #4B5563;
      padding: 2px 6px;
      border-radius: 4px;
      text-transform: capitalize;
    }

    .chore-pts {
      font-size: 13px;
      font-weight: 600;
      color: #0F766E;
      white-space: nowrap;
    }

    /* Leaderboard */
    .leaderboard-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .leaderboard-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #F3F4F6;
    }

    .leaderboard-item:last-child {
      border-bottom: none;
    }

    .rank-medal {
      font-size: 16px;
      font-weight: 700;
      width: 24px;
      text-align: center;
      color: #6B7280;
    }

    .leader-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #10B981;
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .leader-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .leader-points {
      font-size: 14px;
      font-weight: 700;
      color: #0F766E;
    }

    /* Chart */
    .chart-card {
      margin-top: 8px;
    }

    .chart-subtitle {
      font-size: 13px;
      color: #6B7280;
      margin: 4px 0 0 0;
    }

    .bar-chart-container {
      margin-top: 24px;
      padding-top: 10px;
    }

    .chart-bars {
      display: flex;
      align-items: flex-end;
      justify-content: space-around;
      height: 160px;
      gap: 16px;
      border-bottom: 1px solid #E5E7EB;
      padding-bottom: 8px;
    }

    .chart-column {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      height: 100%;
      justify-content: flex-end;
    }

    .bar-tooltip {
      font-size: 11px;
      font-weight: 600;
      color: #0F766E;
      margin-bottom: 6px;
    }

    .bar-track {
      width: 100%;
      max-width: 42px;
      height: 120px;
      background-color: #F3F4F6;
      border-radius: 6px 6px 0 0;
      display: flex;
      align-items: flex-end;
      overflow: hidden;
    }

    .bar-fill {
      width: 100%;
      background: linear-gradient(180deg, #14B8A6 0%, #0F766E 100%);
      border-radius: 6px 6px 0 0;
      transition: height 300ms ease;
    }

    .bar-label {
      font-size: 12px;
      font-weight: 500;
      color: #6B7280;
      margin-top: 8px;
    }

    /* Empty States */
    .empty-state {
      padding: 32px 16px;
      text-align: center;
    }

    .empty-emoji {
      font-size: 32px;
      display: block;
      margin-bottom: 8px;
    }

    .empty-text {
      font-size: 15px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 4px 0;
    }

    .empty-subtext {
      font-size: 13px;
      color: #9CA3AF;
    }

    .empty-state-compact {
      padding: 16px 0;
      text-align: center;
      font-size: 13px;
      color: #9CA3AF;
    }

    /* Loading & Error */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 20px;
      color: #6B7280;
      gap: 16px;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E5E7EB;
      border-top-color: #0F766E;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-card {
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      border-left: 4px solid #DC2626;
      border-radius: 12px;
      padding: 24px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      margin: 20px 0;
    }

    .error-icon {
      font-size: 24px;
    }

    .error-content h3 {
      font-size: 17px;
      font-weight: 700;
      color: #991B1B;
      margin: 0 0 6px 0;
    }

    .error-content p {
      font-size: 14px;
      color: #7F1D1D;
      margin: 0 0 16px 0;
    }

    .error-actions {
      display: flex;
      gap: 12px;
    }

    .btn-primary {
      background-color: #0F766E;
      color: #FFFFFF;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
    }

    .btn-primary:hover {
      background-color: #115E59;
    }

    .btn-secondary {
      background-color: #FFFFFF;
      color: #374151;
      border: 1px solid #D1D5DB;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
    }

    /* Responsive Queries */
    @media (max-width: 900px) {
      .main-columns {
        grid-template-columns: 1fr;
      }

      .kpi-row {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    @media (max-width: 640px) {
      .dashboard-page {
        padding: 20px 16px;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .kpi-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ParentDashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);
  private readonly choreService = inject(ChoreService);
  private readonly assignmentService = inject(AssignmentService);
  private readonly leaderboardService = inject(LeaderboardService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly pendingApprovals = signal<Assignment[]>([]);
  readonly weekChores = signal<Chore[]>([]);
  readonly leaderboard = signal<LeaderboardEntry[]>([]);
  readonly memberStats = signal<any[]>([]);

  readonly weeklyPointsData: DailyPointStat[] = [
    { day: 'Mon', points: 20 },
    { day: 'Tue', points: 35 },
    { day: 'Wed', points: 15 },
    { day: 'Thu', points: 40 },
    { day: 'Fri', points: 25 },
    { day: 'Sat', points: 50 },
    { day: 'Sun', points: 30 },
  ];
  readonly maxWeeklyPoints = 50;

  readonly completedChoresCount = computed(() => {
    const stats = this.memberStats();
    if (stats && stats.length > 0) {
      return stats.reduce((acc, m) => acc + (Number(m.chores_completed) || 0), 0);
    }
    return this.weekChores().filter((c) => (c as any).status === 'approved').length;
  });

  readonly totalPointsEarned = computed(() => {
    return this.leaderboard().reduce((acc, entry) => acc + (entry.points_balance || 0), 0);
  });

  readonly topChores = computed(() => {
    return this.weekChores().slice(0, 5);
  });

  readonly topLeaderboard = computed(() => {
    return this.leaderboard().slice(0, 5);
  });

  ngOnInit(): void {
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    const householdId = this.authService.currentHouseholdId();
    if (!householdId) {
      this.loading.set(false);
      this.error.set('No household found. Please create or join one.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      pendingApprovals: this.assignmentService.listByStatus(householdId, 'submitted'),
      weekChores: this.choreService.list(householdId),
      leaderboard: this.leaderboardService.get(householdId),
      memberStats: this.apiService.get<{ members: any[] }>(`/households/${householdId}/analytics/members`),
    }).subscribe({
      next: (res) => {
        this.pendingApprovals.set(res.pendingApprovals || []);
        this.weekChores.set(res.weekChores || []);
        this.leaderboard.set(res.leaderboard || []);
        this.memberStats.set(res.memberStats?.members || []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Unable to load family dashboard data. Please try again.');
      },
    });
  }

  getAssigneeInitials(name?: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
}
