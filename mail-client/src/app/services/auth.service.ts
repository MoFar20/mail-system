import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { LoginCredentials, RegisterCredentials, LoginResponse, RegisterResponse, ApiErrorResponse } from '../models/auth.dto';

/**
 * Service for handling authentication.
 * Manages the login, registration, and JWT token storage in local storage.
 * Provides centralized error handling for auth operations.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /** Base URL for authentication endpoints. */
  private authUrl = 'http://localhost:8080/api/auth';
  /** Key name for the token in LocalStorage. */
  private readonly TOKEN_KEY = 'auth_token';
  /** Key name for the username in LocalStorage. */
  private readonly USERNAME_KEY = 'auth_username';
  /** Key name for the first name in LocalStorage. */
  private readonly FIRSTNAME_KEY = 'auth_firstname';
  /** Key name for the last name in LocalStorage. */
  private readonly LASTNAME_KEY = 'auth_lastname';

  /**
   * Creates an instance of AuthService.
   * @param http The Angular HttpClient for API requests.
   */
  constructor(private http: HttpClient) { }

  /**
   * Registers a new user account.
   * @param credentials User credentials with username and password.
   * @returns An Observable with the server response.
   * @throws Observable with user-friendly error message.
   */
  public register(credentials: RegisterCredentials): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.authUrl}/register`, credentials).pipe(
      catchError((error: HttpErrorResponse) => {
        const userFriendlyError = this.handleAuthError(error);
        return throwError(() => userFriendlyError);
      })
    );
  }

  /**
   * Performs a login attempt with username and password.
   * On success, the received JWT token is stored in LocalStorage.
   * @param credentials User credentials with username and password.
   * @returns An Observable with the server response (contains the token).
   * @throws Observable with user-friendly error message.
   */
  public login(credentials: LoginCredentials): Observable<LoginResponse> {
    // Clear any old tokens before login
    this.logout();

    return this.http.post<LoginResponse>(`${this.authUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem(this.USERNAME_KEY, credentials.mail);
          if (response.firstname) {
            localStorage.setItem(this.FIRSTNAME_KEY, response.firstname);
          }
          if (response.lastname) {
            localStorage.setItem(this.LASTNAME_KEY, response.lastname);
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        const userFriendlyError = this.handleAuthError(error);
        return throwError(() => userFriendlyError);
      })
    );
  }

  /**
   * Centralized error handling for authentication operations.
   * Converts HTTP errors to user-friendly messages.
   * @param error The HTTP error response.
   * @returns Structured error object with user-friendly message.
   */
  private handleAuthError(error: HttpErrorResponse): ApiErrorResponse {
    let message = 'An error occurred during authentication. Please try again.';

    if (error.status === 401) {
      message = 'Invalid credentials. Please check your username and password.';
    } else if (error.status === 409) {
      message = 'An account with this email address already exists. Please login instead.';
    } else if (error.status === 400) {
      message = error.error?.message || 'Invalid request. Please check your input.';
    } else if (error.status === 500) {
      message = 'Server error. Please try again later.';
    } else if (error.status === 0) {
      message = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error.error?.message) {
      message = error.error.message;
    }

    return {
      message,
      status: error.status,
      details: error.error
    };
  }

  /**
   * Gets the username from LocalStorage that was stored during login.
   * @returns The username or 'Unknown' if not found.
   */
  public getUsername(): string {
    return localStorage.getItem('auth_username') || 'Unknown';
  }

  /**
   * Clears the current token from storage and logs out the user.
   */
  public logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USERNAME_KEY);
    localStorage.removeItem(this.FIRSTNAME_KEY);
    localStorage.removeItem(this.LASTNAME_KEY);
  }

  /** Returns the stored first name of the logged-in user. */
  public getFirstname(): string | null {
    return localStorage.getItem(this.FIRSTNAME_KEY);
  }

  /** Returns the stored last name of the logged-in user. */
  public getLastname(): string | null {
    return localStorage.getItem(this.LASTNAME_KEY);
  }

  /**
   * Returns the currently stored JWT token.
   * @returns The token as a string or null if no token is present.
   */
  public getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Checks if a user is currently logged in (token presence).
   * @returns True if a token exists, otherwise false.
   */
  public isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Returns the email address of the currently logged-in user.
   * @returns The email address or null if not logged in.
   */
  public getCurrentUserEmail(): string | null {
    return localStorage.getItem('auth_username');
  }
}

