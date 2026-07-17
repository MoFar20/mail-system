import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MailService, ServiceError } from '../../services/mail.service';
import { AuthService } from '../../services/auth.service';
import { Mail } from '../../models/mail.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Component for displaying detailed view of a single email.
 * Allows reading content, viewing recipients, and
 * triggering the send process for drafts.
 *
 * Memory Management: Uses takeUntil pattern for all observable subscriptions.
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

  /** Subject for managing observable unsubscriptions. */
  private destroy$ = new Subject<void>();

  /** Bound method for closing dropdown on outside click. */
  private closeDropdownOnOutsideClick = (): void => {
    this.showDetailsDropdown = false;
    document.removeEventListener('click', this.closeDropdownOnOutsideClick);
  };

  constructor(
    private route: ActivatedRoute,
    private mailService: MailService,
    private authService: AuthService,
    private router: Router
  ) {}

  public ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUserEmail() || '';
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.loadMail(id);
    }
  }

  private loadMail(id: number): void {
    this.mailService.getMail(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: Mail) => this.mail = data,
        error: (err: ServiceError) => this.errorMessage = err.message || 'Mail could not be loaded.'
      });
  }

  public onSend(): void {
    if (this.mail && this.mail.id && this.mail.status === 'DRAFT') {
      this.isSending = true;
      this.errorMessage = '';
      this.successMessage = '';

      this.mailService.sendMail(this.mail.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updatedMail) => {
            this.mail = updatedMail;
            this.isSending = false;
            if (updatedMail.status === 'SENT') {
              this.successMessage = 'Email sent successfully!';
            } else if (updatedMail.status === 'ERROR') {
              this.errorMessage = 'Sending failed. Please try again later.';
            }
          },
          error: (err: ServiceError) => {
            this.isSending = false;
            this.errorMessage = err.message || 'Error during send operation.';
          }
        });
    }
  }

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

  public onDelete(): void {
    if (this.mail && this.mail.id && confirm('Do you really want to delete this mail?')) {
      this.mailService.deleteMail(this.mail.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.router.navigate(['/mails']),
          error: (err: ServiceError) => this.errorMessage = err.message || 'Deletion failed.'
        });
    }
  }

  public onEdit(): void {
    if (this.mail && this.mail.id && this.mail.status === 'DRAFT') {
      this.router.navigate(['/compose', this.mail.id]);
    }
  }

  private getArchivedMailIds(): number[] {
    const stored = localStorage.getItem('archived_mails');
    return stored ? JSON.parse(stored) : [];
  }

  private saveArchivedMailIds(ids: number[]): void {
    localStorage.setItem('archived_mails', JSON.stringify(ids));
  }

  private getReadMailIds(): number[] {
    const stored = localStorage.getItem('read_mails');
    return stored ? JSON.parse(stored) : [];
  }

  private saveReadMailIds(ids: number[]): void {
    localStorage.setItem('read_mails', JSON.stringify(ids));
  }

  public isCurrentUserSender(): boolean {
    if (!this.mail || !this.currentUserEmail) return false;
    return this.mail.sender.toLowerCase() === this.currentUserEmail.toLowerCase();
  }

  public getInitials(email: string | undefined): string {
    if (!email) return '?';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  }

  public getStatusText(status: string): string {
    switch (status) {
      case 'DRAFT': return 'Draft';
      case 'SENT': return 'Sent';
      case 'ERROR': return 'Send Error';
      default: return status;
    }
  }

  public getRecipientsByType(type: string): string {
    if (!this.mail?.recipients) return '';
    return this.mail.recipients
      .filter(r => r.type === type)
      .map(r => r.address)
      .join(', ');
  }

  public hasRecipientType(type: string): boolean {
    if (!this.mail?.recipients) return false;
    return this.mail.recipients.some(r => r.type === type);
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  public toggleDetailsDropdown(event: Event): void {
    event.stopPropagation();
    this.showDetailsDropdown = !this.showDetailsDropdown;

    if (this.showDetailsDropdown) {
      setTimeout(() => {
        document.addEventListener('click', this.closeDropdownOnOutsideClick);
      }, 0);
    } else {
      document.removeEventListener('click', this.closeDropdownOnOutsideClick);
    }
  }

  public getSenderName(email: string | undefined): string {
    if (!email) return 'Unknown';
    const namePart = email.split('@')[0];
    return namePart.charAt(0).toUpperCase() + namePart.slice(1);
  }

  public getRecipientsOfType(type: string): string[] {
    if (!this.mail?.recipients) return [];
    return this.mail.recipients
      .filter(r => r.type === type)
      .map(r => r.address);
  }

  public downloadAttachment(attachment: { id?: number; fileName: string; mimeType: string }): void {
    if (!this.mail?.id || !attachment.id) return;

    this.mailService.downloadAttachment(this.mail.id, attachment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.fileName;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err: ServiceError) => {
          this.errorMessage = err.message || 'Failed to download attachment.';
        }
      });
  }

  public ngOnDestroy(): void {
    document.removeEventListener('click', this.closeDropdownOnOutsideClick);
    this.destroy$.next();
    this.destroy$.complete();
  }
}
