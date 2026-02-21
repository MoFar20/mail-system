/**
 * Represents an email recipient from the backend.
 */
export interface MailRecipient {
  /** Unique identifier for the recipient. */
  id?: number;
  /** The email address of the recipient. */
  address: string;
  /** The type of recipient (TO, CC, BCC, or REPLY_TO). */
  type: 'TO' | 'CC' | 'BCC' | 'REPLY_TO';
}

/**
 * Represents the metadata of an attachment in an email.
 */
export interface AttachmentMetadata {
  /** Unique identifier for the attachment. */
  id?: number;
  /** The media type of the file (e.g., text/plain). */
  mimeType: string;
  /** The name of the attached file. */
  fileName: string;
  /** The size of the file in bytes. */
  size: number;
}

/**
 * Represents an email with all fields and metadata.
 */
export interface Mail {
  /** Unique ID (assigned by server). */
  id?: number;
  /** The email address of the sender. */
  sender: string;
  /** The subject of the email. */
  subject: string;
  /** The content of the mail as plain text. */
  content: string;
  /** List of recipients. */
  recipients?: MailRecipient[];
  /** List of attachments. */
  attachments?: AttachmentMetadata[];

  // Metadata (Read-only from server)
  /** Creation date. */
  createdAt?: string;
  /** Date of last modification. */
  updatedAt?: string;
  /** Time when the mail was sent. */
  sentAt?: string;
  /** Status of the mail: DRAFT, SENT, or ERROR. */
  status: 'DRAFT' | 'SENT' | 'ERROR';
  /** Origin of the mail: INTERN or EXTERN. */
  source: 'INTERN' | 'EXTERN';

  // Client-side properties
  /** Whether the mail is starred (client-side only). */
  starred?: boolean;
  /** Whether the mail has been read (client-side only). */
  read?: boolean;
  /** Whether the mail is selected (client-side only for batch operations). */
  selected?: boolean;

  // Legacy fields for backward compatibility with frontend templates
  /** Legacy sender field. */
  from?: string;
  /** Legacy To recipients field. */
  to?: string[];
  /** Legacy Cc recipients field. */
  cc?: string[];
  /** Legacy Bcc recipients field. */
  bcc?: string[];
}

