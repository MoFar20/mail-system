import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
/**
 * Service for handling authentication.
 * Manages the login, registration, and JWT token storage in local storage.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  /** Base URL for authentication endpoints. */
  private authUrl = '${environment.apiUrl}/api/auth';
  /** Key name for the token in LocalStorage. */
  private readonly TOKEN_KEY = 'auth_token';

  /**
   * Creates an instance of AuthService.
   * @param http The Angular HttpClient for API requests.
   */
  constructor(private http: HttpClient) {}

  /**
   * Registers a new user account.
   * @param credentials An object with 'username' and 'password'.
   * @returns An Observable with the server response.
   */
  public register(credentials: any): Observable<any> {
    return this.http.post<any>(`${this.authUrl}/register`, credentials);
  }

  /**
   * Performs a login attempt with username and password.
   * On success, the received JWT token is stored in LocalStorage.
   * @param credentials An object with 'username' and 'password'.
   * @returns An Observable with the server response (contains the token).
   */
  public login(credentials: any): Observable<{ token: string }> {
    // Clear any old tokens before login
    this.logout();

    return this.http.post<{ token: string }>(`${this.authUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem(this.TOKEN_KEY, response.token);
          localStorage.setItem('auth_username', credentials.username);
        }
      })
    );
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
    localStorage.removeItem('auth_username');
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
  
  private apiUrl = 'https://remarkable-jeanne-thmdms-34e6c67e.koyeb.app/api/auth';
}

