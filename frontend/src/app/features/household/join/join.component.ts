import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HouseholdService } from '../../../core/services/household.service';

/**
 * Component enabling family members to join an existing household.
 *
 * Collects an 8-character invite code, formats it to uppercase, invokes
 * HouseholdService.join(), and routes to /dashboard on success.
 */
@Component({
  selector: 'app-household-join',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="card">
        <!-- Home / Key Icon -->
        <div class="icon-wrapper">
          <svg class="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>

        <header class="card-header">
          <h1 class="heading">Join a Household</h1>
          <p class="subtext">Enter the 8-character invite code provided by your family</p>
        </header>

        <form (ngSubmit)="onSubmit()" class="form">
          <div class="field-group">
            <label for="inviteCode" class="label">Invite code</label>
            <input
              id="inviteCode"
              type="text"
              name="inviteCode"
              class="input uppercase-input"
              required
              maxlength="8"
              placeholder="e.g. 7A8B9C0D"
              [value]="inviteCode()"
              (input)="onInviteCodeInput($event)"
            />
          </div>

          @if (error()) {
            <div class="error-box" role="alert">
              {{ error() }}
            </div>
          }

          <button
            type="submit"
            class="btn-primary"
            [disabled]="loading() || !inviteCode().trim()"
          >
            @if (loading()) {
              <span class="spinner"></span>
              <span>Joining...</span>
            } @else {
              <span>Join Household</span>
            }
          </button>
        </form>

        <footer class="card-footer">
          <p>
            Need to set up a new household?
            <a routerLink="/households/create" class="link">Create a household instead</a>
          </p>
        </footer>
      </div>
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

    .page-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      box-sizing: border-box;
    }

    .card {
      width: 100%;
      max-width: 480px;
      background-color: #FFFFFF;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      box-sizing: border-box;
      text-align: center;
    }

    .icon-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }

    .home-icon {
      width: 48px;
      height: 48px;
      color: #0F766E;
    }

    .card-header {
      margin-bottom: 28px;
    }

    .heading {
      font-size: 28px;
      font-weight: 700;
      color: #111827;
      margin: 0 0 8px 0;
      text-align: center;
      letter-spacing: -0.02em;
    }

    .subtext {
      font-size: 14px;
      color: #6B7280;
      margin: 0;
      text-align: center;
    }

    .form {
      display: flex;
      flex-direction: column;
      gap: 20px;
      text-align: left;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .input {
      width: 100%;
      box-sizing: border-box;
      padding: 12px 14px;
      font-size: 15px;
      font-family: inherit;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      background-color: #FFFFFF;
    }

    .uppercase-input {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      font-weight: 600;
    }

    .input:focus {
      border-color: #0F766E;
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.15);
    }

    .error-box {
      background-color: #FEF2F2;
      border-left: 3px solid #DC2626;
      color: #991B1B;
      padding: 12px;
      border-radius: 6px;
      font-size: 14px;
      text-align: left;
    }

    .btn-primary {
      width: 100%;
      padding: 14px;
      background-color: #0F766E;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: background-color 0.15s ease, opacity 0.15s ease;
      box-sizing: border-box;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #115E59;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: #FFFFFF;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .card-footer {
      margin-top: 24px;
      font-size: 14px;
      color: #6B7280;
    }

    .link {
      color: #0F766E;
      font-weight: 600;
      text-decoration: none;
    }

    .link:hover {
      text-decoration: underline;
    }
  `]
})
export class JoinComponent {
  private readonly householdService = inject(HouseholdService);
  private readonly router = inject(Router);

  readonly inviteCode = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  onInviteCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const uppercased = input.value.toUpperCase();
    input.value = uppercased;
    this.inviteCode.set(uppercased);
  }

  onSubmit(): void {
    const code = this.inviteCode().trim().toUpperCase();
    if (!code || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.householdService.join(code).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message = err.error?.error || 'Failed to join household. Please check the invite code.';
        this.error.set(message);
      },
    });
  }
}
