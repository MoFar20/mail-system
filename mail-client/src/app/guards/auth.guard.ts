import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard that controls access to protected routes.
 * Checks via AuthService if a valid JWT token is present.
 * @returns True if the user is logged in, otherwise redirects to login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  } else {
    // Not logged in -> redirect to login page
    router.navigate(['/login']);
    return false;
  }
};

