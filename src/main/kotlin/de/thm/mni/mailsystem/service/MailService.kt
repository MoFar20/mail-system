package de.thm.mni.mailsystem.service

import de.thm.mni.mailsystem.dto.*
import de.thm.mni.mailsystem.model.*
import de.thm.mni.mailsystem.repository.MailRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDateTime
import kotlin.random.Random

/**
 * Service layer for mail operations implementing business logic enforcement and data transformation.
 *
 * ## Architecture Role (3-Tier Spring Boot Application)
 *
 * **Layer Classification:** Business Logic (Service) Layer
 *
 * This service orchestrates all mail-related operations between the REST API layer and data persistence:
 * - **Responsibility:** Enforces business rules, validates constraints, manages transactions
 * - **Input:** DTOs from controllers (decoupled from domain model)
 * - **Output:** DTOs to controllers (domain entities never exposed directly)
 * - **Data Access:** Delegates queries to [MailRepository] (data access layer)
 *
 * ## Transaction Management Strategy
 *
 * - **readOnly = true** for queries: Optimizes database access, prevents accidental writes
 * - **readOnly = false** for mutations: Necessary for INSERT/UPDATE/DELETE operations
 * - **@Transactional boundary:** Keeps Hibernate session open for lazy-loaded collection access
 *
 * ## Lazy Loading Operational Pattern
 *
 * Mail entities use `FetchType.LAZY` for collections (recipients, attachments):
 * - Collections NOT loaded when mail is fetched from database
 * - Collections initialized ONLY when accessed (e.g., during DTO conversion)
 * - @Transactional keeps session active to prevent LazyInitializationException
 * - Reduces memory footprint and improves performance for mail list operations
 *
 * @property mailRepository Spring Data JPA repository for mail persistence operations
 *
 * @see MailRepository
 * @see MailDto
 * @see Mail
 */
@Service
class MailService(private val mailRepository: MailRepository) {

    private val logger = LoggerFactory.getLogger(MailService::class.java)

    private val ALLOWED_MIME_TYPES = setOf(
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "text/plain",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/zip",
        "application/octet-stream"
    )

    private fun assertMailAccess(mail: Mail, requestingEmail: String) {
        val isSender = mail.sender == requestingEmail
        val isRecipient = mail.recipients.any { it.address == requestingEmail }
        if (!isSender && !isRecipient) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied")
        }
    }

    /**
     * Retrieves all emails for a user (both sent and received).
     *
     * **Query Scope:**
     * Returns mails where the given email address is either:
     * - The sender (emails user sent)
     * - A recipient in any capacity (TO, CC, BCC) (emails user received)
     *
     * **Performance Characteristics:**
     * - readOnly: Optimized for query-only operations
     * - Keeps session open for lazy collection initialization during toDto()
     * - Recipients and attachments loaded on-demand when converted to DTO
     *
     * @param email The user's email address to filter by
     * @return List of all mails as response DTOs (both sent and received)
     *
     * @see toDto
     */
    @Transactional(readOnly = true)
    fun getAllMails(email: String): List<MailDto> {
        return mailRepository.findAllByUser(email).toDto()
    }

    /**
     * Retrieves the inbox for a user (emails received).
     *
     * **Query Scope:**
     * Returns only emails where the given address appears in recipients list,
     * regardless of recipient type (TO, CC, BCC).
     *
     * **Database Query:**
     * Uses parameterized JPQL query to prevent SQL injection.
     *
     * @param email The user's email address
     * @return List of received mails as response DTOs
     *
     * @see MailRepository.findByRecipientEmail
     */
    @Transactional(readOnly = true)
    fun getInbox(email: String): List<MailDto> {
        return mailRepository.findByRecipientEmail(email).toDto()
    }

    /**
     * Retrieves all successfully sent emails for a user.
     *
     * **Query Scope:**
     * Returns mails where:
     * - sender = email (user sent the mail)
     * - status = SENT (successfully transmitted, excludes DRAFT and ERROR)
     *
     * **Implementation Note:**
     * Fetches from repository then filters by status in-memory.
     * Could be optimized by adding repository method with status predicate.
     *
     * @param email The user's email address (sender)
     * @return List of successfully sent mails as response DTOs
     *
     * @see MailRepository.findBySender
     */
    @Transactional(readOnly = true)
    fun getSentMails(email: String): List<MailDto> {
        return mailRepository.findBySender(email)
            .filter { it.status == Mail.MailStatus.SENT }
            .toDto()
    }

    /**
     * Retrieves all unsent draft emails for a user.
     *
     * **Query Scope:**
     * Returns mails where:
     * - sender = email (user is composing)
     * - status = DRAFT (not yet sent, editable)
     *
     * **Business Use Case:**
     * Users can retrieve drafts to continue composition or send later.
     * Draft emails are private to the sender and not visible to intended recipients.
     *
     * @param email The user's email address (sender)
     * @return List of draft mails as response DTOs
     *
     * @see MailRepository.findBySenderAndStatus
     */
    @Transactional(readOnly = true)
    fun getDrafts(email: String): List<MailDto> {
        return mailRepository.findBySenderAndStatus(email, Mail.MailStatus.DRAFT).toDto()
    }

    /**
     * Retrieves a single mail with full details including recipients and attachments.
     *
     * **Query Scope:**
     * Fetches mail by primary key, then initializes all relationships.
     *
     * **Lazy Loading in Action:**
     * - Mail entity fetched immediately from database
     * - Recipients list initialized when accessed in toDto()
     * - Attachments list initialized when accessed in toDto()
     * - Bidirectional references maintained in-memory
     *
     * @param id The mail's unique identifier (primary key)
     * @return Single mail with all relationships as response DTO
     * @throws ResponseStatusException HTTP 404 if mail not found
     *
     * @see ResponseStatusException
     */
    @Transactional(readOnly = true)
    fun getMailById(id: Long, requestingEmail: String): MailDto {
        val mail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }
        assertMailAccess(mail, requestingEmail)
        return mail.toDto()
    }

    /**
     * Creates a new mail in DRAFT status with validation.
     *
     * **Business Logic:**
     * 1. Validates: At least one recipient with type TO, CC, or BCC (REPLY_TO optional)
     * 2. Creates Mail entity with initial status = DRAFT
     * 3. Establishes bidirectional relationships with recipients and attachments
     * 4. Persists to database atomically
     *
     * **Valid Recipients:**
     * - TO: Primary recipient (required at minimum or with CC/BCC)
     * - CC: Carbon copy (visible to all recipients)
     * - BCC: Blind carbon copy (hidden from other recipients)
     * - REPLY_TO: Optional, specifies reply address
     *
     * **All mails created with:**
     * - status = DRAFT (not yet sent, editable)
     * - source = INTERN (internal system mail)
     *
     * **Transactional Context:**
     * readOnly = false: Modifies database
     * Atomic: Either entire mail with all relationships created or none (rollback on error)
     *
     * **Bidirectional Relationship Management:**
     * Uses [Mail.addRecipient] and [Mail.addAttachment] to maintain both sides of relationships.
     *
     * @param mailRequest DTO containing mail details (sender, subject, content, recipients, attachments)
     * @return Created mail with generated ID and timestamps as response DTO
     * @throws ResponseStatusException HTTP 400 if no valid recipient (TO, CC, or BCC) provided
     *
     * @see Mail
     * @see MailRecipient
     * @see Attachment
     * @see MailCreateRequest
     */
    @Transactional
    fun createMail(mailRequest: MailCreateRequest): MailDto {
        val hasRecipient = mailRequest.recipients?.any {
            it.type in listOf(RecipientType.TO, RecipientType.CC, RecipientType.BCC)
        } ?: false

        if (!hasRecipient) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one recipient (TO, CC, or BCC) is required")
        }

        val mail = Mail(
            sender = mailRequest.sender,
            subject = mailRequest.subject,
            content = mailRequest.content,
            status = Mail.MailStatus.DRAFT,
            source = Mail.MailSource.INTERN
        )

        mailRequest.recipients?.forEach { recipientRequest ->
            mail.addRecipient(MailRecipient(
                address = recipientRequest.address,
                type = recipientRequest.type,
                mail = mail
            ))
        }

        mailRequest.attachments?.forEach { attachmentRequest ->
            mail.addAttachment(Attachment(
                fileName = attachmentRequest.fileName,
                mimeType = attachmentRequest.mimeType,
                size = attachmentRequest.size,
                mail = mail
            ))
        }

        logger.info("Creating new mail with {} recipients", mail.recipients.size)
        return mailRepository.save(mail).toDto()
    }

    /**
     * Updates an existing mail (only if in DRAFT status).
     *
     * **Immutability Principle:**
     * Once a mail is sent (status = SENT or ERROR), it becomes immutable.
     * Only DRAFT mails can be edited to maintain integrity of message history.
     *
     * **Editable Fields:**
     * - Subject, content, sender address
     * - Recipients (completely replaced with new list)
     * - Note: Attachments modified separately via uploadAttachment/deleteAttachment
     *
     * **Recipient Management:**
     * Existing recipients cleared and replaced with new ones from request.
     * Updated mail must have at least one TO/CC/BCC recipient (same validation as creation).
     *
     * **Timestamps:**
     * - updatedAt automatically updated by @UpdateTimestamp annotation
     * - sentAt remains None (mail still in draft)
     *
     * **Transactional Context:**
     * readOnly = false: Persists changes to database
     * Atomic: All updates applied together or none (rollback on error)
     *
     * @param id The mail's unique identifier
     * @param updateRequest DTO containing updated mail details
     * @return Updated mail as response DTO
     * @throws ResponseStatusException HTTP 404 if mail not found
     * @throws ResponseStatusException HTTP 403 (FORBIDDEN) if mail not in DRAFT status
     * @throws ResponseStatusException HTTP 400 if no valid recipient provided in update
     *
     * @see MailUpdateRequest
     */
    @Transactional
    fun updateMail(id: Long, updateRequest: MailUpdateRequest, requestingEmail: String): MailDto {
        val existingMail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        assertMailAccess(existingMail, requestingEmail)
        if (existingMail.sender != requestingEmail) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can edit a mail")
        }

        if (existingMail.status != Mail.MailStatus.DRAFT) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only draft mails can be modified")
        }

        if (updateRequest.recipients != null) {
            val hasRecipient = updateRequest.recipients.any {
                it.type in listOf(RecipientType.TO, RecipientType.CC, RecipientType.BCC)
            }
            if (!hasRecipient) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one recipient (TO, CC, or BCC) is required")
            }

            existingMail.recipients.clear()
            updateRequest.recipients.forEach { recipientRequest ->
                existingMail.addRecipient(MailRecipient(
                    address = recipientRequest.address,
                    type = recipientRequest.type,
                    mail = existingMail
                ))
            }
        }

        existingMail.subject = updateRequest.subject
        existingMail.content = updateRequest.content
        existingMail.sender = updateRequest.sender

        logger.info("Updated mail {} with {} recipients", id, existingMail.recipients.size)
        return mailRepository.save(existingMail).toDto()
    }

    /**
     * Deletes a mail permanently from the database with cascade cleanup of all children.
     *
     * **Cascade Behavior:**
     * Because Mail entity declares:
     * - `cascade = [CascadeType.ALL]` on recipients collection
     * - `cascade = [CascadeType.ALL]` on attachments collection
     * - `orphanRemoval = true` (removes orphaned children)
     *
     * Deleting a mail automatically deletes:
     * - All recipient records for this mail
     * - All attachment records for this mail
     * - Database integrity maintained by referential constraints
     *
     * **Transactional Context:**
     * readOnly = false: Deletes from database
     * Atomic: Mail and all relationships deleted together or not at all
     *
     * @param id The mail's unique identifier
     * @throws ResponseStatusException HTTP 404 if mail not found
     *
     * @see MailRepository.deleteById
     */
    @Transactional
    fun deleteMail(id: Long, requestingEmail: String) {
        val mail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }
        assertMailAccess(mail, requestingEmail)
        mailRepository.deleteById(id)
    }

    /**
     * Sends a mail by transitioning its status from DRAFT to SENT or ERROR.
     *
     * **Status Transition Logic:**
     * Simulates email transmission with 90% success rate:
     * - 90% chance: Status → SENT, sentAt ← current timestamp
     * - 10% chance: Status → ERROR (transmission failure)
     *
     * **Business Rules:**
     * - Only DRAFT mails can be sent (prevents re-sending)
     * - Status change is permanent and immutable (once SENT/ERROR, cannot be unsent)
     * - sentAt timestamp set only on SENT (not on ERROR)
     *
     * **Idempotency:** NOT idempotent - repeated calls will fail since mail no longer in DRAFT
     *
     * **Real-World Implementation:**
     * This is a simulation. Production would integrate with:
     * - SMTP mail servers
     * - Cloud mail services (SendGrid, AWS SES, etc.)
     * - Message queues for async processing
     * - Retry mechanisms for failed sends
     *
     * **Transactional Context:**
     * readOnly = false: Persists status change
     * Updates mail state atomically with new timestamp
     *
     * @param id The mail's unique identifier
     * @return Sent or failed mail with updated status and sentAt as response DTO
     * @throws ResponseStatusException HTTP 404 if mail not found
     * @throws ResponseStatusException HTTP 400 if mail not in DRAFT status
     *
     * @see Mail.MailStatus
     */
    @Transactional
    fun sendMail(id: Long, requestingEmail: String): MailDto {
        val mail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        assertMailAccess(mail, requestingEmail)
        if (mail.sender != requestingEmail) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can send a mail")
        }

        if (mail.status != Mail.MailStatus.DRAFT) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Only mails with status DRAFT can be sent.")
        }

        val success = Random.nextDouble() < 0.9
        
        mail.status = if (success) Mail.MailStatus.SENT else Mail.MailStatus.ERROR
        if (success) {
            mail.sentAt = LocalDateTime.now()
        }

        return mailRepository.save(mail).toDto()
    }

    /**
     * Retrieves attachment metadata for all files attached to a mail.
     *
     * **Data Returned:**
     * Returns metadata only (filename, MIME type, size).
     * Binary file content NOT included in response (prevents large payloads).
     * File content downloaded separately via [downloadAttachment].
     *
     * **Lazy Loading:**
     * - Mail entity fetched from database
     * - Attachments list initialized (lazy-loaded) when accessed
     * - Only attachment records loaded, not binary data (stored as BLOB)
     *
     * **Use Case:**
     * Display list of files attached to mail in UI for user to browse/download.
     *
     * **Transactional Context:**
     * readOnly = true: Query-only operation
     * Keeps session open for lazy attachment list initialization
     *
     * @param id The mail's unique identifier
     * @return List of attachment metadata as response DTOs (file info without binary data)
     * @throws ResponseStatusException HTTP 404 if mail not found
     *
     * @see AttachmentDto
     */
    @Transactional(readOnly = true)
    fun getAttachments(id: Long, requestingEmail: String): List<AttachmentDto> {
        val mail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }
        assertMailAccess(mail, requestingEmail)
        return mail.attachments.toDto()
    }

    /**
     * Uploads a file attachment to a mail.
     *
     * **File Handling:**
     * - Accepts [MultipartFile] from HTTP request (form-data with file)
     * - Extracts: filename (or defaults to "unknown"), MIME type, file size, binary content
     * - Stores binary content as BLOB in attachments table
     * - Limits attachments to DRAFT mails only (prevents modifying sent mails)
     *
     * **Validation:**
     * - Mail must exist (HTTP 404 if not)
     * - Mail must be in DRAFT status (HTTP 403 if sent/error)
     * - File must not be empty (HTTP 400 if empty)
     *
     * **Memory Considerations:**
     * - Uses [MultipartFile.bytes] to load entire file into ByteArray
     * - Suitable for files up to ~100MB (depends on JVM heap size)
     * - Large file support (> 1GB) would require streaming implementation
     *
     * **MIME Type Handling:**
     * - Defaults to "application/octet-stream" if content type not provided
     * - Used for Content-Type header when downloading
     *
     * **Bidirectional Relationship:**
     * Uses [Mail.addAttachment] to maintain both sides of Mail ↔ Attachment relationship.
     *
     * **Transactional Context:**
     * readOnly = false: Persists attachment record
     * Atomic: Attachment linked to mail and saved together
     *
     * **Logging:**
     * INFO level: Records filename, size in bytes, and mail ID for audit trail
     *
     * @param id The mail's unique identifier
     * @param file Spring MultipartFile from HTTP request containing uploaded file
     * @return Updated mail with new attachment as response DTO
     * @throws ResponseStatusException HTTP 404 if mail not found
     * @throws ResponseStatusException HTTP 403 if mail not in DRAFT status
     * @throws ResponseStatusException HTTP 400 if file is empty
     *
     * @see MultipartFile
     * @see Attachment
     */
    @Transactional
    fun uploadAttachment(id: Long, file: MultipartFile, requestingEmail: String): MailDto {
        val mail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        assertMailAccess(mail, requestingEmail)
        if (mail.sender != requestingEmail) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can add attachments")
        }

        if (mail.status != Mail.MailStatus.DRAFT) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Can only add attachments to draft mails")
        }

        if (file.isEmpty) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty")
        }

        val detectedMimeType = file.contentType ?: "application/octet-stream"
        if (detectedMimeType !in ALLOWED_MIME_TYPES) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "File type '$detectedMimeType' is not allowed."
            )
        }
        // Sanitize filename - limit length, strip path separators, null bytes, and control characters
        val fileName = (file.originalFilename ?: "unknown")
            .replace(Regex("[/\\\\]"), "_")
            .replace(Regex("[\\x00-\\x1F]"), "_")
            .trim('.')
            .take(255)
            .ifBlank { "unknown" }

        val attachment = Attachment(
            fileName = fileName,
            mimeType = detectedMimeType,
            size = file.size,
            data = file.bytes,
            mail = mail
        )
        mail.addAttachment(attachment)

        logger.info("Uploaded attachment '{}' ({} bytes) to mail {}", attachment.fileName, attachment.size, id)
        return mailRepository.save(mail).toDto()
    }

    /**
     * Downloads a file attachment with its binary content.
     *
     * **Separation of Concerns:**
     * - [getAttachments] returns metadata only (lightweight, suitable for lists)
     * - [downloadAttachment] returns binary content (heavyweight, for individual file transfer)
     * - Clients decide when to fetch actual file content (performance optimization)
     *
     * **Lazy Loading Process:**
     * 1. Mail entity fetched from database by ID
     * 2. Attachments list initialized (lazy-loaded) when searching for specific attachment
     * 3. Attachment's ByteArray data loaded from BLOB column (lazy)
     * 4. Entire binary content returned in AttachmentData object
     *
     * **Return Type:**
     * Returns [AttachmentData] (pure data transfer object, not JPA entity).
     * Decouples presentation from domain model.
     *
     * **HTTP Response Generation (in Controller):**
     * Controller uses returned data to set HTTP headers:
     * - Content-Type: from mimeType (e.g., "application/pdf")
     * - Content-Disposition: attachment (triggers download dialog)
     * - Content-Length: from size (pre-calculated)
     *
     * **Transactional Context:**
     * readOnly = true: Query-only operation
     * Keeps session open for lazy collection and BLOB loading
     *
     * **Security Considerations:**
     * - No ownership validation (future: verify user mailbox access)
     * - No per-attachment access control (could add permissions layer)
     *
     * @param mailId The mail's unique identifier
     * @param attachmentId The attachment's unique identifier
     * @return AttachmentData containing filename, MIME type, size, and binary content
     * @throws ResponseStatusException HTTP 404 if mail not found
     * @throws ResponseStatusException HTTP 404 if attachment not found in mail
     * @throws ResponseStatusException HTTP 404 if attachment content not available (BLOB null)
     *
     * @see AttachmentData
     */
    @Transactional(readOnly = true)
    fun downloadAttachment(mailId: Long, attachmentId: Long, requestingEmail: String): AttachmentData {
        val mail = mailRepository.findById(mailId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        assertMailAccess(mail, requestingEmail)

        val attachment = mail.attachments.find { it.id == attachmentId }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found")

        val data = attachment.data
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment content not available")

        return AttachmentData(attachment.fileName, attachment.mimeType, attachment.size, data)
    }

    /**
     * Deletes an attachment from a mail.
     *
     * **Immutability Enforcement:**
     * Only DRAFT mails can have attachments removed (prevents modifying sent mails).
     * Once mail is sent, attachments become part of permanent record.
     *
     * **Deletion Process:**
     * 1. Mail fetched by ID
     * 2. Validates mail is in DRAFT status
     * 3. Finds attachment in mail's attachment list
     * 4. Removes attachment from list
     * 5. Saves mail (cascade delete removes attachment record)
     *
     * **Cascade Deletion:**
     * Mail entity declares `cascade = [CascadeType.ALL]` on attachments.
     * Removing attachment from list triggers automatic database deletion.
     * No explicit DELETE query needed (Hibernate handles it).
     *
     * **Transactional Context:**
     * readOnly = false: Persists deletion to database
     * Atomic: Attachment record deleted in single transaction
     *
     * **Logging:**
     * INFO level: Records which attachment deleted from which mail
     *
     * @param  mailId The mail's unique identifier
     * @param  attachmentId The attachment's unique identifier within the mail
     * @throws ResponseStatusException HTTP 404 if mail not found
     * @throws ResponseStatusException HTTP 403 if mail not in DRAFT status
     * @throws ResponseStatusException HTTP 404 if attachment not found in mail
     *
     * @see Mail.attachments
     */
    @Transactional
    fun deleteAttachment(mailId: Long, attachmentId: Long, requestingEmail: String) {
        val mail = mailRepository.findById(mailId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        assertMailAccess(mail, requestingEmail)
        if (mail.sender != requestingEmail) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only the sender can delete attachments")
        }

        if (mail.status != Mail.MailStatus.DRAFT) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Can only delete attachments from draft mails")
        }

        val attachment = mail.attachments.find { it.id == attachmentId }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found")

        mail.attachments.remove(attachment)
        mailRepository.save(mail)
        logger.info("Deleted attachment {} from mail {}", attachmentId, mailId)
    }
}

/**
 * Data transfer object exclusively for attachment download operations.
 *
 * **Purpose:**
 * Transfer raw file data from service to controller without exposing JPA entity layer.
 * Maintains clean architectural separation between domain model and presentation.
 *
 * **Separation from AttachmentDto:**
 * - [AttachmentDto]: Used in mail detail responses (metadata only, no binary)
 * - [AttachmentData]: Used in file download responses (includes binary content)
 * - Different objects optimize different use cases
 *
 * **Why Not Use JPA Entity?**
 * - Prevents serialization of persistence proxies
 * - Avoids lazy loading issues in response phase
 * - Decouples API contract from domain model
 * - Pure data container with no JPA annotations
 *
 * **HTTP Response Mapping (in Controller):**
 * These properties map directly to HTTP headers:
 * - [fileName] → Content-Disposition attachment filename parameter
 * - [mimeType] → Content-Type header
 * - [size] → Content-Length header
 * - [data] → HTTP response body (ByteArray)
 *
 * @property fileName The original filename provided by user (used for download dialog)
 * @property mimeType The file's MIME type (RFC 2045) for browser handling
 * @property size The file size in bytes for bandwidth estimation
 * @property data The complete binary file content as ByteArray for HTTP body
 */
data class AttachmentData(
    val fileName: String,
    val mimeType: String,
    val size: Long,
    val data: ByteArray
)