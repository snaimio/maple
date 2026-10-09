import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Functional route guard that ensures only authenticated users can access protected routes.
 *
 * Checks the active currentUser signal or queries the backend session via AuthService.me().
 * If authenticated, navigation proceeds. If unauthenticated, redirects to /login with a UrlTree.
 */
export const authGuard: CanActivateFn = (): Observable<boolean | UrlTree> | boolean | UrlTree => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.currentUser()) {
    return true;
  }

  return auth.me().pipe(
    map((res) => (res.user ? true : router.createUrlTree(['/login']))),
    catchError(() => of(router.createUrlTree(['/login'])))
  );
};
