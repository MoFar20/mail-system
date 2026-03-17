import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Mail, AttachmentMetadata } from '../models/mail.model';
import { environment } from '../../environments/environment';

/**
 * Service for managing emails via the REST API.
 * Provides methods for creating, reading, updating, deleting, and sending mails.
 */
@Injectable({
  providedIn: 'root'
})
export class MailService {
  /** Base URL of the API (Spring Boot Server). */
  private apiUrl = environment.apiUrl + '/api/mails/inbox';

  /**
   * Creates an instance of MailService.
   * @param http The Angular HttpClient for API requests.
   */
  constructor(private http: HttpClient) {}

  /**
   * Retrieves a list of all mails from the server.
   * @returns An Observable containing an array of mails.
   */
  public getMails(): Observable<Mail[]> {
    return this.http.get<Mail[]>(this.apiUrl);
  }

  /**
   * Retrieves inbox mails for the logged-in user.
   * @returns An Observable containing an array of received mails.
   */
  public getInbox(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/inbox`);
  }

  /**
   * Retrieves sent mails for the logged-in user.
   * @returns An Observable containing an array of sent mails.
   */
  public getSentMails(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/sent`);
  }

  /**
   * Retrieves draft mails for the logged-in user.
   * @returns An Observable containing an array of drafts.
   */
  public getDrafts(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/drafts`);
  }

  /**
   * Retrieves the details of a specific mail.
   * @param id The unique ID of the mail.
   * @returns An Observable of the requested mail.
   */
  public getMail(id: number): Observable<Mail> {
    return this.http.get<Mail>(`${this.apiUrl}/${id}`);
  }

  /**
   * Creates a new mail on the server.
   * Requires at least one recipient, subject, and content.
   * @param mail The mail object to create.
   * @returns An Observable of the newly created mail.
   */
  public createMail(mail: Mail): Observable<Mail> {
    return this.http.post<Mail>(this.apiUrl, mail);
  }

  /**
   * Updates an existing mail (only possible with 'DRAFT' status).
   * @param id The ID of the mail to update.
   * @param mail The new mail data.
   * @returns An Observable of the updated mail.
   */
  public updateMail(id: number, mail: Mail): Observable<Mail> {
    return this.http.put<Mail>(`${this.apiUrl}/${id}`, mail);
  }

  /**
   * Permanently deletes a mail and its attachments from the system.
   * @param id The ID of the mail to delete.
   * @returns An Observable of the delete operation.
   */
  public deleteMail(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Triggers the sending of a previously created mail.
   * @param id The ID of the mail to send.
   * @returns An Observable with the result of the send operation.
   */
  public sendMail(id: number): Observable<Mail> {
    return this.http.post<Mail>(`${this.apiUrl}/${id}/send`, {});
  }

  // ==================== ATTACHMENT MANAGEMENT ====================

  /**
   * Retrieves all attachments of a mail.
   * @param mailId The ID of the mail.
   * @returns An Observable containing an array of attachments.
   */
  public getAttachments(mailId: number): Observable<AttachmentMetadata[]> {
    return this.http.get<AttachmentMetadata[]>(`${this.apiUrl}/${mailId}/attachments`);
  }

  /**
   * Uploads a file attachment to a mail.
   * Sends the file as multipart/form-data to the backend.
   * @param mailId The ID of the mail.
   * @param file The file to upload.
   * @returns An Observable of the updated mail.
   */
  public uploadAttachment(mailId: number, file: File): Observable<Mail> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<Mail>(`${this.apiUrl}/${mailId}/attachments`, formData);
  }

  /**
   * Downloads an attachment file from a mail.
   * @param mailId The ID of the mail.
   * @param attachmentId The ID of the attachment to download.
   * @returns An Observable containing the file as a Blob.
   */
  public downloadAttachment(mailId: number, attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${mailId}/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    });
  }

  /**
   * Deletes an attachment from a mail.
   * @param mailId The ID of the mail.
   * @param attachmentId The ID of the attachment to delete.
   * @returns An Observable of the delete operation.
   */
  public deleteAttachment(mailId: number, attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${mailId}/attachments/${attachmentId}`);
  }
}

