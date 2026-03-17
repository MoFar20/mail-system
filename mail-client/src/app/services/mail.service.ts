import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Make sure these paths match your actual project structure
import { Mail } from '../models/mail.model'; 
import { AttachmentMetadata } from '../models/attachment.model';

@Injectable({
  providedIn: 'root'
})
export class MailService {
  // Hardcoded to guarantee no environment variable issues
  private apiUrl = 'https://remarkable-jeanne-thmdms-34e6c67e.koyeb.app/api/mails';

  constructor(private http: HttpClient) { }

  public getMails(): Observable<Mail[]> {
    return this.http.get<Mail[]>(this.apiUrl);
  }

  public getInbox(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/inbox`);
  }

  public getSentMails(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/sent`);
  }

  public getDrafts(): Observable<Mail[]> {
    return this.http.get<Mail[]>(`${this.apiUrl}/drafts`);
  }

  public getMail(id: number): Observable<Mail> {
    return this.http.get<Mail>(`${this.apiUrl}/${id}`);
  }

  public createMail(mail: any): Observable<Mail> {
    return this.http.post<Mail>(this.apiUrl, mail);
  }

  public updateMail(id: number, mail: any): Observable<Mail> {
    return this.http.put<Mail>(`${this.apiUrl}/${id}`, mail);
  }

  public deleteMail(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  public sendMail(id: number): Observable<Mail> {
    return this.http.post<Mail>(`${this.apiUrl}/${id}/send`, {});
  }

  public getAttachments(mailId: number): Observable<AttachmentMetadata[]> {
    return this.http.get<AttachmentMetadata[]>(`${this.apiUrl}/${mailId}/attachments`);
  }

  public uploadAttachment(mailId: number, file: File): Observable<Mail> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<Mail>(`${this.apiUrl}/${mailId}/attachments`, formData);
  }

  public downloadAttachment(mailId: number, attachmentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${mailId}/attachments/${attachmentId}/download`, {
      responseType: 'blob'
    });
  }

  public deleteAttachment(mailId: number, attachmentId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${mailId}/attachments/${attachmentId}`);
  }
}
