import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MailService } from '../../services/mail.service';
import { Mail, MailRecipient, AttachmentMetadata } from '../../models/mail.model';
import { AuthService } from '../../services/auth.service';

/**
 * Component for creating and editing emails.
 * Allows dynamic input of recipients (To, Cc, Bcc) and
 * saves the message as a draft in the backend.
 */
@Component({
  selector: 'app-mail-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './mail-editor.component.html',
  styleUrl: './mail-editor.component.css'
})
export class MailEditorComponent implements OnInit {
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

  /**
   * Initializes the editor and prepares the reactive form.
   * @param fb Service for creating form groups.
   * @param mailService Service for API communication.
   * @param authService Service for authentication.
   * @param router Service for navigation after saving.
   * @param route Service for accessing route parameters.
   */
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

  /**
   * Lifecycle hook - initializes form and loads mail data if editing.
   */
  ngOnInit(): void {
    this.currentUserEmail = this.authService.getCurrentUserEmail() || 'student@thm.de';

    // Check if we're editing an existing mail
    const mailId = this.route.snapshot.paramMap.get('id');
    if (mailId) {
      this.editingMailId = Number(mailId);
      this.isEditMode = true;
      this.loadMailForEditing(this.editingMailId);
    }
  }

  /**
   * Loads an existing mail for editing.
   * @param id The ID of the mail to load.
   */
  private loadMailForEditing(id: number): void {
    this.isLoading = true;
    this.mailService.getMail(id).subscribe({
      next: (mail) => {
        if (mail.status !== 'DRAFT') {
          this.errorMessage = 'Only drafts can be edited.';
          this.isLoading = false;
          return;
        }
        this.populateFormWithMail(mail);
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Mail could not be loaded.';
        this.isLoading = false;
      }
    });
  }

  /**
   * Populates the form with existing mail data.
   * @param mail The mail to populate the form with.
   */
  private populateFormWithMail(mail: Mail): void {
    // Set subject and content
    this.mailForm.patchValue({
      subject: mail.subject,
      content: mail.content
    });

    // Clear and populate TO recipients
    const toRecipients = mail.recipients?.filter(r => r.type === 'TO') || [];
    this.toEmails.clear();
    if (toRecipients.length > 0) {
      toRecipients.forEach(r => {
        this.toEmails.push(this.fb.control(r.address, [Validators.required, Validators.email]));
      });
    } else {
      this.toEmails.push(this.fb.control('', [Validators.required, Validators.email]));
    }

    // Clear and populate CC recipients
    const ccRecipients = mail.recipients?.filter(r => r.type === 'CC') || [];
    this.ccEmails.clear();
    if (ccRecipients.length > 0) {
      this.showCc = true;
      ccRecipients.forEach(r => {
        this.ccEmails.push(this.fb.control(r.address, [Validators.required, Validators.email]));
      });
    }

    // Clear and populate BCC recipients
    const bccRecipients = mail.recipients?.filter(r => r.type === 'BCC') || [];
    this.bccEmails.clear();
    if (bccRecipients.length > 0) {
      this.showBcc = true;
      bccRecipients.forEach(r => {
        this.bccEmails.push(this.fb.control(r.address, [Validators.required, Validators.email]));
      });
    }

    // Load existing attachments
    this.existingAttachments = mail.attachments || [];
  }

  /** @returns The FormArray for the main recipients (To). */
  get toEmails(): FormArray { return this.mailForm.get('to') as FormArray; }
  /** @returns The FormArray for the copy recipients (Cc). */
  get ccEmails(): FormArray { return this.mailForm.get('cc') as FormArray; }
  /** @returns The FormArray for the blind copy recipients (Bcc). */
  get bccEmails(): FormArray { return this.mailForm.get('bcc') as FormArray; }
  /** @returns The FormArray for the Reply-To addresses. */
  get replyToEmails(): FormArray { return this.mailForm.get('replyTo') as FormArray; }

  /**
   * Adds a new email field to a recipient list.
   * @param type The type of list ('to', 'cc', 'bcc', or 'replyTo').
   */
  public addRecipient(type: 'to' | 'cc' | 'bcc' | 'replyTo'): void {
    const control = this.fb.control('', [Validators.required, Validators.email]);
    (this.mailForm.get(type) as FormArray).push(control);
  }

  /**
   * Removes an email field from a recipient list.
   * @param type The type of list.
   * @param index The index of the field to remove.
   */
  public removeRecipient(type: 'to' | 'cc' | 'bcc' | 'replyTo', index: number): void {
    const formArray = this.mailForm.get(type) as FormArray;
    if (formArray.length > 1 || type !== 'to') {
      formArray.removeAt(index);
    }
  }

  /**
   * Builds the recipients array from form values.
   * @returns Array of MailRecipient objects.
   */
  private buildRecipients(): MailRecipient[] {
    const recipients: MailRecipient[] = [];
    const formValue = this.mailForm.value;

    // Add TO recipients
    formValue.to.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'TO' });
    });

    // Add CC recipients
    formValue.cc.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'CC' });
    });

    // Add BCC recipients
    formValue.bcc.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'BCC' });
    });

    // Add REPLY_TO addresses
    formValue.replyTo.filter((email: string) => email?.trim()).forEach((email: string) => {
      recipients.push({ address: email.trim(), type: 'REPLY_TO' });
    });

    return recipients;
  }

  /**
   * Validates that at least one recipient (TO, CC, or BCC) exists.
   * @returns True if valid, false otherwise.
   */
  private hasValidRecipients(): boolean {
    const recipients = this.buildRecipients();
    return recipients.some(r => r.type === 'TO' || r.type === 'CC' || r.type === 'BCC');
  }

  /**
   * Validates the form and displays appropriate error messages.
   * @returns True if form is valid, false otherwise.
   */
  private validateForm(): boolean {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.mailForm.valid) {
      // Provide specific error messages based on validation failures
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
      this.errorMessage = 'At least one recipient (To, Cc, or Bcc) is required. Please add a recipient email address.';
      return false;
    }

    return true;
  }

  /**
   * Builds mail data object from form values.
   * @returns Mail data object ready for API submission.
   */
  private buildMailData(): any {
    const formValue = this.mailForm.value;
    return {
      sender: this.currentUserEmail,
      subject: formValue.subject,
      content: formValue.content,
      recipients: this.buildRecipients()
    };
  }

  /**
   * Handles successful save operation.
   * @param message Success message to display.
   * @param delayMs Delay before navigation in milliseconds.
   */
  private handleSaveSuccess(message: string, delayMs: number = 1000): void {
    this.successMessage = message;
    this.isLoading = false;
    setTimeout(() => this.router.navigate(['/mails']), delayMs);
  }

  /**
   * Handles error during save/send operations.
   * @param err Error object from HTTP response.
   * @param defaultMessage Default error message if none provided in response.
   */
  private handleError(err: any, defaultMessage: string): void {
    this.isLoading = false;
    // Extract detailed error message from backend if available
    if (err.error?.message) {
      this.errorMessage = err.error.message;
    } else if (err.error?.error) {
      this.errorMessage = err.error.error;
    } else if (err.message) {
      this.errorMessage = err.message;
    } else {
      this.errorMessage = defaultMessage;
    }
  }

  /**
   * Saves the form data as a new draft or updates an existing draft.
   * Status is set to 'DRAFT' automatically.
   * After save, uploads any pending file attachments.
   */
  public onSave(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    const mailData = this.buildMailData();

    if (this.isEditMode && this.editingMailId) {
      this.mailService.updateMail(this.editingMailId, mailData).subscribe({
        next: () => this.uploadPendingAttachments(this.editingMailId!, '✅ Draft updated successfully!'),
        error: (err) => this.handleError(err, 'Failed to update draft. Please try again.')
      });
    } else {
      this.mailService.createMail(mailData).subscribe({
        next: (createdMail) => {
          if (createdMail.id) {
            this.uploadPendingAttachments(createdMail.id, '✅ Draft saved successfully!');
          } else {
            this.handleSaveSuccess('✅ Draft saved successfully!');
          }
        },
        error: (err) => this.handleError(err, 'Failed to save draft. Please try again.')
      });
    }
  }

  /**
   * Sends a mail after it has been saved.
   * @param mailId The ID of the mail to send.
   */
  private sendMailById(mailId: number): void {
    this.mailService.sendMail(mailId).subscribe({
      next: (sentMail) => {
        if (sentMail.status === 'SENT') {
          this.handleSaveSuccess('✅ Email sent successfully!', 1500);
        } else if (sentMail.status === 'ERROR') {
          this.errorMessage = '⚠️ Sending failed due to transmission error. Email saved as draft.';
          this.isLoading = false;
          setTimeout(() => this.router.navigate(['/mails']), 2000);
        } else {
          this.errorMessage = '⚠️ Unexpected status. Email saved as draft.';
          this.isLoading = false;
        }
      },
      error: (err) => this.handleError(err, 'Failed to send email. Email saved as draft.')
    });
  }

  /**
   * Saves the draft and immediately sends it.
   * Uploads pending attachments before sending.
   * Works for both new mails and existing drafts.
   */
  public onSaveAndSend(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isLoading = true;
    const mailData = this.buildMailData();

    if (this.isEditMode && this.editingMailId) {
      this.mailService.updateMail(this.editingMailId, mailData).subscribe({
        next: () => this.uploadPendingAttachmentsThenSend(this.editingMailId!),
        error: (err) => this.handleError(err, 'Failed to update email before sending.')
      });
    } else {
      this.mailService.createMail(mailData).subscribe({
        next: (createdMail) => {
          if (createdMail.id) {
            this.uploadPendingAttachmentsThenSend(createdMail.id);
          } else {
            this.handleError({}, 'Failed to create email. No ID returned.');
          }
        },
        error: (err) => this.handleError(err, 'Failed to create email.')
      });
    }
  }

  // ==================== ATTACHMENT MANAGEMENT ====================

  /**
   * Opens the file input dialog for selecting attachments.
   */
  public openFileDialog(): void {
    this.fileInput?.nativeElement?.click();
  }

  /**
   * Handles file selection from the file input.
   * Validates file type and size before adding to pending files.
   * @param event The file input change event.
   */
  public onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    this.errorMessage = '';

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      // Validate file type
      if (!this.allowedFileTypes.includes(file.type)) {
        this.errorMessage = `File "${file.name}" is not allowed. Accepted: PDF, Word, Excel, Images, Text.`;
        continue;
      }

      // Validate file size
      if (file.size > this.maxFileSize) {
        this.errorMessage = `File "${file.name}" exceeds the maximum size of 10 MB.`;
        continue;
      }

      // Check for duplicates
      const isDuplicate = this.pendingFiles.some(f => f.name === file.name && f.size === file.size);
      if (!isDuplicate) {
        this.pendingFiles.push(file);
      }
    }

    // Reset file input so the same file can be selected again
    input.value = '';
  }

  /**
   * Removes a pending file from the list before upload.
   * @param index The index of the file to remove.
   */
  public removePendingFile(index: number): void {
    this.pendingFiles.splice(index, 1);
  }

  /**
   * Removes an existing attachment from the server.
   * @param attachment The attachment to remove.
   * @param index The index in the existing attachments array.
   */
  public removeExistingAttachment(attachment: AttachmentMetadata, index: number): void {
    if (!this.editingMailId || !attachment.id) return;

    this.mailService.deleteAttachment(this.editingMailId, attachment.id).subscribe({
      next: () => {
        this.existingAttachments.splice(index, 1);
      },
      error: () => {
        this.errorMessage = 'Failed to remove attachment.';
      }
    });
  }

  /**
   * Uploads all pending files as attachments to the specified mail.
   * After all uploads complete (or fail), shows success message and navigates.
   * @param mailId The ID of the mail to attach files to.
   * @param successMessage The message to display on success.
   */
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
      this.mailService.uploadAttachment(mailId, file).subscribe({
        next: () => {
          completedCount++;
          if (completedCount + failedCount === totalFiles) {
            this.isUploadingAttachments = false;
            this.pendingFiles = [];
            if (failedCount > 0) {
              this.handleSaveSuccess(`${successMessage} (${failedCount} attachment(s) failed to upload)`);
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
              this.handleSaveSuccess(`${successMessage} (${failedCount} attachment(s) failed to upload)`);
            }
          }
        }
      });
    });
  }

  /**
   * Uploads pending attachments and then sends the mail.
   * If attachment uploads fail, the mail is still sent without the failed attachments.
   * @param mailId The ID of the mail.
   */
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
      this.mailService.uploadAttachment(mailId, file).subscribe({
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
            // Still send the mail even if some attachments failed
            this.sendMailById(mailId);
          }
        }
      });
    });
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
   * Returns the total number of attachments (existing + pending).
   */
  public get totalAttachmentCount(): number {
    return this.existingAttachments.length + this.pendingFiles.length;
  }

  /**
   * Cancels the operation and navigates back to the mail list.
   */
  public onCancel(): void {
    this.router.navigate(['/mails']);
  }
}

