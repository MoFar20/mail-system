import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MailService {
  private apiUrl = 'https://remarkable-jeanne-thmdms-34e6c67e.koyeb.app/api/mails';

  constructor(private http: HttpClient) { }

  public getMails(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  public getInbox(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inbox`);
  }

  public getSentMails(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sent`);
  }

  public getDrafts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/drafts`);
  }

  public getMail(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  public createMail(mail: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, mail);
  }

  public updateMail(id: number, mail: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, mail);
  }

  public deleteMail(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  public sendMail(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/send`, {});
  }

  public getAttachments(mailId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${mailId}/attachments`);
  }

  public uploadAttachment(mailId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    return this.http.post<any>(`${this.apiUrl}/${mailId}/attachments`, formData);
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
