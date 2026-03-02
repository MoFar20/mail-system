import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MailService } from '../../services/mail.service';
import { AuthService } from '../../services/auth.service';
import { Mail } from '../../models/mail.model';

/**
 * Type definition for the different mail folder types.
 */
type FolderType = 'inbox' | 'starred' | 'sent' | 'drafts' | 'archived' | 'all';

/**
 * Type definition for checkbox selection filters.
 */
type SelectionFilter = 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred';

/**
 * Component for displaying a tabular overview of all emails.
 * Includes search functionality, checkbox dropdown, and folder navigation.
 */
@Component({
  selector: 'app-mail-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './mail-list.component.html',
  styleUrl: './mail-list.component.css'
})
export class MailListComponent implements OnInit, OnDestroy {
  /** List of all mails from the server. */
  public mails: Mail[] = [];

  /** Filtered mails based on search query. */
  public filteredMails: Mail[] = [];

  /** Loading state indicator. */
  public isLoading: boolean = false;

  /** Error message for failed requests. */
  public errorMessage: string = '';

  /** Currently selected folder. */
  public currentFolder: FolderType = 'inbox';

  /** Email address of the logged-in user. */
  public currentUserEmail: string = '';

  /** Selected mails for batch operations. */
  public selectedMails: Mail[] = [];

  /** Controls visibility of checkbox dropdown. */
  public showCheckboxDropdown: boolean = false;

  /** Current search query. */
  public searchQuery: string = '';

  /** Controls sidebar collapsed state. */
  public sidebarCollapsed: boolean = false;

  /** Controls compact view state. */
  public compactView: boolean = false;

  /** Controls dark mode state. */
  public darkMode: boolean = false;

  /** Storage key for starred mail IDs. */
  private readonly STARRED_KEY = 'starred_mails';

  /**
   * Creates an instance of MailListComponent.
   * @param mailService Service for mail API communication.
   * @param authService Service for authentication.
   * @param router Angular router for navigation.
   */
  constructor(
    private mailService: MailService,
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Initializes the component and loads inbox mails.
   */
  public ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUserEmail() || 'Unknown';
    this.loadInbox();

    // Load saved settings
    this.compactView = localStorage.getItem('compactView') === 'true';
    this.darkMode = localStorage.getItem('darkMode') === 'true';

    // Listen for search events from app component
    window.addEventListener('mail-search', this.handleSearchEvent.bind(this));

    // Listen for sidebar toggle events
    window.addEventListener('sidebar-toggle', this.handleSidebarToggle.bind(this));

    // Listen for compact view toggle events
    window.addEventListener('compact-view-toggle', this.handleCompactViewToggle.bind(this));

    // Listen for dark mode toggle events
    window.addEventListener('dark-mode-toggle', this.handleDarkModeToggle.bind(this));
  }

  /**
   * Cleanup on component destroy.
   */
  public ngOnDestroy(): void {
    this.showCheckboxDropdown = false;
    window.removeEventListener('mail-search', this.handleSearchEvent.bind(this));
    window.removeEventListener('sidebar-toggle', this.handleSidebarToggle.bind(this));
    window.removeEventListener('compact-view-toggle', this.handleCompactViewToggle.bind(this));
    window.removeEventListener('dark-mode-toggle', this.handleDarkModeToggle.bind(this));
  }

  /**
   * Handles sidebar toggle events from the header.
   * @param event The custom sidebar toggle event.
   */
  private handleSidebarToggle(event: Event): void {
    const customEvent = event as CustomEvent;
    this.sidebarCollapsed = customEvent.detail?.collapsed || false;
  }

  /**
   * Handles compact view toggle events from settings.
   * @param event The custom compact view toggle event.
   */
  private handleCompactViewToggle(event: Event): void {
    const customEvent = event as CustomEvent;
    this.compactView = customEvent.detail?.compact || false;
  }

  /**
   * Handles dark mode toggle events from settings.
   * @param event The custom dark mode toggle event.
   */
  private handleDarkModeToggle(event: Event): void {
    const customEvent = event as CustomEvent;
    this.darkMode = customEvent.detail?.darkMode || false;
  }

  /**
   * Handles search events from the header search bar.
   * @param event The custom search event.
   */
  private handleSearchEvent(event: Event): void {
    const customEvent = event as CustomEvent;
    const query = customEvent.detail?.query || '';
    this.applySearchFilter(query);
  }

  /**
   * Gets the list of starred mail IDs from localStorage.
   * @returns Array of starred mail IDs.
   */
  private getStarredMailIds(): number[] {
    const stored = localStorage.getItem(this.STARRED_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Saves the starred mail IDs to localStorage.
   * @param ids Array of mail IDs to save as starred.
   */
  private saveStarredMailIds(ids: number[]): void {
    localStorage.setItem(this.STARRED_KEY, JSON.stringify(ids));
  }

  /**
   * Applies starred state from localStorage to mails.
   * @param mails The mails to apply starred state to.
   */
  private applyStarredState(mails: Mail[]): void {
    const starredIds = this.getStarredMailIds();
    mails.forEach(mail => {
      if (mail.id) {
        mail.starred = starredIds.includes(mail.id);
      }
    });
  }

  /**
   * Host listener to close dropdown when clicking outside.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.checkbox-dropdown-wrapper')) {
      this.showCheckboxDropdown = false;
    }
  }

  /**
   * Toggles the checkbox dropdown visibility.
   * @param event The click event.
   */
  public toggleCheckboxDropdown(event: Event): void {
    event.stopPropagation();
    this.showCheckboxDropdown = !this.showCheckboxDropdown;
  }

  /**
   * Selects mails based on the specified filter.
   * @param filter The selection filter to apply.
   */
  public selectByFilter(filter: SelectionFilter): void {
    switch (filter) {
      case 'all':
        this.filteredMails.forEach(mail => mail.selected = true);
        break;
      case 'none':
        this.filteredMails.forEach(mail => mail.selected = false);
        break;
      case 'read':
        this.filteredMails.forEach(mail => mail.selected = mail.read === true);
        break;
      case 'unread':
        this.filteredMails.forEach(mail => mail.selected = mail.read !== true);
        break;
      case 'starred':
        this.filteredMails.forEach(mail => mail.selected = mail.starred === true);
        break;
      case 'unstarred':
        this.filteredMails.forEach(mail => mail.selected = mail.starred !== true);
        break;
    }
    this.updateSelectedMails();
    this.showCheckboxDropdown = false;
  }

  /**
   * Checks if all mails are selected.
   * @returns True if all mails are selected.
   */
  public areAllSelected(): boolean {
    return this.filteredMails.length > 0 && this.filteredMails.every(mail => mail.selected);
  }

  /**
   * Checks if some (but not all) mails are selected.
   * @returns True if some mails are selected.
   */
  public areSomeSelected(): boolean {
    const selectedCount = this.filteredMails.filter(mail => mail.selected).length;
    return selectedCount > 0 && selectedCount < this.filteredMails.length;
  }

  /**
   * Updates the selectedMails array based on current selections.
   */
  private updateSelectedMails(): void {
    this.selectedMails = this.filteredMails.filter(mail => mail.selected);
  }

  /**
   * Applies the search filter to the mails.
   * Supports advanced search syntax like "from:user@example.com subject:test"
   * @param query The search query string.
   */
  public applySearchFilter(query: string): void {
    this.searchQuery = query.trim();

    if (!this.searchQuery) {
      this.filteredMails = [...this.mails];
      return;
    }

    // Parse advanced search syntax
    const filters = this.parseSearchQuery(this.searchQuery);

    this.filteredMails = this.mails.filter(mail => {
      // Check from filter
      if (filters.from && !mail.sender.toLowerCase().includes(filters.from)) {
        return false;
      }

      // Check to filter
      if (filters.to) {
        const hasToRecipient = mail.recipients?.some(r =>
          r.address.toLowerCase().includes(filters.to!)
        );
        if (!hasToRecipient) return false;
      }

      // Check subject filter
      if (filters.subject && !mail.subject.toLowerCase().includes(filters.subject)) {
        return false;
      }

      // Check has words filter
      if (filters.hasWords) {
        const searchIn = [
          mail.sender || '',
          mail.subject || '',
          mail.content || '',
          ...(mail.recipients?.map(r => r.address) || [])
        ].join(' ').toLowerCase();

        if (!searchIn.includes(filters.hasWords)) {
          return false;
        }
      }

      // Check attachment filter
      if (filters.hasAttachment && (!mail.attachments || mail.attachments.length === 0)) {
        return false;
      }

      return true;
    });
  }

  /**
   * Parses search query with advanced syntax (from:, to:, subject:, etc.)
   * @param query The search query string
   * @returns Parsed search filters
   */
  private parseSearchQuery(query: string): {
    from?: string;
    to?: string;
    subject?: string;
    hasWords?: string;
    hasAttachment?: boolean;
  } {
    const filters: any = {};
    const lowerQuery = query.toLowerCase();

    // Extract from: filter
    const fromMatch = lowerQuery.match(/from:(\S+)/);
    if (fromMatch) {
      filters.from = fromMatch[1];
      query = query.replace(/from:\S+/i, '').trim();
    }

    // Extract to: filter
    const toMatch = lowerQuery.match(/to:(\S+)/);
    if (toMatch) {
      filters.to = toMatch[1];
      query = query.replace(/to:\S+/i, '').trim();
    }

    // Extract subject: filter
    const subjectMatch = lowerQuery.match(/subject:(\S+)/);
    if (subjectMatch) {
      filters.subject = subjectMatch[1];
      query = query.replace(/subject:\S+/i, '').trim();
    }

    // Extract has:attachment filter
    if (lowerQuery.includes('has:attachment')) {
      filters.hasAttachment = true;
      query = query.replace(/has:attachment/i, '').trim();
    }

    // Remaining text is "has words"
    if (query.trim()) {
      filters.hasWords = query.toLowerCase().trim();
    }

    return filters;
  }

  /**
   * Clears the search and shows all mails.
   */
  public clearSearch(): void {
    this.searchQuery = '';
    this.filteredMails = [...this.mails];
  }

  /**
   * Switches the current folder and loads the corresponding mails.
   * @param folder The folder to load.
   */
  public switchFolder(folder: FolderType): void {
    this.currentFolder = folder;
    this.errorMessage = '';
    this.searchQuery = '';

    switch (folder) {
      case 'inbox':
        this.loadInbox();
        break;
      case 'sent':
        this.loadSent();
        break;
      case 'drafts':
        this.loadDrafts();
        break;
      case 'starred':
        this.loadStarred();
        break;
      case 'archived':
        this.loadArchived();
        break;
      case 'all':
        this.loadAll();
        break;
    }
  }

  /**
   * Loads inbox mails for the logged-in user.
   * Excludes archived mails.
   */
  private loadInbox(): void {
    this.isLoading = true;
    this.mailService.getInbox().subscribe({
      next: (data) => {
        this.applyStarredState(data);
        // Filter out archived mails from inbox
        const archivedIds = this.getArchivedMailIds();
        this.mails = data.filter(mail => !mail.id || !archivedIds.includes(mail.id));
        this.filteredMails = [...this.mails];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error loading mails';
        this.isLoading = false;
      }
    });
  }

  /**
   * Loads sent mails for the logged-in user.
   */
  private loadSent(): void {
    this.isLoading = true;
    this.mailService.getSentMails().subscribe({
      next: (data) => {
        this.applyStarredState(data);
        this.mails = data;
        this.filteredMails = [...data];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error loading sent mails';
        this.isLoading = false;
      }
    });
  }

  /**
   * Loads draft mails for the logged-in user.
   */
  private loadDrafts(): void {
    this.isLoading = true;
    this.mailService.getDrafts().subscribe({
      next: (data) => {
        this.applyStarredState(data);
        this.mails = data;
        this.filteredMails = [...data];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error loading drafts';
        this.isLoading = false;
      }
    });
  }

  /**
   * Loads starred mails (filtered from all mails).
   * Includes starred emails from all folders (inbox, sent, drafts, etc.)
   */
  private loadStarred(): void {
    this.isLoading = true;
    this.mailService.getMails().subscribe({
      next: (data) => {
        this.applyStarredState(data);
        // Filter to only show starred emails
        this.mails = data.filter(m => m.starred);
        this.filteredMails = [...this.mails];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error loading starred mails';
        this.isLoading = false;
      }
    });
  }

  /**
   * Loads archived mails only.
   */
  private loadArchived(): void {
    this.isLoading = true;
    this.mailService.getMails().subscribe({
      next: (data) => {
        this.applyStarredState(data);
        // Filter to only show archived emails
        const archivedIds = this.getArchivedMailIds();
        this.mails = data.filter(mail => mail.id && archivedIds.includes(mail.id));
        this.filteredMails = [...this.mails];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error loading archived mails';
        this.isLoading = false;
      }
    });
  }

  /**
   * Loads all mails (including archived).
   */
  private loadAll(): void {
    this.isLoading = true;
    this.mailService.getMails().subscribe({
      next: (data) => {
        this.applyStarredState(data);
        this.mails = data;
        this.filteredMails = [...data];
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Error loading all mails';
        this.isLoading = false;
      }
    });
  }

  /**
   * Refreshes the current folder by reloading its mails.
   */
  public refresh(): void {
    this.switchFolder(this.currentFolder);
  }

  /**
   * Selects or deselects all mails.
   * @param event The checkbox change event.
   */
  public toggleSelectAll(event: Event): void {
    const target = event.target as HTMLInputElement;
    const selected = target.checked;
    this.filteredMails.forEach(mail => mail.selected = selected);
    this.updateSelectedMails();
  }

  /**
   * Gets the sender name for display.
   * @param mail The mail to get the sender from.
   * @returns The formatted sender name.
   */
  public getSenderDisplay(mail: Mail): string {
    if (!mail.sender) return 'Unknown';
    const name = mail.sender.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Toggles the starred status of a mail.
   * @param mail The mail to toggle.
   * @param event The click event (stopped from propagating).
   */
  public toggleStar(mail: Mail, event: Event): void {
    event.stopPropagation();
    mail.starred = !mail.starred;

    // Persist to localStorage
    if (mail.id) {
      const starredIds = this.getStarredMailIds();
      if (mail.starred) {
        // Add to starred
        if (!starredIds.includes(mail.id)) {
          starredIds.push(mail.id);
        }
      } else {
        // Remove from starred
        const index = starredIds.indexOf(mail.id);
        if (index > -1) {
          starredIds.splice(index, 1);
        }
      }
      this.saveStarredMailIds(starredIds);
    }
  }

  /**
   * Gets the icon for the current folder.
   * @returns The emoji icon for the folder.
   */
  public getFolderIcon(): string {
    switch (this.currentFolder) {
      case 'inbox': return '📥';
      case 'starred': return '⭐';
      case 'sent': return '📤';
      case 'drafts': return '📝';
      case 'archived': return '📦';
      default: return '📥';
    }
  }

  /**
   * Gets the title for the current folder.
   * @returns The folder title.
   */
  public getFolderTitle(): string {
    switch (this.currentFolder) {
      case 'inbox': return 'Inbox';
      case 'starred': return 'Starred';
      case 'sent': return 'Sent';
      case 'drafts': return 'Drafts';
      case 'archived': return 'Archived';
      default: return 'Inbox';
    }
  }

  /**
   * Gets the empty state message for the current folder.
   * @returns The message to display when folder is empty.
   */
  public getEmptyMessage(): string {
    if (this.searchQuery) {
      return 'No results found';
    }
    switch (this.currentFolder) {
      case 'inbox': return 'No mails available';
      case 'starred': return 'No starred mails';
      case 'sent': return 'No sent mails';
      case 'drafts': return 'No drafts';
      case 'archived': return 'No archived mails';
      default: return 'No mails available';
    }
  }

  /**
   * Gets the empty state sub-message for the current folder.
   * @returns The sub-message to display when folder is empty.
   */
  public getEmptySubMessage(): string {
    if (this.searchQuery) {
      return `No mails match "${this.searchQuery}"`;
    }
    switch (this.currentFolder) {
      case 'inbox': return 'Your inbox is empty';
      case 'starred': return 'Star mails using the star icon';
      case 'sent': return 'You have not sent any mails yet';
      case 'drafts': return 'You have no saved drafts';
      case 'archived': return 'No archived mails yet';
      default: return '';
    }
  }

  /**
   * Logs out the user and navigates to the login page.
   */
  public logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Converts the technical status string to a readable label.
   * @param status The status from the backend (DRAFT, SENT, ERROR).
   * @returns The label for the UI.
   */
  public getStatusLabel(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'SENT': return 'Sent';
      case 'ERROR': return 'Error';
      default: return status;
    }
  }

  /**
   * Archives selected mails by marking them as archived in localStorage.
   * In a production system, this would call a backend API.
   */
  public archiveMails(): void {
    const selectedMails = this.filteredMails.filter(mail => mail.selected);
    if (selectedMails.length === 0) return;

    // Store archived mail IDs in localStorage
    const archivedIds = this.getArchivedMailIds();
    selectedMails.forEach(mail => {
      if (mail.id && !archivedIds.includes(mail.id)) {
        archivedIds.push(mail.id);
      }
    });
    this.saveArchivedMailIds(archivedIds);

    // Remove archived mails from current view
    this.mails = this.mails.filter(mail => !mail.selected);
    this.filteredMails = this.filteredMails.filter(mail => !mail.selected);

    // Mails removed from view (archived client-side)
  }

  /**
   * Marks selected mails as unread.
   * Updates the read status in localStorage.
   */
  public markAsUnread(): void {
    const selectedMails = this.filteredMails.filter(mail => mail.selected);
    if (selectedMails.length === 0) return;

    selectedMails.forEach(mail => {
      mail.read = false;
      mail.selected = false;
    });

    // Persist read status to localStorage
    const readIds = this.getReadMailIds();
    selectedMails.forEach(mail => {
      if (mail.id) {
        const index = readIds.indexOf(mail.id);
        if (index > -1) {
          readIds.splice(index, 1);
        }
      }
    });
    this.saveReadMailIds(readIds);

    this.updateSelectedMails();
  }

  /**
   * Gets the list of archived mail IDs from localStorage.
   * @returns Array of archived mail IDs.
   */
  private getArchivedMailIds(): number[] {
    const stored = localStorage.getItem('archived_mails');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Saves the archived mail IDs to localStorage.
   * @param ids Array of mail IDs to save as archived.
   */
  private saveArchivedMailIds(ids: number[]): void {
    localStorage.setItem('archived_mails', JSON.stringify(ids));
  }

  /**
   * Gets the list of read mail IDs from localStorage.
   * @returns Array of read mail IDs.
   */
  private getReadMailIds(): number[] {
    const stored = localStorage.getItem('read_mails');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Saves the read mail IDs to localStorage.
   * @param ids Array of mail IDs to save as read.
   */
  private saveReadMailIds(ids: number[]): void {
    localStorage.setItem('read_mails', JSON.stringify(ids));
  }

  /**
   * Gets a snippet of the mail content for preview.
   * @param mail The mail to get the snippet from.
   * @returns The first 100 characters of the content.
   */
  public getMailSnippet(mail: Mail): string {
    if (!mail.content) return '';
    return mail.content.substring(0, 100);
  }

  /**
   * Formats a date in a user-friendly style.
   * @param date The date to format.
   * @returns The formatted date string.
   */
  public formatDate(date: string | Date | undefined): string {
    if (!date) return '-';

    const mailDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (mailDate.toDateString() === today.toDateString()) {
      return mailDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (mailDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (mailDate.getFullYear() === today.getFullYear()) {
      return mailDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
    } else {
      return mailDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    }
  }
}

