import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin } from 'rxjs';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

/** Weekly analytics API response row */
interface WeeklyResponseItem {
  day: string;
  completions: number;
  points_awarded: number;
}

/** Chores analytics API response row */
interface ChoreResponseItem {
  chore_id: number;
  title: string;
  completion_count: number;
  approved_count: number;
}

/** Members analytics API response row */
interface MemberResponseItem {
  user_id: number;
  display_name: string;
  role_in_household: string;
  points_earned: number;
  chores_completed: number;
}

/**
 * Analytics page component for Maple.
 * Displays three Chart.js charts: 7-day chore completion activity,
 * top completed chores, and member points breakdown.
 */
@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <div class="analytics-page">
      <div class="analytics-container">
        <!-- Header -->
        <header class="analytics-header">
          <h1 class="page-title">Analytics</h1>
          <p class="page-subtitle">Family productivity insights</p>
        </header>

        <!-- Loading State -->
        @if (loading()) {
          <div class="loading-state">
            <div class="spinner"></div>
            <p>Loading analytics data...</p>
          </div>
        }

        <!-- Error State -->
        @else if (error(); as errMessage) {
          <div class="error-container">
            <span class="error-icon" aria-hidden="true">⚠️</span>
            <h3 class="error-title">Unable to Load Analytics</h3>
            <p class="error-message">{{ errMessage }}</p>
            <button type="button" class="btn-retry" (click)="loadAnalytics()">
              Retry
            </button>
          </div>
        }

        <!-- Empty State -->
        @else if (isAllEmpty()) {
          <div class="empty-state">
            <span class="empty-icon" aria-hidden="true">📊</span>
            <h3 class="empty-title">No activity yet</h3>
            <p class="empty-subtitle">No activity yet — complete some chores to see analytics!</p>
          </div>
        }

        <!-- Charts Dashboard -->
        @else {
          <div class="charts-grid">
            <!-- Chart 1 — Weekly Activity (Full width) -->
            <section class="chart-card full-width">
              <header class="card-header">
                <h2 class="card-title">Chore Activity — Last 7 Days</h2>
              </header>
              <div class="chart-canvas-wrapper">
                <canvas
                  baseChart
                  [data]="weeklyChartData()"
                  [options]="weeklyChartOptions"
                  [type]="'bar'"
                ></canvas>
              </div>
            </section>

            <!-- Two-column Row Below -->
            <div class="charts-two-col">
              <!-- Chart 2 — Top Chores (Horizontal Bar) -->
              <section class="chart-card">
                <header class="card-header">
                  <h2 class="card-title">Top Completed Chores</h2>
                </header>
                <div class="chart-canvas-wrapper">
                  <canvas
                    baseChart
                    [data]="topChoresChartData()"
                    [options]="topChoresChartOptions"
                    [type]="'bar'"
                  ></canvas>
                </div>
              </section>

              <!-- Chart 3 — Member Points (Doughnut) -->
              <section class="chart-card">
                <header class="card-header">
                  <h2 class="card-title">Points by Member</h2>
                </header>
                <div class="chart-canvas-wrapper">
                  <canvas
                    baseChart
                    [data]="memberPointsChartData()"
                    [options]="memberPointsChartOptions"
                    [type]="'doughnut'"
                  ></canvas>
                </div>
              </section>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .analytics-page {
      background-color: #F9FAFB;
      min-height: 100vh;
      padding: 32px 16px;
      font-family: inherit;
      color: #111827;
      box-sizing: border-box;
    }

    .analytics-container {
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Header */
    .analytics-header {
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

    /* Charts Layout */
    .charts-grid {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .charts-two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    .chart-card {
      background-color: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.03);
      box-sizing: border-box;
    }

    .card-header {
      margin-bottom: 20px;
    }

    .card-title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
      margin: 0;
    }

    /* Canvas Wrapper */
    .chart-canvas-wrapper {
      height: 300px;
      position: relative;
      width: 100%;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 24px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      color: #6B7280;
      font-size: 15px;
    }

    .spinner {
      width: 36px;
      height: 36px;
      border: 3px solid #E5E7EB;
      border-top-color: #0F766E;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    /* Error State */
    .error-container {
      background-color: #FEF2F2;
      border: 1px solid #FCA5A5;
      border-left: 4px solid #DC2626;
      border-radius: 16px;
      padding: 40px 24px;
      text-align: center;
      margin: 20px 0;
    }

    .error-icon {
      font-size: 36px;
      display: block;
      margin-bottom: 12px;
    }

    .error-title {
      font-size: 18px;
      font-weight: 700;
      color: #991B1B;
      margin: 0 0 6px 0;
    }

    .error-message {
      font-size: 14px;
      color: #B91C1C;
      margin: 0 0 18px 0;
    }

    .btn-retry {
      background-color: #0F766E;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      padding: 9px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }

    .btn-retry:hover {
      background-color: #115E59;
    }

    /* Empty State */
    .empty-state {
      background-color: #FFFFFF;
      border: 1px dashed #D1D5DB;
      border-radius: 16px;
      padding: 64px 24px;
      text-align: center;
      margin-top: 12px;
    }

    .empty-icon {
      font-size: 48px;
      display: block;
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

    /* Responsive */
    @media (max-width: 768px) {
      .analytics-page {
        padding: 20px 12px;
      }

      .charts-two-col {
        grid-template-columns: 1fr;
      }

      .chart-card {
        padding: 16px;
      }

      .chart-canvas-wrapper {
        height: 260px;
      }
    }
  `],
})
export class AnalyticsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly apiService = inject(ApiService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly weeklyData = signal<Array<{ day: string; chores: number; points: number }>>([]);
  readonly choreData = signal<Array<{ title: string; completions: number }>>([]);
  readonly memberData = signal<Array<{ name: string; points: number }>>([]);

  /**
   * Computed boolean checking whether all data returned by analytics is empty or 0.
   */
  readonly isAllEmpty = computed(() => {
    const weeklyCount = this.weeklyData().reduce((sum, w) => sum + w.chores, 0);
    const choresCount = this.choreData().reduce((sum, c) => sum + c.completions, 0);
    const memberPoints = this.memberData().reduce((sum, m) => sum + m.points, 0);
    return (
      this.weeklyData().length === 0 ||
      (weeklyCount === 0 && choresCount === 0 && memberPoints === 0)
    );
  });

  /* -------------------------------------------------------------
   * Chart 1 — Weekly Activity (Bar chart, Teal #0F766E)
   * ------------------------------------------------------------- */
  readonly weeklyChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.parsed.y} chores completed`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: '#6B7280',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: '#6B7280',
        },
        grid: {
          color: '#F3F4F6',
        },
      },
    },
  };

  readonly weeklyChartData = computed<ChartData<'bar'>>(() => {
    const data = this.weeklyData();
    return {
      labels: data.map((d) => d.day),
      datasets: [
        {
          data: data.map((d) => d.chores),
          backgroundColor: '#0F766E',
          hoverBackgroundColor: '#115E59',
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    };
  });

  /* -------------------------------------------------------------
   * Chart 2 — Top Chores (Horizontal Bar chart, Amber #F59E0B)
   * ------------------------------------------------------------- */
  readonly topChoresChartOptions: ChartConfiguration<'bar'>['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.parsed.x} completions`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: '#6B7280',
        },
        grid: {
          color: '#F3F4F6',
        },
      },
      y: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: '#111827',
        },
      },
    },
  };

  readonly topChoresChartData = computed<ChartData<'bar'>>(() => {
    const top5 = this.choreData().slice(0, 5);
    return {
      labels: top5.map((c) => c.title),
      datasets: [
        {
          data: top5.map((c) => c.completions),
          backgroundColor: '#F59E0B',
          hoverBackgroundColor: '#D97706',
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    };
  });

  /* -------------------------------------------------------------
   * Chart 3 — Member Points (Doughnut chart, Multicolor)
   * ------------------------------------------------------------- */
  readonly memberPointsChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          font: {
            family: 'Inter, sans-serif',
            size: 12,
          },
          color: '#111827',
          boxWidth: 14,
          padding: 16,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => ` ${context.label}: ${context.raw} points`,
        },
      },
    },
    cutout: '65%',
  };

  readonly memberPointsChartData = computed<ChartData<'doughnut'>>(() => {
    const members = this.memberData();
    const palette = ['#0F766E', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];
    return {
      labels: members.map((m) => m.name),
      datasets: [
        {
          data: members.map((m) => m.points),
          backgroundColor: palette.slice(0, members.length),
          borderWidth: 2,
          borderColor: '#FFFFFF',
        },
      ],
    };
  });

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    const householdId = this.authService.currentHouseholdId();
    if (!householdId) {
      this.loading.set(false);
      this.error.set('No household found. Please create or join a household.');
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      weekly: this.apiService.get<{ weekly: WeeklyResponseItem[] }>(
        `/households/${householdId}/analytics/weekly`
      ),
      chores: this.apiService.get<{ chores: ChoreResponseItem[] }>(
        `/households/${householdId}/analytics/chores`
      ),
      members: this.apiService.get<{ members: MemberResponseItem[] }>(
        `/households/${householdId}/analytics/members`
      ),
    }).subscribe({
      next: ({ weekly, chores, members }) => {
        // Build 7 calendar days up to today
        const rawWeekly = weekly?.weekly || [];
        const trailing7Days: Array<{ day: string; chores: number; points: number }> = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(d.getDate() - i);
          const dateStr = d.toISOString().split('T')[0];
          const displayLabel = d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'numeric',
            day: 'numeric',
          });
          const match = rawWeekly.find((w) => w.day === dateStr);
          trailing7Days.push({
            day: displayLabel,
            chores: match ? Number(match.completions) : 0,
            points: match ? Number(match.points_awarded) : 0,
          });
        }
        this.weeklyData.set(trailing7Days);

        // Process chore completion rankings
        const rawChores = (chores?.chores || []).map((c) => ({
          title: c.title,
          completions: Number(c.completion_count) || 0,
        }));
        this.choreData.set(rawChores);

        // Process member points
        const rawMembers = (members?.members || []).map((m) => ({
          name: m.display_name,
          points: Number(m.points_earned) || 0,
        }));
        this.memberData.set(rawMembers);

        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.error?.error || 'Failed to load analytics data.');
      },
    });
  }
}
