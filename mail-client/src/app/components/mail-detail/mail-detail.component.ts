import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MailService } from '../../services/mail.service';
import { AuthService } from '../../services/auth.service';
import { Mail } from '../../models/mail.model';

/**
 * Component for displaying detailed view of a single email.
 * Allows reading content, viewing recipients, and
 * triggering the send process for drafts.
 */
@Component({
  selector: 'app-mail-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './mail-detail.component.html',
  styleUrl: './mail-detail.component.css'
})
export class MailDetailComponent implements OnInit, OnDestroy {
  /** The currently displayed email or null while loading. */
  public mail: Mail | null = null;
  /** Error message for API issues. */
  public errorMessage: string = '';
  /** Loading state for send operation. */
  public isSending: boolean = false;
  /** Success message for successful operations. */
  public successMessage: string = '';
  /** Controls visibility of the email details dropdown. */
  public showDetailsDropdown: boolean = false;
  /** Current user's email address. */
  public currentUserEmail: string = '';

  /**
   * Creates an instance of MailDetailComponent.
   * @param route Allows access to the mail ID in the URL.
   * @param mailService Service for communication with the backend.
   * @param authService Service for authentication.
   * @param router Enables navigation after actions (e.g., deletion).
   */
  constructor(
    private route: ActivatedRoute,
    private mailService: MailService,
    private authService: AuthService,
    private router: Router
  ) {}

  /**
   * Initializes the component and loads mail data based on the ID.
   */
  public ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUserEmail() || '';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadMail(id);
    }
  }

  /**
   * Loads the mail details from the server.
   * @param id The ID of the mail to load.
   */
  private loadMail(id: number): void {
    this.mailService.getMail(id).subscribe({
      next: (data: Mail) => this.mail = data,
      error: () => this.errorMessage = 'Mail could not be loaded.'
    });
  }

  /**
   * Sends the current mail (mocked transmission).
   * Only possible if the mail has status 'DRAFT'.
   */
  public onSend(): void {
    if (this.mail && this.mail.id && this.mail.status === 'DRAFT') {
      this.isSending = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.mailService.sendMail(this.mail.id).subscribe({
        next: (updatedMail) => {
          this.mail = updatedMail;
          this.isSending = false;
          if (updatedMail.status === 'SENT') {
            this.successMessage = 'Email sent successfully!';
          } else if (updatedMail.status === 'ERROR') {
            this.errorMessage = 'Sending failed. Please try again later.';
          }
        },
        error: () => {
          this.isSending = false;
          this.errorMessage = 'Error during send operation.';
        }
      });
    }
  }

  /**
   * Archives the current mail.
   * Archives mail by storing it in localStorage and navigating back to mail list.
   */
  public onArchive(): void {
    if (this.mail && this.mail.id) {
      const archivedIds = this.getArchivedMailIds();
      if (!archivedIds.includes(this.mail.id)) {
        archivedIds.push(this.mail.id);
        this.saveArchivedMailIds(archivedIds);
      }
      this.successMessage = 'Mail archived successfully';
      setTimeout(() => this.router.navigate(['/mails']), 1000);
    }
  }

  /**
   * Marks the current mail as unread.
   */
  public onMarkAsUnread(): void {
    if (this.mail && this.mail.id) {
      const readIds = this.getReadMailIds();
      const index = readIds.indexOf(this.mail.id);
      if (index > -1) {
        readIds.splice(index, 1);
        this.saveReadMailIds(readIds);
      }
      this.successMessage = 'Mail marked as unread';
      setTimeout(() => this.router.navigate(['/mails']), 1000);
    }
  }

  /**
   * Deletes the current mail after confirmation.
   */
  public onDelete(): void {
    if (this.mail && this.mail.id && confirm('Do you really want to delete this mail?')) {
      this.mailService.deleteMail(this.mail.id).subscribe({
        next: () => this.router.navigate(['/mails']),
        error: () => this.errorMessage = 'Deletion failed.'
      });
    }
  }

  /**
   * Navigates to the edit page for drafts.
   * Only possible if the mail has status 'DRAFT'.
   */
  public onEdit(): void {
    if (this.mail && this.mail.id && this.mail.status === 'DRAFT') {
      this.router.navigate(['/compose', this.mail.id]);
    }
  }

  /**
   * Gets archived mail IDs from localStorage.
   */
  private getArchivedMailIds(): number[] {
    const stored = localStorage.getItem('archived_mails');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Saves archived mail IDs to localStorage.
   */
  private saveArchivedMailIds(ids: number[]): void {
    localStorage.setItem('archived_mails', JSON.stringify(ids));
  }

  /**
   * Gets read mail IDs from localStorage.
   */
  private getReadMailIds(): number[] {
    const stored = localStorage.getItem('read_mails');
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Saves read mail IDs to localStorage.
   */
  private saveReadMailIds(ids: number[]): void {
    localStorage.setItem('read_mails', JSON.stringify(ids));
  }

  /**
   * Checks if the current user is the sender of this email.
   * @returns True if current user sent this email, false otherwise.
   */
  public isCurrentUserSender(): boolean {
    if (!this.mail || !this.currentUserEmail) return false;
    return this.mail.sender.toLowerCase() === this.currentUserEmail.toLowerCase();
  }

  /**
   * Gets initials from email address for avatar display.
   * @param email The email address to extract initials from.
   * @returns The first two characters of the username in uppercase.
   */
  public getInitials(email: string | undefined): string {
    if (!email) return '?';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Gets localized status text for display.
   * @param status The status from the backend (DRAFT, SENT, ERROR).
   * @returns The localized status text.
   */
  public getStatusText(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'SENT': return 'Sent';
      case 'ERROR': return 'Send Error';
      default: return status;
    }
  }

  /**
   * Gets recipients of a specific type as a comma-separated string.
   * @param type The recipient type (TO, CC, BCC).
   * @returns Comma-separated list of email addresses.
   */
  public getRecipientsByType(type: string): string {
    if (!this.mail?.recipients) return '';
    return this.mail.recipients
      .filter(r => r.type === type)
      .map(r => r.address)
      .join(', ');
  }

  /**
   * Checks if there are recipients of a specific type.
   * @param type The recipient type to check.
   * @returns True if at least one recipient of the type exists.
   */
  public hasRecipientType(type: string): boolean {
    if (!this.mail?.recipients) return false;
    return this.mail.recipients.some(r => r.type === type);
  }

  /**
   * Formats file size in human-readable format.
   * @param bytes The size in bytes.
   * @returns Formatted string like "1.5 KB".
   */
  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Toggles the visibility of the email details dropdown popup.
   * @param event Click event to stop propagation.
   */
  public toggleDetailsDropdown(event: Event): void {
    event.stopPropagation();
    this.showDetailsDropdown = !this.showDetailsDropdown;

    // Add click listener to close dropdown when clicking outside
    if (this.showDetailsDropdown) {
      setTimeout(() => {
        document.addEventListener('click', this.closeDropdownOnOutsideClick);
      }, 0);
    } else {
      document.removeEventListener('click', this.closeDropdownOnOutsideClick);
    }
  }

  /** Bound method for closing dropdown on outside click. */
  private closeDropdownOnOutsideClick = (): void => {
    this.showDetailsDropdown = false;
    document.removeEventListener('click', this.closeDropdownOnOutsideClick);
  };

  /**
   * Gets sender name from email address.
   * @param email The sender's email address.
   * @returns The name part before @ capitalized.
   */
  public getSenderName(email: string | undefined): string {
    if (!email) return 'Unknown';
    const namePart = email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }

  /**
   * Gets array of recipients of a specific type.
   * @param type The recipient type (TO, CC, BCC).
   * @returns Array of email addresses.
   */
  public getRecipientsOfType(type: string): string[] {
    if (!this.mail?.recipients) return [];
    return this.mail.recipients
      .filter(r => r.type === type)
      .map(r => r.address);
  }

  /**
   * Cleanup on component destroy.
   * Removes event listeners to prevent memory leaks.
   */
  public ngOnDestroy(): void {
    document.removeEventListener('click', this.closeDropdownOnOutsideClick);
  }

  /**
   * Downloads an attachment file from the server.
   * Creates a temporary link element to trigger the browser download.
   * @param attachment The attachment to download.
   */
  public downloadAttachment(attachment: { id?: number; fileName: string; mimeType: string }): void {
    if (!this.mail?.id || !attachment.id) return;

    this.mailService.downloadAttachment(this.mail.id, attachment.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = attachment.fileName;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = 'Failed to download attachment.';
      }
    });
  }
}

