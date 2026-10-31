import { inject, Injectable, signal, computed, Signal } from '@angular/core';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { ApiService } from './api.service';
import { User, Household } from '../models';

export interface AuthResponse {
  user: User;
  household?: Household;
  household_id?: number;
}

/**
 * Authentication service handling user registration, login, logout,
 * session status verification, active household selection, and current user signal state.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private loadInitialUser(): User | null {
    try {
      const stored = localStorage.getItem('maple_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  private readonly _currentUser = signal<User | null>(this.loadInitialUser());

  private loadInitialIsLoggingIn(): boolean {
    try {
      return localStorage.getItem('maple_is_logging_in') === 'true';
    } catch {
      return false;
    }
  }

  private readonly isLoggingInSignal = signal<boolean>(this.loadInitialIsLoggingIn());
  readonly isLoggingIn = this.isLoggingInSignal.asReadonly();

  private readonly _justLoggedIn = signal<boolean>(false);
  readonly justLoggedIn = this._justLoggedIn.asReadonly();

  startLogin(): void {
    this.isLoggingInSignal.set(true);
    try {
      localStorage.setItem('maple_is_logging_in', 'true');
    } catch {
      // ignore
    }
  }

  finishLogin(): void {
    this.isLoggingInSignal.set(false);
    this._justLoggedIn.set(true);
    setTimeout(() => this._justLoggedIn.set(false), 5000);
    try {
      localStorage.removeItem('maple_is_logging_in');
    } catch {
      // ignore
    }
  }

  private loadInitialHouseholdId(): number | null {
    try {
      const stored = localStorage.getItem('maple_household_id');
      return stored ? parseInt(stored, 10) : null;
    } catch {
      return null;
    }
  }

  private loadInitialHouseholdRole(): 'parent' | 'child' | null {
    try {
      const stored = localStorage.getItem('maple_household_role');
      return stored === 'parent' || stored === 'child' ? stored : null;
    } catch {
      return null;
    }
  }

  private readonly currentHouseholdIdSignal = signal<number | null>(this.loadInitialHouseholdId());
  private readonly currentHouseholdRoleSignal = signal<'parent' | 'child' | null>(
    this.loadInitialHouseholdRole()
  );

  /**
   * Read-only signal containing the currently authenticated user or null.
   */
  readonly currentUser: Signal<User | null> = this._currentUser.asReadonly();

  /**
   * Computed reactive signal reflecting whether a user is currently logged in.
   */
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  /**
   * Read-only signal containing the currently active household ID or null.
   */
  readonly currentHouseholdId: Signal<number | null> = this.currentHouseholdIdSignal.asReadonly();

  /**
   * Read-only signal containing the user's role in the currently active household or null.
   */
  readonly currentHouseholdRole: Signal<'parent' | 'child' | null> =
    this.currentHouseholdRoleSignal.asReadonly();

  /**
   * Sets the active household ID for the authenticated session.
   *
   * @param id The household ID
   */
  setCurrentHouseholdId(id: number): void {
    this.currentHouseholdIdSignal.set(id);
    try {
      localStorage.setItem('maple_household_id', id.toString());
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }

  /**
   * Sets the active household role for the authenticated session.
   *
   * @param role The household role ('parent' | 'child' | null)
   */
  setCurrentHouseholdRole(role: 'parent' | 'child' | null): void {
    this.currentHouseholdRoleSignal.set(role);
    try {
      if (role) {
        localStorage.setItem('maple_household_role', role);
      } else {
        localStorage.removeItem('maple_household_role');
      }
    } catch {
      // localStorage may be unavailable in some contexts
    }
  }

  /**
   * Extracts household identifier and role from authentication responses if present.
   */
  private extractHousehold(response: unknown): void {
    const res = response as {
      household?: { id?: number; role?: 'parent' | 'child' | string };
      household_id?: number;
    };
    const id = res?.household?.id ?? res?.household_id;
    if (id !== undefined && id !== null) {
      this.setCurrentHouseholdId(Number(id));
    }
    const role = res?.household?.role;
    if (role === 'parent' || role === 'child') {
      this.setCurrentHouseholdRole(role);
    }
  }

  /**
   * Registers a new user account and establishes an authenticated session.
   *
   * @param email User email address
   * @param password Account password
   * @param displayName User full or preferred display name
   * @returns Observable emitting the registered User object in an AuthResponse wrapper
   */
  register(email: string, password: string, displayName: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/register', {
      email,
      password,
      display_name: displayName,
    }).pipe(
      tap((response) => {
        if (response.user) {
          try {
            localStorage.setItem('maple_user', JSON.stringify(response.user));
            localStorage.setItem('maple_user_id', String(response.user.id));
          } catch {
            // ignore
          }
        }
        if (response.household?.id) {
          try {
            localStorage.setItem('maple_household_id', String(response.household.id));
          } catch {
            // ignore
          }
        }
        if (response.household?.role) {
          try {
            localStorage.setItem('maple_household_role', response.household.role);
          } catch {
            // ignore
          }
        }
        this._currentUser.set(response.user);
        this.extractHousehold(response);
        if (response.household?.role) {
          const role = response.household.role === 'child' ? 'child' : 'parent';
          this.setCurrentHouseholdRole(role);
        }
        this._justLoggedIn.set(true);
        setTimeout(() => this._justLoggedIn.set(false), 5000);
      })
    );
  }

  /**
   * Authenticates an existing user and stores their profile in the currentUser signal.
   *
   * @param email User email address
   * @param password Account password
   * @returns Observable emitting the authenticated User object in an AuthResponse wrapper
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/auth/login', {
      email,
      password,
    }).pipe(
      tap((response) => {
        if (response.user) {
          try {
            localStorage.setItem('maple_user', JSON.stringify(response.user));
            localStorage.setItem('maple_user_id', String(response.user.id));
          } catch {
            // ignore
          }
        }
        if (response.household?.id) {
          try {
            localStorage.setItem('maple_household_id', String(response.household.id));
          } catch {
            // ignore
          }
        }
        if (response.household?.role) {
          try {
            localStorage.setItem('maple_household_role', response.household.role);
          } catch {
            // ignore
          }
        }
        this._currentUser.set(response.user);
        this.extractHousehold(response);
        if (response.household?.role) {
          const role = response.household.role === 'child' ? 'child' : 'parent';
          this.setCurrentHouseholdRole(role);
        }
        this._justLoggedIn.set(true);
        setTimeout(() => this._justLoggedIn.set(false), 5000);
      })
    );
  }

  /**
   * Terminates the current authenticated session on the server and resets the currentUser signal.
   *
   * @returns Observable completing when logout is processed
   */
  logout(): Observable<void> {
    return this.api.post<void>('/auth/logout').pipe(
      tap(() => {
        this._currentUser.set(null);
        this.finishLogin();
        this._justLoggedIn.set(false);
        this.currentHouseholdIdSignal.set(null);
        this.setCurrentHouseholdRole(null);
        try {
          localStorage.removeItem('maple_user');
          localStorage.removeItem('maple_user_id');
          localStorage.removeItem('maple_household_id');
          localStorage.removeItem('maple_household_role');
        } catch {
          // ignore
        }
      })
    );
  }

  /**
   * Fetches the current user profile from local state or the backend session cookie.
   * Updates currentUser on success, or sets it to null on failure.
   *
   * @returns Observable emitting the authenticated User profile
   */
  me(): Observable<any> {
    // 1. Try localStorage FIRST. If found, we are logged in.
    try {
      const storedUser = localStorage.getItem('maple_user');
      const storedHouseholdId = localStorage.getItem('maple_household_id');
      const storedRole = localStorage.getItem('maple_household_role');

      if (storedUser && storedHouseholdId) {
        const user = JSON.parse(storedUser);
        this._currentUser.set(user);
        this.currentHouseholdIdSignal.set(Number(storedHouseholdId));
        if (storedRole) {
          this.currentHouseholdRoleSignal.set(storedRole as any);
        }

        return of({ user, household: { id: Number(storedHouseholdId), role: storedRole } });
      }
    } catch {
      // ignore
    }

    // 2. Fallback: If we have currentUser in memory, return it
    if (this.currentUser() !== null) {
      const householdId = this.currentHouseholdId();
      const role = this.currentHouseholdRole();
      return of({
        user: this.currentUser(),
        household: householdId ? { id: householdId, role: role || undefined } : null,
      });
    }

    // 3. Last resort: Call the backend
    return this.api.get<any>('/auth/me').pipe(
      tap((res) => {
        if (res?.user) {
          this._currentUser.set(res.user);
          try {
            localStorage.setItem('maple_user', JSON.stringify(res.user));
            localStorage.setItem('maple_user_id', String(res.user.id));
          } catch {}
          if (res.household?.id) {
            this.currentHouseholdIdSignal.set(res.household.id);
            try {
              localStorage.setItem('maple_household_id', String(res.household.id));
            } catch {}
          }
          if (res.household?.role) {
            this.currentHouseholdRoleSignal.set(res.household.role);
            try {
              localStorage.setItem('maple_household_role', res.household.role);
            } catch {}
          }
        }
      }),
      catchError((err) => {
        this._currentUser.set(null);
        return of(null);
      })
    );
  }

  /**
   * Checks whether a user is currently logged in based on the currentUser signal.
   *
   * @returns True if currentUser is not null, otherwise false
   */
  isLoggedIn(): boolean {
    return this._currentUser() !== null;
  }
}
