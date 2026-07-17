import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MailService, ServiceError } from '../../services/mail.service';
import { Mail, MailRecipient, AttachmentMetadata } from '../../models/mail.model';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * Build mail data object to ensure type safety
 */
export interface MailDataPayload {
  sender: string;
  subject: string;
  content: string;
  recipients: MailRecipient[];
}

/**
 * Component for creating and editing emails.
 * Allows dynamic input of recipients (To, Cc, Bcc) and
 * saves the message as a draft in the backend.
 *
 * Memory Management: Uses takeUntil pattern for all observable subscriptions
 * and implements OnDestroy for proper cleanup.
 */
@Component({
  selector: 'app-mail-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mail-editor.component.html',
  styleUrl: './mail-editor.component.css'
})
export class MailEditorComponent implements OnInit, OnDestroy {
  /** Main form for email creation. */
  public mailForm: FormGroup;
  /** Error message for failed operations. */
  public errorMessage: string = '';
  /** Success message for successful operations. */
  public successMessage: string = '';
  /** Loading state indicator. */
  public isLoading: boolean = false;
  /** Current user's email address. */
  private currentUserEmail: string = '';
  /** Toggle visibility of CC field. */
  public showCc: boolean = false;
  /** Toggle visibility of BCC field. */
  public showBcc: boolean = false;
  /** ID of the mail being edited (null for new mails). */
  public editingMailId: number | null = null;
  /** Whether we are in edit mode. */
  public isEditMode: boolean = false;
  /** Files selected for attachment (not yet uploaded). */
  public pendingFiles: File[] = [];
  /** Existing attachments loaded from the server (in edit mode). */
  public existingAttachments: AttachmentMetadata[] = [];
  /** Whether attachments are currently being uploaded. */
  public isUploadingAttachments: boolean = false;
  /** Allowed MIME types for attachments. */
  public readonly allowedFileTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'text/plain'
  ];
  /** Maximum file size in bytes (10 MB). */
  public readonly maxFileSize = 10 * 1024 * 1024;
  /** Reference to the hidden file input element. */
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  /** Subject for managing observable unsubscriptions. */
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private mailService: MailService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.mailForm = this.fb.group({
      to: this.fb.array([this.fb.control('', [Validators.required, Validators.email])]),
      cc: this.fb.array([]),
      bcc: this.fb.array([]),
      replyTo: this.fb.array([]),
      subject: ['', [Validators.required, Validators.maxLength(255)]],
      content: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUserEmail() || 'student@thm.de';

    const mailId = this.route.snapshot.paramMap.get('id');
    if (mailId) {
      this.editingMailId = Number(mailId);
      this.isEditMode = true;
      this.loadMailForEditing(this.editingMailId);
    }
  }

  private loadMailForEditing(id: number): void {
    this.isLoading = true;
    this.mailService.getMail(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (mail) => {
          if (mail.status !== 'DRAFT') {
            this.errorMessage = 'Only drafts can be edited.';
            this.isLoading = false;
            return;
          }
          this.populateFormWithMail(mail);
          this.isLoading = false;
        },
        error: (err: ServiceError) => {
          this.errorMessage = err.message || 'Mail could not be loaded.';
          this.isLoading = false;
        }
      });
  }

  private populateFormWithMail(mail: Mail): void {
    this.mailForm.patchValue({
      subject: mail.subject,
      content: mail.content
    });

    const toRecipients = mail.recipients?.filter(r => r.type === 'TO') || [];
    this.toEmails.clear();
    if (toRecipients.length > 0) {
      toRecipients.forEach(r => {
        this.toEmails.push(this.fb.control(r.address, [Validators.required, Validators.email]));
      });
    } else {
      this.toEmails.push(this.fb.control('', [Validators.required, Validators.email]));
    }

    const ccRecipients = mail.recipients?.filter(r => r.type === 'CC') || [];
    this.ccEmails.clear();
    if (ccRecipients.length > 0) {
      this.showCc = true;
      ccRecipients.forEach(r => {
        this.ccEmails.push(this.fb.control(r.address, [Validators.required, Validators.email]));
      });
    }

    const bccRecipients = mail.recipients?.filter(r => r.type === 'BCC') || [];
    this.bccEmails.clear();
    if (bccRecipients.length > 0) {
      this.showBcc = true;
      bccRecipients.forEach(r => {
        this.bccEmails.push(this.fb.control(r.address, [Validators.required, Validators.email]));
      });
    }

    this.existingAttachments = mail.attachments || [];
  }

  get toEmails(): FormArray { return this.mailForm.get('to') as FormArray; }
  get ccEmails(): FormArray { return this.mailForm.get('cc') as FormArray; }
  get bccEmails(): FormArray { return this.mailForm.get('bcc') as FormArray; }
  get replyToEmails(): FormArray { return this.mailForm.get('replyTo') as FormArray; }

  public addRecipient(type: 'to' | 'cc' | 'bcc' | 'replyTo'): void {
    const control = this.fb.control('', [Validators.required, Validators.email]);
    (this.mailForm.get(type) as FormArray).push(control);
  }

  public removeRecipient(type: 'to' | 'cc' | 'bcc' | 'replyTo', index: number): void {
    const formArray = this.mailForm.get(type) as FormArray;
    if (formArray.length > 1 || type !== 'to') {
      formArray.removeAt(index);
    }
  }

  private buildRecipients(): MailRecipient[] {
    const recipients: MailRecipient[] = [];
    const formValue = this.mailForm.value;

    formValue.to.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'TO' });
    });

    formValue.cc.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'CC' });
    });

    formValue.bcc.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'BCC' });
    });

    formValue.replyTo.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'REPLY_TO' });
    });

    return recipients;
  }

  private hasValidRecipients(): boolean {
    const recipients = this.buildRecipients();
    return recipients.some(r => r.type === 'TO' || r.type === 'CC' || r.type === 'BCC');
  }

  private validateForm(): boolean {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.mailForm.valid) {
      if (this.mailForm.get('subject')?.hasError('required')) {
        this.errorMessage = 'Subject is required and cannot be empty.';
      } else if (this.mailForm.get('subject')?.hasError('maxlength')) {
        this.errorMessage = 'Subject must not exceed 255 characters.';
      } else if (this.mailForm.get('content')?.hasError('required')) {
        this.errorMessage = 'Email content is required and cannot be empty.';
      } else if (this.toEmails.controls.some(c => c.hasError('email'))) {
        this.errorMessage = 'Please provide valid email addresses for all recipients.';
      } else {
        this.errorMessage = 'Please fill in all required fields correctly.';
      }
      return false;
    }

    if (!this.hasValidRecipients()) {
      this.errorMessage = 'At least one recipient (To, Cc, or Bcc) is required.';
      return false;
    }

    return true;
  }

  private buildMailData(): MailDataPayload {
    const formValue = this.mailForm.value;
    return {
      sender: this.currentUserEmail,
      subject: formValue.subject,
      content: formValue.content,
      recipients: this.buildRecipients()
    };
  }

  private handleSaveSuccess(message: string, delayMs: number = 1000): void {
    this.successMessage = message;
    this.isLoading = false;
    setTimeout(() => this.router.navigate(['/mails']), delayMs);
  }

  private handleError(err: ServiceError, defaultMessage: string): void {
    this.isLoading = false;
    this.errorMessage = err.message || defaultMessage;
  }

  public onSave(): void {
    if (!this.validateForm()) return;

    this.isLoading = true;
    const mailData = this.buildMailData();

    if (this.isEditMode && this.editingMailId) {
      this.mailService.updateMail(this.editingMailId, mailData as any)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.uploadPendingAttachments(this.editingMailId!, '✅ Draft updated successfully!'),
          error: (err: ServiceError) => this.handleError(err, 'Failed to update draft.')
        });
    } else {
      this.mailService.createMail(mailData as any)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (createdMail) => {
            if (createdMail.id) {
              this.uploadPendingAttachments(createdMail.id, '✅ Draft saved successfully!');
            } else {
              this.handleSaveSuccess('✅ Draft saved successfully!');
            }
          },
          error: (err: ServiceError) => this.handleError(err, 'Failed to save draft.')
        });
    }
  }

  private sendMailById(mailId: number): void {
    this.mailService.sendMail(mailId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sentMail) => {
          if (sentMail.status === 'SENT') {
            this.handleSaveSuccess('✅ Email sent successfully!', 1500);
          } else {
            this.errorMessage = '⚠️ Transmission error. Email saved as draft.';
            this.isLoading = false;
            setTimeout(() => this.router.navigate(['/mails']), 2000);
          }
        },
        error: (err: ServiceError) => this.handleError(err, 'Failed to send email. Saved as draft.')
      });
  }

  public onSaveAndSend(): void {
    if (!this.validateForm()) return;

    this.isLoading = true;
    const mailData = this.buildMailData();

    if (this.isEditMode && this.editingMailId) {
      this.mailService.updateMail(this.editingMailId, mailData as any)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => this.uploadPendingAttachmentsThenSend(this.editingMailId!),
          error: (err: ServiceError) => this.handleError(err, 'Failed to update email before sending.')
        });
    } else {
      this.mailService.createMail(mailData as any)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (createdMail) => {
            if (createdMail.id) {
              this.uploadPendingAttachmentsThenSend(createdMail.id);
            } else {
              this.handleError({ message: 'No ID returned.', status: 500}, 'Failed to create.');
            }
          },
          error: (err: ServiceError) => this.handleError(err, 'Failed to create email.')
        });
    }
  }

  public openFileDialog(): void {
    this.fileInput?.nativeElement?.click();
  }

  public onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.errorMessage = '';

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      if (!this.allowedFileTypes.includes(file.type)) {
        this.errorMessage = `File "${file.name}" is not allowed.`;
        continue;
      }

      if (file.size > this.maxFileSize) {
        this.errorMessage = `File "${file.name}" exceeds the maximum size.`;
        continue;
      }

      const isDuplicate = this.pendingFiles.some(f => f.name === file.name && f.size === file.size);
      if (!isDuplicate) {
        this.pendingFiles.push(file);
      }
    }
    input.value = '';
  }

  public removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  public removeExistingAttachment(attachment: AttachmentMetadata, index: number): void {
    if (!this.editingMailId || !attachment.id) return;

    this.mailService.deleteAttachment(this.editingMailId, attachment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.existingAttachments.splice(index, 1);
        },
        error: (err: ServiceError) => {
          this.errorMessage = err.message || 'Failed to remove attachment.';
        }
      });
  }

  private uploadPendingAttachments(mailId: number, successMessage: string): void {
    if (this.pendingFiles.length === 0) {
      this.handleSaveSuccess(successMessage);
      return;
    }

    this.isUploadingAttachments = true;
    let completedCount = 0;
    let failedCount = 0;
    const totalFiles = this.pendingFiles.length;

    this.pendingFiles.forEach((file) => {
      this.mailService.uploadAttachment(mailId, file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            completedCount++;
            if (completedCount + failedCount === totalFiles) {
              this.isUploadingAttachments = false;
              this.pendingFiles = [];
              if (failedCount > 0) {
                this.handleSaveSuccess(`${successMessage} (${failedCount} failed)`);
              } else {
                this.handleSaveSuccess(successMessage);
              }
            }
          },
          error: () => {
            failedCount++;
            if (completedCount + failedCount === totalFiles) {
              this.isUploadingAttachments = false;
              this.pendingFiles = [];
              if (completedCount > 0 || failedCount === totalFiles) {
                this.handleSaveSuccess(`${successMessage} (${failedCount} failed)`);
              }
            }
          }
        });
    });
  }

  private uploadPendingAttachmentsThenSend(mailId: number): void {
    if (this.pendingFiles.length === 0) {
      this.sendMailById(mailId);
      return;
    }

    this.isUploadingAttachments = true;
    let completedCount = 0;
    let failedCount = 0;
    const totalFiles = this.pendingFiles.length;

    this.pendingFiles.forEach((file) => {
      this.mailService.uploadAttachment(mailId, file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            completedCount++;
            if (completedCount + failedCount === totalFiles) {
              this.isUploadingAttachments = false;
              this.pendingFiles = [];
              this.sendMailById(mailId);
            }
          },
          error: () => {
            failedCount++;
            if (completedCount + failedCount === totalFiles) {
              this.isUploadingAttachments = false;
              this.pendingFiles = [];
              this.sendMailById(mailId);
            }
          }
        });
    });
  }

  public formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  public get totalAttachmentCount(): number {
    return this.existingAttachments.length + this.pendingFiles.length;
  }

  public onCancel(): void {
    this.router.navigate(['/mails']);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
