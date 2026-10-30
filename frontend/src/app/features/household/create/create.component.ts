import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { HouseholdService } from '../../../core/services/household.service';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Component enabling parents to create a new household.
 *
 * Captures household name, invokes HouseholdService.create(), and displays
 * the generated unique invite code for sharing with family members.
 */
@Component({
  selector: 'app-household-create',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="page-container">
      <div class="card">
        <!-- Home Icon -->
        <div class="icon-wrapper">
          <svg class="home-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>

        <header class="card-header">
          <h1 class="heading">Create a Household</h1>
          <p class="subtext">Start organizing chores and rewards for your family</p>
        </header>

        @if (createdInviteCode(); as code) {
          <!-- Success State with Invite Code -->
          <div class="success-section">
            <div class="success-badge">
              <svg class="check-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
              <span>Household created successfully!</span>
            </div>

            <p class="invite-instruction">
              Share this invite code with your family members so they can join:
            </p>

            <div class="invite-box">
              <span class="invite-code">{{ code }}</span>
            </div>

            <button type="button" class="btn-copy" (click)="copyInviteCode(code)">
              @if (copied()) {
                <span>✓ Copied to clipboard!</span>
              } @else {
                <svg class="copy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Copy Invite Code</span>
              }
            </button>

            <button type="button" class="btn-primary" (click)="goToDashboard()">
              Continue to Dashboard
            </button>
          </div>
        } @else {
          <!-- Create Form -->
          <form (ngSubmit)="onSubmit()" class="form">
            <div class="field-group">
              <label for="name" class="label">Household name</label>
              <input
                id="name"
                type="text"
                name="name"
                class="input"
                required
                placeholder="e.g. The Miller Family"
                [ngModel]="name()"
                (ngModelChange)="name.set($event)"
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
              [disabled]="loading() || !name().trim()"
            >
              @if (loading()) {
                <span class="spinner"></span>
                <span>Creating...</span>
              } @else {
                <span>Create Household</span>
              }
            </button>
          </form>

          <footer class="card-footer">
            <p>
              Already have an invite code?
              <a routerLink="/households/join" class="link">Join a household instead</a>
            </p>
          </footer>
        }
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

    .success-section {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }

    .success-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background-color: #ECFDF5;
      color: #065F46;
      padding: 6px 12px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
    }

    .check-icon {
      width: 18px;
      height: 18px;
    }

    .invite-instruction {
      font-size: 14px;
      color: #4B5563;
      margin: 0;
      line-height: 1.5;
    }

    .invite-box {
      background-color: #F0FDFA;
      border: 1px dashed #0F766E;
      border-radius: 8px;
      padding: 16px;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
    }

    .invite-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 26px;
      font-weight: 700;
      color: #0F766E;
      letter-spacing: 2px;
    }

    .btn-copy {
      background: none;
      border: 1px solid #0F766E;
      color: #0F766E;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .btn-copy:hover {
      background-color: #F0FDFA;
    }

    .copy-icon {
      width: 16px;
      height: 16px;
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
export class CreateComponent {
  private readonly householdService = inject(HouseholdService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly name = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly createdInviteCode = signal<string | null>(null);
  readonly copied = signal(false);

  onSubmit(): void {
    const householdName = this.name().trim();
    if (!householdName || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.householdService.create(householdName).subscribe({
      next: (household) => {
        this.loading.set(false);
        this.createdInviteCode.set(household.invite_code || null);
        this.authService.setCurrentHouseholdId(household.id);
        this.authService.setCurrentHouseholdRole('parent');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message = err.error?.error || 'Failed to create household. Please try again.';
        this.error.set(message);
      },
    });
  }

  copyInviteCode(code: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(() => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2500);
      });
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
