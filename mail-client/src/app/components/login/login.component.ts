import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Login component for user authentication.
 * Provides a Google-style login form with floating labels.
 * On successful login, redirects to the mail list.
 *
 * Memory Management: Uses takeUntil pattern to prevent subscription leaks.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnDestroy {
  /** The reactive login form group. */
  public loginForm: FormGroup;

  /** Error message displayed on login failure. */
  public errorMessage: string = '';

  /** Loading state during authentication. */
  public isLoading: boolean = false;

  /** Controls password field visibility. */
  public showPassword: boolean = false;

  /** Tracks focus state of email input for floating label. */
  public emailFocused: boolean = false;

  /** Tracks focus state of password input for floating label. */
  public passwordFocused: boolean = false;

  /** Subject for managing observable unsubscriptions. */
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]]
    });
  }

  /**
   * Handles form submission for user login.
   * Validates the form and calls the auth service.
   * Uses takeUntil pattern to prevent memory leaks.
   */
  public onSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage = '';
      this.isLoading = true;

      this.authService.login(this.loginForm.value)
        .pipe(
          takeUntil(this.destroy$)  // ✅ Automatically unsubscribe on component destroy
        )
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.router.navigate(['/mails']);
          },
          error: (err) => {
            this.isLoading = false;
            // Service now returns user-friendly error message
            this.errorMessage = err.message || 'Invalid login credentials. Please try again.';
          }
        });
    }
  }

  /**
   * Lifecycle hook: Clean up subscriptions to prevent memory leaks.
   * The takeUntil operator handles most cleanup, but this ensures complete cleanup.
   */
  public ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
