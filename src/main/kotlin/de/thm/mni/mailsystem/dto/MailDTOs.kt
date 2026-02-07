package de.thm.mni.mailsystem.dto

import de.thm.mni.mailsystem.model.RecipientType
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Email
import jakarta.validation.constraints.Size

/**
 * Data Transfer Object for creating a new mail.
 *
 * Used to receive mail creation requests from clients with proper validation.
 *
 * @property sender The email address of the sender.
 * @property subject The subject line of the email.
 * @property content The plain text content body of the email.
 * @property recipients List of recipients with their types.
 * @property attachments Optional list of attachment metadata.
 */
data class MailCreateRequest(
    @field:NotBlank(message = "Sender is required")
    @field:Email(message = "Sender must be a valid email address")
    val sender: String,

    @field:NotBlank(message = "Subject is required")
    @field:Size(max = 255, message = "Subject must be at most 255 characters")
    val subject: String,

    @field:NotBlank(message = "Content is required")
    val content: String,

    val recipients: List<RecipientRequest>? = null,

    val attachments: List<AttachmentRequest>? = null
)

/**
 * Data Transfer Object for updating an existing mail.
 *
 * Used to receive mail update requests from clients.
 *
 * @property sender The email address of the sender.
 * @property subject The subject line of the email.
 * @property content The plain text content body of the email.
 * @property recipients Optional list of recipients (if null, recipients are not updated).
 */
data class MailUpdateRequest(
    @field:NotBlank(message = "Sender is required")
    @field:Email(message = "Sender must be a valid email address")
    val sender: String,

    @field:NotBlank(message = "Subject is required")
    @field:Size(max = 255, message = "Subject must be at most 255 characters")
    val subject: String,

    @field:NotBlank(message = "Content is required")
    val content: String,

    val recipients: List<RecipientRequest>? = null
)

/**
 * Data Transfer Object for mail recipients.
 *
 * @property address The email address of the recipient.
 * @property type The type of recipient (TO, CC, BCC, or REPLY_TO).
 */
data class RecipientRequest(
    @field:NotBlank(message = "Recipient address is required")
    @field:Email(message = "Recipient must be a valid email address")
    val address: String,

    val type: RecipientType
)

/**
 * Data Transfer Object for attachment metadata.
 *
 * @property fileName The name of the attached file.
 * @property mimeType The MIME type of the file.
 * @property size The size of the file in bytes.
 */
data class AttachmentRequest(
    @field:NotBlank(message = "File name is required")
    val fileName: String,

    @field:NotBlank(message = "MIME type is required")
    val mimeType: String,

    val size: Long
)

