package de.thm.mni.mailsystem.service

import de.thm.mni.mailsystem.model.Mail
import de.thm.mni.mailsystem.repository.MailRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import kotlin.random.Random

/**
 * Service class for mail business logic.
 *
 * Handles the business logic for mail operations, particularly the
 * sending process which includes status transitions and mocked transmission.
 *
 * @property mailRepository Repository for mail data access.
 */
@Service
class MailService(private val mailRepository: MailRepository) {

    /**
     * Sends a mail by mocking the transmission process.
     *
     * This method simulates mail transmission with a 90% success rate.
     * Only mails with DRAFT status can be sent. On success, the mail status
     * is changed to SENT and the sentAt timestamp is set. On failure,
     * the status is changed to ERROR.
     *
     * @param id The unique identifier of the mail to send.
     * @return The updated Mail entity with new status (SENT or ERROR).
     * @throws NoSuchElementException if the mail with the given ID doesn't exist.
     * @throws IllegalStateException if the mail is not in DRAFT status.
     */
    @Transactional
    fun sendMail(id: Long): Mail {
        val mail = mailRepository.findById(id)
            .orElseThrow { NoSuchElementException("Mail with ID $id not found") }

        // Logic constraint: Only drafts can be sent
        if (mail.status != Mail.MailStatus.DRAFT) {
            throw IllegalStateException("Only mails with status DRAFT can be sent.")
        }

        // --- MOCKING THE COMPONENT ---
        // We simulate a transmission that succeeds 90% of the time.
        val isSuccessful = Random.nextInt(1, 11) <= 9

        if (isSuccessful) {
            mail.status = Mail.MailStatus.SENT
            mail.sentAt = LocalDateTime.now()
        } else {
            mail.status = Mail.MailStatus.ERROR
        }

        return mailRepository.save(mail)
    }
}