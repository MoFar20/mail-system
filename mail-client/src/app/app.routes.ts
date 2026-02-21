import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { MailListComponent } from './components/mail-list/mail-list.component';
import { MailDetailComponent } from './components/mail-detail/mail-detail.component';
import { MailEditorComponent } from './components/mail-editor/mail-editor.component';
import { authGuard } from './guards/auth.guard';

/**
 * Application route definitions.
 * Maps URLs to corresponding components and protects sensitive areas with guards.
 */
export const routes: Routes = [
  // Home page: redirect to login or mail list
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },

  /** Route for the login page. */
  {
    path: 'login',
    component: LoginComponent
  },

  /** Route for the registration page. */
  {
    path: 'register',
    component: RegisterComponent
  },

  /**
   * Route for the mail overview.
   * Protected by authGuard to enforce stateless authentication.
   */
  {
    path: 'mails',
    component: MailListComponent,
    canActivate: [authGuard]
  },

  /** Route for creating a new mail. */
  {
    path: 'compose',
    component: MailEditorComponent,
    canActivate: [authGuard]
  },

  /** Route for editing an existing mail (draft). */
  {
    path: 'compose/:id',
    component: MailEditorComponent,
    canActivate: [authGuard]
  },

  /** Route for mail detail view. */
  {
    path: 'mails/:id',
    component: MailDetailComponent,
    canActivate: [authGuard]
  },

  // Catch-all: unknown paths redirect to login
  {
    path: '**',
    redirectTo: '/login'
  },
];

