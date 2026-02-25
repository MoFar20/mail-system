import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Component for user registration.
 * Allows new users to create an account with email and password.
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  /** Registration form with username and password fields. */
  public registerForm: FormGroup;
  /** Error message to display if registration fails. */
  public errorMessage: string = '';
  /** Success message to display after successful registration. */
  public successMessage: string = '';
  /** Loading state indicator. */
  public isLoading: boolean = false;
  /** Whether to show the password. */
  public showPassword: boolean = false;

  /**
   * Initializes the registration form with validators.
   * @param fb FormBuilder for creating reactive forms.
   * @param authService Service for authentication operations.
   * @param router Router for navigation after successful registration.
   */
  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    });
  }

  /**
   * Toggles password visibility.
   */
  public togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  /**
   * Validates that password and confirm password match.
   * @returns True if passwords match, false otherwise.
   */
  private passwordsMatch(): boolean {
    const password = this.registerForm.get('password')?.value;
    const confirmPassword = this.registerForm.get('confirmPassword')?.value;
    return password === confirmPassword;
  }

  /**
   * Handles form submission for user registration.
   * Validates inputs and calls the auth service to register the user.
   */
  public onRegister(): void {
    this.errorMessage = '';
    this.successMessage = '';

    // Validate form
    if (this.registerForm.invalid) {
      if (this.registerForm.get('username')?.hasError('required')) {
        this.errorMessage = 'Email address is required.';
      } else if (this.registerForm.get('username')?.hasError('email')) {
        this.errorMessage = 'Please enter a valid email address.';
      } else if (this.registerForm.get('password')?.hasError('required')) {
        this.errorMessage = 'Password is required.';
      } else if (this.registerForm.get('password')?.hasError('minlength')) {
        this.errorMessage = 'Password must be at least 8 characters long.';
      } else if (this.registerForm.get('confirmPassword')?.hasError('required')) {
        this.errorMessage = 'Please confirm your password.';
      } else {
        this.errorMessage = 'Please fill in all required fields correctly.';
      }
      return;
    }

    // Check if passwords match
    if (!this.passwordsMatch()) {
      this.errorMessage = 'Passwords do not match. Please try again.';
      return;
    }

    this.isLoading = true;

    const credentials = {
      username: this.registerForm.value.username,
      password: this.registerForm.value.password
    };

    this.authService.register(credentials).subscribe({
      next: (response) => {
        this.successMessage = '✅ Account created successfully! Redirecting to login...';
        this.isLoading = false;
        // Redirect to login after 2 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        // Extract error message from response
        if (err.status === 409) {
          this.errorMessage = '❌ An account with this email address already exists. Please login instead.';
        } else if (err.error?.message) {
          this.errorMessage = '❌ ' + err.error.message;
        } else if (err.message) {
          this.errorMessage = '❌ ' + err.message;
        } else {
          this.errorMessage = '❌ Registration failed. Please try again.';
        }
      }
    });
  }

  /**
   * Navigates to the login page.
   */
  public goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
