/**
 * Data Transfer Objects for Authentication API
 * Ensures type safety for all auth-related requests and responses
 */

/**
 * Credentials for login requests (email + password only)
 */
export interface LoginCredentials {
  mail: string;
  password: string;
}

/**
 * Credentials for registration requests (full user details)
 */
export interface RegisterCredentials {
  firstname: string;
  lastname: string;
  mail: string;
  password: string;
}

/**
 * @deprecated Use LoginCredentials or RegisterCredentials instead.
 * Kept for compatibility during migration.
 */
export interface AuthCredentials extends RegisterCredentials {}

/**
 * Response from login endpoint
 */
export interface LoginResponse {
  token: string;
}

/**
 * Response from registration endpoint
 */
export interface RegisterResponse {
  message?: string;
  token?: string;
}

/**
 * Standardized error response from API
 */
export interface ApiErrorResponse {
  message: string;
  status?: number;
  details?: Record<string, any>;
}

