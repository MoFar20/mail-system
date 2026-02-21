import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';

/**
 * HTTP interceptor that automatically attaches JWT tokens to requests.
 *
 * Adds the 'Authorization: Bearer <token>' header if a token exists.
 * Handles 401 errors by redirecting to the login page.
 *
 * @param req The outgoing HTTP request.
 * @param next The next handler in the interceptor chain.
 * @returns An Observable of the HTTP event.
 */
export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  let authReq = req;

  // Add token to request if available
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // On 401 (Unauthorized) - token invalid or expired
      if (error.status === 401 && !req.url.includes('/api/auth/')) {
        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
