package de.thm.mni.mailsystem.controller

import de.thm.mni.mailsystem.dto.*
import de.thm.mni.mailsystem.service.MailService
import jakarta.validation.Valid
import org.springframework.http.ContentDisposition
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.web.bind.annotation.*
import org.springframework.web.multipart.MultipartFile
import org.springframework.web.server.ResponseStatusException
import io.swagger.v3.oas.annotations.security.SecurityRequirement

@RestController
@RequestMapping("/api/mails")
@SecurityRequirement(name = "bearer-jwt")
class MailController(private val mailService: MailService) {

    private fun getAuthenticatedEmail(): String {
        return SecurityContextHolder.getContext().authentication?.name
            ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated")
    }

    @GetMapping
    fun getAllMails(): List<MailDto> {
        return mailService.getAllMails(getAuthenticatedEmail())
    }

    @GetMapping("/inbox")
    fun getInbox(): List<MailDto> {
        return mailService.getInbox(getAuthenticatedEmail())
    }

    @GetMapping("/sent")
    fun getSentMails(): List<MailDto> {
        return mailService.getSentMails(getAuthenticatedEmail())
    }

    @GetMapping("/drafts")
    fun getDrafts(): List<MailDto> {
        return mailService.getDrafts(getAuthenticatedEmail())
    }

    @GetMapping("/{id}")
    fun getMailById(@PathVariable id: Long): MailDto {
        return mailService.getMailById(id, getAuthenticatedEmail())
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createMail(@Valid @RequestBody mailRequest: MailCreateRequest): MailDto {
        return mailService.createMail(mailRequest)
    }

    @PutMapping("/{id}")
    fun updateMail(@PathVariable id: Long, @Valid @RequestBody updateRequest: MailUpdateRequest): MailDto {
        return mailService.updateMail(id, updateRequest, getAuthenticatedEmail())
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteMail(@PathVariable id: Long) {
        mailService.deleteMail(id, getAuthenticatedEmail())
    }

    @PostMapping("/{id}/send")
    fun sendMail(@PathVariable id: Long): MailDto {
        return mailService.sendMail(id, getAuthenticatedEmail())
    }

    @GetMapping("/{id}/attachments")
    fun getAttachments(@PathVariable id: Long): List<AttachmentDto> {
        return mailService.getAttachments(id, getAuthenticatedEmail())
    }

    @PostMapping("/{id}/attachments")
    @ResponseStatus(HttpStatus.CREATED)
    fun uploadAttachment(@PathVariable id: Long, @RequestPart("file") file: MultipartFile): MailDto {
        return mailService.uploadAttachment(id, file, getAuthenticatedEmail())
    }

    @GetMapping("/{mailId}/attachments/{attachmentId}/download")
    fun downloadAttachment(@PathVariable mailId: Long, @PathVariable attachmentId: Long): ResponseEntity<ByteArray> {
        val attachmentData = mailService.downloadAttachment(mailId, attachmentId, getAuthenticatedEmail())

        val headers = HttpHeaders().apply {
            contentType = MediaType.parseMediaType(attachmentData.mimeType)
            contentDisposition = ContentDisposition.attachment()
                .filename(attachmentData.fileName)
                .build()
            contentLength = attachmentData.size
        }

        return ResponseEntity(attachmentData.data, headers, HttpStatus.OK)
    }

    @DeleteMapping("/{mailId}/attachments/{attachmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteAttachment(@PathVariable mailId: Long, @PathVariable attachmentId: Long) {
        mailService.deleteAttachment(mailId, attachmentId, getAuthenticatedEmail())
    }
}