import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Functional HTTP interceptor that attaches withCredentials: true
 * to all outgoing requests to ensure session cookies (e.g. PHPSESSID)
 * are sent to and received from the backend API.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const cloned = req.clone({
    withCredentials: true,
  });
  return next(cloned);
};
