package de.thm.mni.mailsystem.controller

import de.thm.mni.mailsystem.model.*
import de.thm.mni.mailsystem.dto.*
import de.thm.mni.mailsystem.service.MailService
import de.thm.mni.mailsystem.repository.MailRepository
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException

/**
 * REST controller for mail operations.
 *
 * Provides endpoints for CRUD operations on mails and sending functionality.
 * All endpoints require authentication (configured in SecurityConfig).
 *
 * @property mailRepository Repository for mail data access.
 * @property mailService Service layer for mail business logic.
 */


@RestController
@RequestMapping("/api/mails")
@CrossOrigin(origins = ["http://localhost:4200"])
class MailController(private val mailRepository: MailRepository,
                     private val mailService: MailService
)
{
    private val logger = LoggerFactory.getLogger(MailController::class.java)

    /**
     * Retrieves all mails belonging to the authenticated user.
     *
     * Returns mails where the user is either the sender or a recipient,
     * ensuring user privacy by not exposing other users' emails.
     *
     * @return List of Mail entities belonging to the authenticated user.
     */
    @GetMapping
    fun getAllMails(): List<Mail> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        return mailRepository.findAllByUser(email)
    }

    /**
     * Retrieves all mails where the authenticated user is a recipient (inbox).
     *
     * @return List of Mail entities received by the authenticated user.
     */
    @GetMapping("/inbox")
    fun getInbox(): List<Mail> {
        val auth = SecurityContextHolder.getContext().authentication
        logger.debug("getInbox called - Authentication: {}, Principal: {}", auth, auth?.principal)

        val email = auth?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")

        logger.debug("Looking for inbox mails for email: {}", email)
        val mails = mailRepository.findByRecipientEmail(email)
        logger.debug("Found {} mails for {}", mails.size, email)
        return mails
    }

    /**
     * Retrieves all mails sent by the authenticated user.
     *
     * @return List of Mail entities sent by the authenticated user.
     */
    @GetMapping("/sent")
    fun getSentMails(): List<Mail> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        return mailRepository.findBySender(email)
            .filter { it.status == Mail.MailStatus.SENT }
    }

    /**
     * Retrieves all draft mails for the authenticated user.
     *
     * @return List of Mail entities in draft status for the authenticated user.
     */
    @GetMapping("/drafts")
    fun getDrafts(): List<Mail> {
        val email = SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
        return mailRepository.findBySenderAndStatus(email, Mail.MailStatus.DRAFT)
    }

    /**
     * Retrieves a specific mail by its ID.
     *
     * @param id The unique identifier of the mail.
     * @return The Mail entity with the specified ID.
     * @throws ResponseStatusException with NOT_FOUND if mail doesn't exist.
     */
    @GetMapping("/{id}")
    fun getMailById(@PathVariable id: Long): Mail = mailRepository.findById(id)
        .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

    /**
     * Creates a new mail in draft status.
     *
     * The mail must have a non-blank subject and content, and at least one
     * recipient (TO, CC, or BCC). Initial status is set to DRAFT.
     *
     * @param mailRequest The mail creation request containing mail data and recipients.
     * @return The created Mail entity with generated ID.
     * @throws ResponseStatusException with BAD_REQUEST if validation fails or no recipients provided.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createMail(@Valid @RequestBody mailRequest: MailCreateRequest): Mail {
        // Validate that at least one recipient exists (TO, CC, or BCC)
        val hasRecipient = mailRequest.recipients?.any {
            it.type in listOf(RecipientType.TO, RecipientType.CC, RecipientType.BCC)
        } ?: false

        if (!hasRecipient) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST,
                "At least one recipient (TO, CC, or BCC) is required")
        }

        val mail = Mail(
            sender = mailRequest.sender,
            subject = mailRequest.subject,
            content = mailRequest.content,
            status = Mail.MailStatus.DRAFT,
            source = Mail.MailSource.INTERN
        )

        // Add recipients
        mailRequest.recipients?.forEach { recipientRequest ->
            val recipient = MailRecipient(
                address = recipientRequest.address,
                type = recipientRequest.type,
                mail = mail
            )
            mail.addRecipient(recipient)
        }

        // Add attachments if provided
        mailRequest.attachments?.forEach { attachmentRequest ->
            val attachment = Attachment(
                fileName = attachmentRequest.fileName,
                mimeType = attachmentRequest.mimeType,
                size = attachmentRequest.size,
                mail = mail
            )
            mail.addAttachment(attachment)
        }

        logger.info("Creating new mail with {} recipients", mail.recipients.size)
        return mailRepository.save(mail)
    }

    /**
     * Updates an existing mail.
     *
     * Only mails with DRAFT status can be modified. Sent mails are read-only.
     * Updates the subject, content, sender, and recipients fields.
     *
     * @param id The unique identifier of the mail to update.
     * @param updateRequest The update request with new values.
     * @return The updated Mail entity.
     * @throws ResponseStatusException with NOT_FOUND if mail doesn't exist.
     * @throws ResponseStatusException with FORBIDDEN if mail is already sent.
     * @throws ResponseStatusException with BAD_REQUEST if no recipients provided.
     */
    @PutMapping("/{id}")
    fun updateMail(@PathVariable id: Long, @Valid @RequestBody updateRequest: MailUpdateRequest): Mail {
        val existingMail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        if (existingMail.status != Mail.MailStatus.DRAFT) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Only draft mails can be modified")
        }

        // Validate that at least one recipient exists if recipients are being updated
        if (updateRequest.recipients != null) {
            val hasRecipient = updateRequest.recipients.any {
                it.type in listOf(RecipientType.TO, RecipientType.CC, RecipientType.BCC)
            }
            if (!hasRecipient) {
                throw ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "At least one recipient (TO, CC, or BCC) is required")
            }

            // Clear existing recipients and add new ones
            existingMail.recipients.clear()
            updateRequest.recipients.forEach { recipientRequest ->
                val recipient = MailRecipient(
                    address = recipientRequest.address,
                    type = recipientRequest.type,
                    mail = existingMail
                )
                existingMail.addRecipient(recipient)
            }
        }

        existingMail.subject = updateRequest.subject
        existingMail.content = updateRequest.content
        existingMail.sender = updateRequest.sender

        logger.info("Updated mail {} with {} recipients", id, existingMail.recipients.size)
        return mailRepository.save(existingMail)
    }

    /**
     * Permanently deletes a mail.
     *
     * Removes the mail and all associated recipients and attachments (cascade delete).
     *
     * @param id The unique identifier of the mail to delete.
     * @throws ResponseStatusException with NOT_FOUND if mail doesn't exist.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteMail(@PathVariable id: Long) {
        if (!mailRepository.existsById(id)) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND)
        }
        mailRepository.deleteById(id)
    }

    /**
     * Sends a mail by triggering the mocked transmission process.
     *
     * Only mails with DRAFT status can be sent. The transmission is mocked
     * with a 90% success rate. Successfully sent mails have their status
     * changed to SENT and sentAt timestamp set. Failed transmissions result
     * in ERROR status.
     *
     * @param id The unique identifier of the mail to send.
     * @return The Mail entity with updated status (SENT or ERROR).
     * @throws ResponseStatusException with BAD_REQUEST if mail is not in DRAFT status.
     * @throws ResponseStatusException with NOT_FOUND if mail doesn't exist.
     */
    @PostMapping("/{id}/send")
    fun sendMail(@PathVariable id: Long): Mail {
        return try {
            mailService.sendMail(id)
        } catch (e: IllegalStateException) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, e.message)
        } catch (e: NoSuchElementException) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, e.message)
        }
    }

    // ==================== ATTACHMENT MANAGEMENT ====================

    /**
     * Retrieves all attachments for a specific mail.
     *
     * @param id The unique identifier of the mail.
     * @return List of attachments associated with the mail.
     * @throws ResponseStatusException with NOT_FOUND if mail doesn't exist.
     */
    @GetMapping("/{id}/attachments")
    fun getAttachments(@PathVariable id: Long): List<Attachment> {
        val mail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }
        return mail.attachments
    }

    /**
     * Uploads a file attachment to a mail.
     *
     * Only mails with DRAFT status can have attachments added.
     * Accepts multipart file uploads (PDF, Word, images, etc.).
     * Maximum file size is configured in application.properties.
     *
     * @param id The unique identifier of the mail.
     * @param file The uploaded file.
     * @return The updated Mail entity with the new attachment.
     * @throws ResponseStatusException with NOT_FOUND if mail doesn't exist.
     * @throws ResponseStatusException with FORBIDDEN if mail is already sent.
     * @throws ResponseStatusException with BAD_REQUEST if file is empty.
     */
    @PostMapping("/{id}/attachments")
    @ResponseStatus(HttpStatus.CREATED)
    fun uploadAttachment(@PathVariable id: Long, @RequestPart("file") file: MultipartFile): Mail {
        val mail = mailRepository.findById(id)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        if (mail.status != Mail.MailStatus.DRAFT) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "Can only add attachments to draft mails")
        }

        if (file.isEmpty) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty")
        }

        val attachment = Attachment(
            fileName = file.originalFilename ?: "unknown",
            mimeType = file.contentType ?: "application/octet-stream",
            size = file.size,
            data = file.bytes,
            mail = mail
        )
        mail.addAttachment(attachment)

        logger.info("Uploaded attachment '{}' ({} bytes) to mail {}", attachment.fileName, attachment.size, id)
        return mailRepository.save(mail)
    }

    /**
     * Downloads a specific attachment file from a mail.
     *
     * Returns the binary file content with appropriate headers for browser download.
     *
     * @param mailId The unique identifier of the mail.
     * @param attachmentId The unique identifier of the attachment.
     * @return ResponseEntity containing the file bytes and download headers.
     * @throws ResponseStatusException with NOT_FOUND if mail or attachment doesn't exist.
     */
    @GetMapping("/{mailId}/attachments/{attachmentId}/download")
    fun downloadAttachment(@PathVariable mailId: Long, @PathVariable attachmentId: Long): ResponseEntity<ByteArray> {
        val mail = mailRepository.findById(mailId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

        val attachment = mail.attachments.find { it.id == attachmentId }
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found")

        val data = attachment.data
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment content not available")

        val headers = HttpHeaders().apply {
            contentType = MediaType.parseMediaType(attachment.mimeType)
            contentDisposition = ContentDisposition.attachment()
                .filename(attachment.fileName)
                .build()
            contentLength = attachment.size
        }

        logger.info("Downloading attachment '{}' from mail {}", attachment.fileName, mailId)
        return ResponseEntity(data, headers, HttpStatus.OK)
    }

    /**
     * Deletes an attachment from a mail.
     *
     * Only mails with DRAFT status can have attachments deleted.
     *
     * @param mailId The unique identifier of the mail.
     * @param attachmentId The unique identifier of the attachment to delete.
     * @throws ResponseStatusException with NOT_FOUND if mail or attachment doesn't exist.
     * @throws ResponseStatusException with FORBIDDEN if mail is not in DRAFT status.
     */
    @DeleteMapping("/{mailId}/attachments/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteAttachment(@PathVariable mailId: Long, @PathVariable attachmentId: Long) {
        val mail = mailRepository.findById(mailId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "Mail not found") }

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
