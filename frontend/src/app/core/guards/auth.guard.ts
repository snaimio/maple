import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard that ensures only authenticated users can access protected routes.
 *
 * 1. If user is already populated, allow immediately.
 * 2. If we are currently in the process of logging in, allow navigation to the destination
 *    without calling /auth/me, preventing race conditions with cookie settlement.
 * 3. Fallback for hard refreshes or deep links: verifies session via /auth/me.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // 1. If user is already populated, allow.
  if (auth.currentUser() !== null) return true;

  // 2. If we are currently in the process of logging in, allow navigation to the destination.
  // The login component will handle updating the user state.
  if (auth.isLoggingIn() || auth.justLoggedIn()) {
    return true;
  }

  // 3. Fallback for hard refreshes / deep links.
  return auth.me().pipe(
    map(() => true),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
