import { Component, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

/**
 * Placeholder dashboard component rendered for authenticated sessions.
 *
 * Displays the current user's display name and a coming-soon notice.
 * Acts as the guarded route placeholder until the full Parent Dashboard is implemented.
 */
@Component({
  selector: 'app-placeholder-dashboard',
  standalone: true,
  template: `
    <main class="dashboard-placeholder">
      <div class="card">
        <h1>Dashboard — coming soon</h1>
        <p class="welcome">
          Welcome, <strong>{{ auth.currentUser()?.display_name || 'Family Member' }}</strong>!
        </p>
        <p class="description">
          Household overview, chores, rewards, and leaderboard features will load here.
        </p>
      </div>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background-color: #F9FAFB;
      font-family: Inter, system-ui, sans-serif;
      padding: 3rem 1.5rem;
    }

    .dashboard-placeholder {
      max-width: 600px;
      margin: 0 auto;
    }

    .card {
      background: #FFFFFF;
      border-radius: 8px;
      padding: 2.5rem;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
      border: 1px solid #E5E7EB;
      text-align: center;
    }

    h1 {
      font-size: 1.75rem;
      color: #0F766E;
      margin-top: 0;
      margin-bottom: 1rem;
    }

    .welcome {
      font-size: 1.125rem;
      color: #1F2937;
      margin-bottom: 0.5rem;
    }

    .description {
      font-size: 0.95rem;
      color: #6B7280;
      margin: 0;
    }
  `]
})
export class PlaceholderDashboardComponent {
  readonly auth = inject(AuthService);
}
