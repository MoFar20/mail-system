import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { Mail, AttachmentMetadata } from '../models/mail.model';

/**
 * Represents a standardized service error response
 */
export interface ServiceError {
  message: string;
  status?: number;
  originalError?: HttpErrorResponse;
}

/**
 * Service for managing emails via the REST API.
 * Provides methods for creating, reading, updating, deleting, and sending mails.
 * Includes centralized error handling for all HTTP operations.
 */
@Injectable({
  providedIn: 'root'
})
export class MailService {
  /** Base URL of the API (Spring Boot Server). */
  private apiUrl = 'http://localhost:8080/api/mails';

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
    return this.http.get<Mail[]>(this.apiUrl).pipe(
      catchError((error) => this.handleError('Failed to load mails', error))
    );
  }

  /**
   * Retrieves inbox mails for the logged-in user.
   * @returns An Observable containing an array of received mails.
   */
  public getInbox(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/inbox`).pipe(
      catchError((error) => this.handleError('Failed to load inbox', error))
    );
  }

  /**
   * Retrieves sent mails for the logged-in user.
   * @returns An Observable containing an array of sent mails.
   */
  public getSentMails(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/sent`).pipe(
      catchError((error) => this.handleError('Failed to load sent mails', error))
    );
  }

  /**
   * Retrieves draft mails for the logged-in user.
   * @returns An Observable containing an array of drafts.
   */
  public getDrafts(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/drafts`).pipe(
      catchError((error) => this.handleError('Failed to load drafts', error))
    );
  }

  /**
   * Retrieves the details of a specific mail.
   * @param id The unique ID of the mail.
   * @returns An Observable of the requested mail.
   */
  public getMail(id: number): Observable<Mail> {
    return this.http.get<Mail>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => this.handleError(`Failed to load mail (ID: ${id})`, error))
    );
  }

  /**
   * Creates a new mail on the server.
   * Requires at least one recipient, subject, and content.
   * @param mail The mail object to create.
   * @returns An Observable of the newly created mail.
   */
  public createMail(mail: Mail): Observable<Mail> {
    return this.http.post<Mail>(this.apiUrl, mail).pipe(
      catchError((error) => this.handleError('Failed to create mail', error))
    );
  }

  /**
   * Updates an existing mail (only possible with 'DRAFT' status).
   * @param id The ID of the mail to update.
   * @param mail The new mail data.
   * @returns An Observable of the updated mail.
   */
  public updateMail(id: number, mail: Mail): Observable<Mail> {
    return this.http.put<Mail>(`${this.apiUrl}/${id}`, mail).pipe(
      catchError((error) => this.handleError('Failed to update mail', error))
    );
  }

  /**
   * Permanently deletes a mail and its attachments from the system.
   * @param id The ID of the mail to delete.
   * @returns An Observable of the delete operation.
   */
  public deleteMail(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(
      catchError((error) => this.handleError('Failed to delete mail', error))
    );
  }

  /**
   * Triggers the sending of a previously created mail.
   * @param id The ID of the mail to send.
   * @returns An Observable with the result of the send operation.
   */
  public sendMail(id: number): Observable<Mail> {
    return this.http.post<Mail>(`${this.apiUrl}/${id}/send`, {}).pipe(
      catchError((error) => this.handleError('Failed to send mail', error))
    );
  }

  // ==================== ATTACHMENT MANAGEMENT ====================

  /**
   * Retrieves all attachments of a mail.
   * @param mailId The ID of the mail.
   * @returns An Observable containing an array of attachments.
   */
  public getAttachments(mailId: number): Observable<AttachmentMetadata[]> {
    return this.http.get<AttachmentMetadata[]>(`${this.apiUrl}/${mailId}/attachments`).pipe(
      catchError((error) => this.handleError('Failed to load attachments', error))
    );
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
    return this.http.post<Mail>(`${this.apiUrl}/${mailId}/attachments`, formData).pipe(
      catchError((error) => this.handleError(`Failed to upload attachment: ${file.name}`, error))
    );
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
    }).pipe(
      catchError((error) => this.handleError('Failed to download attachment', error))
    );
  }

  /**
   * Deletes an attachment from a mail.
   * @param mailId The ID of the mail.
   * @param attachmentId The ID of the attachment to delete.
   * @returns An Observable of the delete operation.
   */
  public deleteAttachment(mailId: number, attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${mailId}/attachments/${attachmentId}`).pipe(
      catchError((error) => this.handleError('Failed to delete attachment', error))
    );
  }

  /**
   * Centralized error handling for all mail operations.
   * Converts HTTP errors to user-friendly ServiceError objects.
   * @param message User-friendly error message.
   * @param httpError The HTTP error response.
   * @returns An observable that throws a ServiceError.
   */
  private handleError(message: string, httpError: HttpErrorResponse): Observable<never> {
    let userFriendlyMessage = message;

    if (httpError.status === 404) {
      userFriendlyMessage = 'The requested mail was not found. It may have been deleted.';
    } else if (httpError.status === 403) {
      userFriendlyMessage = 'You do not have permission to perform this action.';
    } else if (httpError.status === 400) {
      userFriendlyMessage = httpError.error?.message || 'Invalid request. Please check your input.';
    } else if (httpError.status === 401) {
      userFriendlyMessage = 'Your session has expired. Please log in again.';
    } else if (httpError.status === 500) {
      userFriendlyMessage = 'Server error. Please try again later.';
    } else if (httpError.status === 0) {
      userFriendlyMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else if (httpError.error?.message) {
      userFriendlyMessage = httpError.error.message;
    }

    const serviceError: ServiceError = {
      message: userFriendlyMessage,
      status: httpError.status,
      originalError: httpError
    };

    return throwError(() => serviceError);
  }
}
