import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/**
 * Login component for user authentication.
 * Provides a Google-style login form with floating labels.
 * On successful login, redirects to the mail list.
 */
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
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
   */
  public onSubmit(): void {
    if (this.loginForm.valid) {
      this.errorMessage = '';
      this.isLoading = true;

      this.authService.login(this.loginForm.value).subscribe({
        next: () => {
          this.isLoading = false;
          this.router.navigate(['/mails']);
        },
        error: () => {
          this.isLoading = false;
          this.errorMessage = 'Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.';
        }
      });
    }
  }
}
