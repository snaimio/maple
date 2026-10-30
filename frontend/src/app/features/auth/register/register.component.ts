import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Register component providing the user registration view for family members.
 *
 * Collects display name, email, and password, validates input criteria, and calls
 * AuthService.register() to create the account. Navigates to /households/create on success.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="split-container">
      <!-- Left Panel: Branding -->
      <section class="brand-panel">
        <div class="brand-content">
          <div class="logo-wrapper">
            <svg class="brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v18m0-18l-4 7m4-7l4 7M4 14l8-4 8 4m-14 4l6-3 6 3" />
            </svg>
            <h1 class="brand-title">Maple</h1>
          </div>
          <p class="brand-tagline">Chores, rewards, and family points — all in one place.</p>
          <div class="brand-badge">
            <span>🍁 Family Coordination</span>
          </div>
        </div>
      </section>

      <!-- Right Panel: Form -->
      <section class="form-panel">
        <div class="form-card">
          <header class="form-header">
            <h2 class="title">Create family account</h2>
            <p class="subtitle">Set up your profile to start organizing your home</p>
          </header>

          <form (ngSubmit)="onSubmit()" class="auth-form" #registerForm="ngForm">
            <div class="field-group">
              <label for="displayName" class="label">Your Name</label>
              <input
                id="displayName"
                type="text"
                name="displayName"
                class="input"
                required
                placeholder="e.g. Alex"
                [ngModel]="displayName()"
                (ngModelChange)="displayName.set($event)"
              />
            </div>

            <div class="field-group">
              <label for="email" class="label">Email address</label>
              <input
                id="email"
                type="email"
                name="email"
                class="input"
                required
                placeholder="name@family.test"
                [ngModel]="email()"
                (ngModelChange)="email.set($event)"
              />
            </div>

            <div class="field-group">
              <label for="password" class="label">Password</label>
              <input
                id="password"
                type="password"
                name="password"
                class="input"
                required
                minlength="8"
                placeholder="At least 8 characters"
                [ngModel]="password()"
                (ngModelChange)="password.set($event)"
              />
            </div>

            @if (error()) {
              <div class="error-box" role="alert">
                {{ error() }}
              </div>
            }

            <button
              type="submit"
              class="btn-submit"
              [disabled]="loading() || isSubmitDisabled()"
            >
              @if (loading()) {
                <span class="spinner"></span>
                <span>Creating account...</span>
              } @else {
                <span>Create Account</span>
              }
            </button>
          </form>

          <footer class="form-footer">
            <p>
              Already have an account?
              <a routerLink="/login" class="link">Log in instead</a>
            </p>
          </footer>
        </div>
      </section>
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

    .split-container {
      display: flex;
      min-height: 100vh;
      width: 100%;
    }

    /* Left Brand Panel */
    .brand-panel {
      flex: 1;
      background-color: #0F766E;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem 2rem;
    }

    .brand-content {
      max-width: 440px;
      text-align: left;
    }

    .logo-wrapper {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
    }

    .brand-icon {
      width: 42px;
      height: 42px;
      color: #F59E0B;
    }

    .brand-title {
      font-size: 2.5rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin: 0;
    }

    .brand-tagline {
      font-size: 1.25rem;
      line-height: 1.6;
      color: #E6FFFA;
      margin-bottom: 2rem;
    }

    .brand-badge {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.15);
      padding: 0.5rem 1rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
      color: #FFFFFF;
    }

    /* Right Form Panel */
    .form-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #FFFFFF;
      padding: 2.5rem 1.5rem;
    }

    .form-card {
      width: 100%;
      max-width: 400px;
    }

    .form-header {
      margin-bottom: 2rem;
    }

    .title {
      font-size: 1.875rem;
      font-weight: 700;
      color: #111827;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      font-size: 0.95rem;
      color: #6B7280;
      margin: 0;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    .label {
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.75rem 0.875rem;
      font-size: 0.95rem;
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
      border: 1px solid #FCA5A5;
      color: #DC2626;
      padding: 0.75rem 1rem;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .btn-submit {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      width: 100%;
      padding: 0.8rem 1.25rem;
      background-color: #0F766E;
      color: #FFFFFF;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s ease, opacity 0.15s ease;
    }

    .btn-submit:hover:not(:disabled) {
      background-color: #115E59;
    }

    .btn-submit:disabled {
      opacity: 0.6;
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

    .form-footer {
      margin-top: 1.75rem;
      text-align: center;
      font-size: 0.875rem;
      color: #6B7280;
    }

    .link {
      color: #0F766E;
      font-weight: 600;
      text-decoration: none;
      transition: color 0.15s ease;
    }

    .link:hover {
      text-decoration: underline;
      color: #115E59;
    }

    @media (max-width: 768px) {
      .split-container {
        flex-direction: column;
      }
      .brand-panel {
        flex: initial;
        padding: 1.5rem 1.25rem;
      }
      .brand-content {
        text-align: center;
        max-width: 100%;
      }
      .logo-wrapper {
        justify-content: center;
        margin-bottom: 0.25rem;
      }
      .brand-title {
        font-size: 1.75rem;
      }
      .brand-tagline,
      .brand-badge {
        display: none;
      }
      .form-panel {
        flex: 1;
        padding: 24px;
        align-items: flex-start;
      }
      .form-card {
        max-width: 400px;
        margin: 0 auto;
      }
      .title {
        font-size: 1.5rem;
      }
      .btn-submit {
        min-height: 44px;
      }
    }

    @media (max-width: 480px) {
      .brand-panel {
        padding: 1rem 1rem;
      }
      .brand-icon {
        width: 30px;
        height: 30px;
      }
      .brand-title {
        font-size: 1.4rem;
      }
      .form-panel {
        padding: 20px 16px;
      }
      .form-card {
        max-width: 100%;
        margin: 0 auto;
      }
      .title {
        font-size: 1.25rem;
      }
      .subtitle {
        font-size: 0.85rem;
      }
      .input {
        min-height: 44px;
        font-size: 16px;
      }
      .btn-submit {
        min-height: 44px;
      }
    }
  `]
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly displayName = signal('');
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  isSubmitDisabled(): boolean {
    return (
      !this.displayName().trim() ||
      !this.email().trim() ||
      this.password().length < 8
    );
  }

  onSubmit(): void {
    if (this.isSubmitDisabled() || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.register(
      this.email().trim(),
      this.password(),
      this.displayName().trim()
    ).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/households/create']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        const message = err.error?.error || 'Registration failed. Please try again.';
        this.error.set(message);
      },
    });
  }
}
