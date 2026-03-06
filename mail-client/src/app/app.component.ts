import { Component, HostListener } from '@angular/core';
import { AuthService } from './services/auth.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Root component of the application.
 * Provides the main layout including header with navigation, search, and user menu.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  /**
   * Creates an instance of AppComponent.
   * @param authService Service for authentication.
   * @param router Angular router for navigation.
   */
  constructor(
    public authService: AuthService,
    public router: Router
  ) {
    this.loadSettings();
  }

  /**
   * Listens for clicks outside settings menu to close it.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.settings-menu')) {
      this.showSettingsMenu = false;
    }
  }

  /** Search query for filtering emails. */
  public searchQuery: string = '';

  /** Controls visibility of the help modal. */
  public showHelpModal: boolean = false;

  /** Controls visibility of advanced search options. */
  public showAdvancedSearch: boolean = false;

  /** Controls sidebar collapsed state. */
  public sidebarCollapsed: boolean = false;

  /** Controls visibility of settings menu. */
  public showSettingsMenu: boolean = false;

  /** Controls visibility of account info modal. */
  public showAccountModal: boolean = false;

  /** Controls visibility of confirm dialog. */
  public showConfirmDialog: boolean = false;

  /** Message for confirm dialog. */
  public confirmMessage: string = '';

  /** Callback for confirm dialog. */
  private confirmCallback: (() => void) | null = null;

  /** Dark mode setting. */
  public darkMode: boolean = false;

  /** Email notifications setting. */
  public emailNotifications: boolean = true;

  /** Compact view setting. */
  public compactView: boolean = false;

  /** Toast notification message. */
  public toastMessage: string = '';

  /** Controls visibility of toast. */
  public showToast: boolean = false;

  /** Advanced search filters. */
  public advancedFilters = {
    from: '',
    to: '',
    subject: '',
    hasWords: '',
    doesntHave: '',
    dateFrom: '',
    dateTo: '',
    hasAttachment: false
  };

  /**
   * Toggles sidebar collapsed/expanded state.
   */
  public toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
    // Dispatch event for child components
    window.dispatchEvent(new CustomEvent('sidebar-toggle', {
      detail: { collapsed: this.sidebarCollapsed }
    }));
  }

  /**
   * Handles user logout action.
   * Clears authentication and redirects to login page.
   */
  public onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Performs a search with the current query.
   * Broadcasts search query to child components.
   */
  public performSearch(): void {
    if (this.router.url !== '/mails') {
      this.router.navigate(['/mails']);
    }
    // Dispatch custom event with search query
    window.dispatchEvent(new CustomEvent('mail-search', {
      detail: { query: this.searchQuery }
    }));
  }

  /**
   * Handles search input key events.
   * @param event The keyboard event.
   */
  public onSearchKeyup(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.performSearch();
    }
  }

  /**
   * Clears the search query and results.
   */
  public clearSearch(): void {
    this.searchQuery = '';
    window.dispatchEvent(new CustomEvent('mail-search', {
      detail: { query: '' }
    }));
  }

  /**
   * Toggles advanced search panel visibility.
   */
  public toggleAdvancedSearch(): void {
    this.showAdvancedSearch = !this.showAdvancedSearch;
  }

  /**
   * Applies advanced search filters.
   */
  public applyAdvancedSearch(): void {
    // Build search query from advanced filters
    let query = '';
    if (this.advancedFilters.from) query += `from:${this.advancedFilters.from} `;
    if (this.advancedFilters.to) query += `to:${this.advancedFilters.to} `;
    if (this.advancedFilters.subject) query += `subject:${this.advancedFilters.subject} `;
    if (this.advancedFilters.hasWords) query += this.advancedFilters.hasWords + ' ';

    this.searchQuery = query.trim();
    this.showAdvancedSearch = false;
    this.performSearch();
  }

  /**
   * Resets advanced search filters.
   */
  public resetAdvancedFilters(): void {
    this.advancedFilters = {
      from: '',
      to: '',
      subject: '',
      hasWords: '',
      doesntHave: '',
      dateFrom: '',
      dateTo: '',
      hasAttachment: false
    };
  }

  /**
   * Opens the help/about modal.
   */
  public openHelpModal(): void {
    this.showHelpModal = true;
  }

  /**
   * Closes the help/about modal.
   */
  public closeHelpModal(): void {
    this.showHelpModal = false;
  }

  /**
   * Gets initials from user email for avatar display.
   * @returns Two character initials.
   */
  public getAvatarInitials(): string {
    const email = this.authService.getUsername();
    if (!email) return '?';
    const name = email.split('@')[0];
    if (name.length >= 2) {
      return name.substring(0, 2).toUpperCase();
    }
    return name.toUpperCase();
  }

  /**
   * Gets display name from user email.
   * @returns Formatted display name.
   */
  public getUserDisplayName(): string {
    const email = this.authService.getUsername();
    if (!email) return 'User';
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Gets the current date formatted.
   * @returns Formatted current date string.
   */
  public getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Toggles settings menu visibility.
   */
  public toggleSettingsMenu(): void {
    this.showSettingsMenu = !this.showSettingsMenu;
  }

  /**
   * Toggles dark mode setting.
   */
  public toggleDarkMode(): void {
    localStorage.setItem('darkMode', String(this.darkMode));
    this.applyDarkMode();
    this.showToastMessage(this.darkMode ? 'Dark mode enabled' : 'Dark mode disabled');
  }

  /**
   * Applies dark mode to the document.
   */
  private applyDarkMode(): void {
    if (this.darkMode) {
      document.documentElement.classList.add('dark-mode');
      document.body.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
      document.body.classList.remove('dark-mode');
    }
    // Dispatch event for child components
    window.dispatchEvent(new CustomEvent('dark-mode-toggle', {
      detail: { darkMode: this.darkMode }
    }));
  }

  /**
   * Toggles email notifications setting.
   */
  public toggleEmailNotifications(): void {
    localStorage.setItem('emailNotifications', String(this.emailNotifications));
    this.showToastMessage(this.emailNotifications ? 'Email notifications enabled' : 'Email notifications disabled');
  }

  /**
   * Toggles compact view setting.
   */
  public toggleCompactView(): void {
    localStorage.setItem('compactView', String(this.compactView));
    window.dispatchEvent(new CustomEvent('compact-view-toggle', {
      detail: { compact: this.compactView }
    }));
    this.showToastMessage(this.compactView ? 'Compact view enabled' : 'Compact view disabled');
  }

  /**
   * Shows account information modal.
   */
  public showAccountInfo(): void {
    this.showSettingsMenu = false;
    this.showAccountModal = true;
  }

  /**
   * Closes account information modal.
   */
  public closeAccountModal(): void {
    this.showAccountModal = false;
  }

  /**
   * Opens confirm dialog for clearing local data.
   */
  public clearLocalData(): void {
    this.showSettingsMenu = false;
    this.confirmMessage = 'Are you sure you want to clear all local data? This will reset your preferences and starred emails.';
    this.confirmCallback = () => {
      localStorage.removeItem('starred_mails');
      localStorage.removeItem('darkMode');
      localStorage.removeItem('emailNotifications');
      localStorage.removeItem('compactView');
      this.darkMode = false;
      this.emailNotifications = true;
      this.compactView = false;
      this.applyDarkMode();
      window.dispatchEvent(new CustomEvent('compact-view-toggle', {
        detail: { compact: false }
      }));
      this.showToastMessage('Local data cleared successfully');
    };
    this.showConfirmDialog = true;
  }

  /**
   * Confirms the action in confirm dialog.
   */
  public confirmAction(): void {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.showConfirmDialog = false;
    this.confirmCallback = null;
  }

  /**
   * Cancels the confirm dialog.
   */
  public cancelConfirm(): void {
    this.showConfirmDialog = false;
    this.confirmCallback = null;
  }

  /**
   * Shows a toast notification message.
   * @param message The message to display.
   */
  private showToastMessage(message: string): void {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }

  /**
   * Loads saved settings from localStorage.
   */
  private loadSettings(): void {
    this.darkMode = localStorage.getItem('darkMode') === 'true';
    this.emailNotifications = localStorage.getItem('emailNotifications') !== 'false';
    this.compactView = localStorage.getItem('compactView') === 'true';

    if (this.darkMode) {
      this.applyDarkMode();
    }
    if (this.compactView) {
      window.dispatchEvent(new CustomEvent('compact-view-toggle', {
        detail: { compact: this.compactView }
      }));
    }
  }
}

