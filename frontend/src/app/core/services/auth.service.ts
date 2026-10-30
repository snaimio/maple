import { inject, Injectable, signal, computed, Signal } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
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
  private readonly _currentUser = signal<User | null>(null);

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
        this._currentUser.set(response.user);
        this.extractHousehold(response);
        if (response.household?.role) {
          const role = response.household.role === 'child' ? 'child' : 'parent';
          this.setCurrentHouseholdRole(role);
        }
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
        this._currentUser.set(response.user);
        this.extractHousehold(response);
        if (response.household?.role) {
          const role = response.household.role === 'child' ? 'child' : 'parent';
          this.setCurrentHouseholdRole(role);
        }
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
        this.currentHouseholdIdSignal.set(null);
        this.setCurrentHouseholdRole(null);
        try {
          localStorage.removeItem('maple_household_id');
          localStorage.removeItem('maple_household_role');
        } catch {
          // ignore
        }
      })
    );
  }

  /**
   * Fetches the current user profile from the backend session cookie.
   * Updates currentUser on success, or sets it to null on failure.
   *
   * @returns Observable emitting the authenticated User profile
   */
  me(): Observable<AuthResponse> {
    return this.api.get<AuthResponse>('/auth/me').pipe(
      tap({
        next: (response) => {
          this._currentUser.set(response.user);
          this.extractHousehold(response);
          if (response.household?.role) {
            const role = response.household.role === 'child' ? 'child' : 'parent';
            this.setCurrentHouseholdRole(role);
          }
        },
        error: () => {
          this._currentUser.set(null);
          this.setCurrentHouseholdRole(null);
        },
      }),
      catchError((error) => {
        this._currentUser.set(null);
        this.setCurrentHouseholdRole(null);
        return throwError(() => error);
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
