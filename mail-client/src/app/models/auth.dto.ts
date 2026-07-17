/**
 * Data Transfer Objects for Authentication API
 * Ensures type safety for all auth-related requests and responses
 */

/**
 * Credentials for login/registration requests
 */
export interface AuthCredentials {
  /** Email address (used as username) */
  username: string;
  /** User password */
  password: string;
}

/**
 * Response from login endpoint
 */
export interface LoginResponse {
  /** JWT token for authenticated requests */
  token: string;
}

/**
 * Response from registration endpoint
 */
export interface RegisterResponse {
  /** Success message from backend */
  message?: string;
  /** JWT token (if auto-login is enabled) */
  token?: string;
}

/**
 * Standardized error response from API
 */
export interface ApiErrorResponse {
  /** Error message from server */
  message: string;
  /** HTTP status code */
  status?: number;
  /** Additional error details */
  details?: Record<string, any>;
}

