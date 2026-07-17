package de.thm.mni.mailsystem.dto

import de.thm.mni.mailsystem.model.Attachment
import de.thm.mni.mailsystem.model.Mail
import de.thm.mni.mailsystem.model.MailRecipient
import java.time.LocalDateTime

/**
 * Response DTO for Mail entity
 *
 * This DTO is used to return mail data to the client.
 * It decouples the domain model (Mail entity) from the presentation layer.
 * NO JPA annotations are used here - this is pure data class for API responses.
 *
 * @property id Unique identifier for the mail
 * @property sender The email address of the sender (from field)
 * @property subject The subject line of the email
 * @property content The plain text content body of the email
 * @property status Current status of the mail
 * @property source Origin of the mail
 * @property recipients List of recipients with their types
 * @property attachments List of file attachments
 * @property createdAt Timestamp when the mail was created
 * @property updatedAt Timestamp when the mail was last modified
 * @property sentAt Timestamp when the mail was successfully sent (null if not sent)
 */
data class MailDto(
    val id: Long? = null,
    val sender: String,
    val subject: String,
    val content: String,
    val status: String,
    val source: String,
    val recipients: List<MailRecipientDto> = emptyList(),
    val attachments: List<AttachmentDto> = emptyList(),
    val createdAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null,
    val sentAt: LocalDateTime? = null
)

/**
 * Response DTO for MailRecipient entity
 *
 * Represents a single recipient of a mail.
 * Excludes the bidirectional reference back to Mail to prevent circular serialization.
 *
 * @property id Unique identifier for the recipient
 * @property address The email address of the recipient
 * @property type The type of recipient
 */
data class MailRecipientDto(
    val id: Long? = null,
    val address: String,
    val type: String
)

/**
 * Response DTO for Attachment entity
 *
 * Represents a file attachment on a mail.
 * Excludes the binary file data (ByteArray) as responses typically provide
 * download links instead of embedding file contents.
 * Excludes the bidirectional reference back to Mail to prevent circular serialization.
 *
 * @property id Unique identifier for the attachment
 * @property fileName The original name of the attached file
 * @property mimeType The MIME type of the file
 * @property size The size of the file in bytes
 */
data class AttachmentDto(
    val id: Long? = null,
    val fileName: String,
    val mimeType: String,
    val size: Long
)

fun Mail.toDto(): MailDto = MailDto(
    id = this.id,
    sender = this.sender,
    subject = this.subject,
    content = this.content,
    status = this.status.name,
    source = this.source.name,
    recipients = this.recipients.map { it.toDto() },
    attachments = this.attachments.map { it.toDto() },
    createdAt = this.createdAt,
    updatedAt = this.updatedAt,
    sentAt = this.sentAt
)

fun MailRecipient.toDto(): MailRecipientDto = MailRecipientDto(
    id = this.id,
    address = this.address,
    type = this.type.name
)

fun Attachment.toDto(): AttachmentDto = AttachmentDto(
    id = this.id,
    fileName = this.fileName,
    mimeType = this.mimeType,
    size = this.size
)

@JvmName("mailListToDto")
fun List<Mail>.toDto(): List<MailDto> = this.map { it.toDto() }

@JvmName("recipientListToDto")
fun List<MailRecipient>.toDto(): List<MailRecipientDto> = this.map { it.toDto() }

@JvmName("attachmentListToDto")
fun List<Attachment>.toDto(): List<AttachmentDto> = this.map { it.toDto() }