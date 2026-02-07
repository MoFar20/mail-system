package de.thm.mni.mailsystem.repository

import de.thm.mni.mailsystem.model.Mail
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.stereotype.Repository

@Repository
interface MailRepository : JpaRepository<Mail, Long> {
    /**
     * Finds all mails where the given email address is a recipient.
     * Used for inbox functionality.
     */
    @Query("SELECT DISTINCT m FROM Mail m JOIN m.recipients r WHERE r.address = :email")
    fun findByRecipientEmail(@Param("email") email: String): List<Mail>

    /**
     * Finds all mails sent by the given email address.
     * Used for sent mail functionality.
     */
    fun findBySender(sender: String): List<Mail>

    /**
     * Finds all mails with a specific status for a user (as sender).
     * Used for drafts functionality.
     */
    fun findBySenderAndStatus(sender: String, status: Mail.MailStatus): List<Mail>

    /**
     * Finds all mails where the given email address is either the sender or a recipient.
     * Used for "All Mail" functionality scoped to the authenticated user.
     */
    @Query("SELECT DISTINCT m FROM Mail m LEFT JOIN m.recipients r WHERE m.sender = :email OR r.address = :email")
    fun findAllByUser(@Param("email") email: String): List<Mail>
}
/*@Repository
interface AttachmentRepository : JpaRepository<Attachment, Long>

@Repository
interface MailRecipientRepository : JpaRepository<MailRecipient, Long>*/