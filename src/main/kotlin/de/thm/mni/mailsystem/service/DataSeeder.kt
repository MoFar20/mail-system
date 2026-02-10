package de.thm.mni.mailsystem.service

import de.thm.mni.mailsystem.model.*
import de.thm.mni.mailsystem.repository.*
import org.slf4j.LoggerFactory
import org.springframework.boot.CommandLineRunner
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.time.LocalDateTime
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder

/**
 * Data seeder that initializes the database with sample data on application startup.
 *
 * Creates test users and sample emails with various statuses to demonstrate
 * the functionality of the mail system.
 */
@Component
class DataSeeder(
    private val userRepository: UserRepository,
    private val mailRepository: MailRepository,
    private val passwordEncoder: BCryptPasswordEncoder
) : CommandLineRunner {

    private val logger = LoggerFactory.getLogger(DataSeeder::class.java)

    /**
     * Executes on application startup to seed the database with test data.
     */
    @Transactional
    override fun run(vararg args: String) {
        seedUsers()
        seedMails()
    }

    /**
     * Creates test users if the user table is empty.
     */
    private fun seedUsers() {
        if (userRepository.count() == 0L) {
            val users = listOf(
                User(username = "student@thm.de", passwordHash = passwordEncoder.encode("password123")!!),
                User(username = "prof@thm.de", passwordHash = passwordEncoder.encode("password123")!!),
                User(username = "admin@thm.de", passwordHash = passwordEncoder.encode("admin123")!!)
            )
            userRepository.saveAll(users)
            logger.info("Created {} test users", users.size)
        }
    }

    /**
     * Creates sample emails if the mail table is empty.
     */
    private fun seedMails() {
        if (mailRepository.count() == 0L) {
            val mails = mutableListOf<Mail>()

            // Mail 1: Welcome email to student
            val welcomeMail = Mail(
                sender = "admin@thm.de",
                subject = "Willkommen im THM Mail-System",
                content = """
                    Sehr geehrte/r Studierende/r,
                    
                    herzlich willkommen im neuen Mail-System der THM!
                    
                    Mit diesem System können Sie:
                    - E-Mails empfangen und lesen
                    - Neue Nachrichten verfassen
                    - Entwürfe speichern
                    - Nachrichten an andere Benutzer senden
                    
                    Bei Fragen wenden Sie sich bitte an den Support.
                    
                    Mit freundlichen Grüßen,
                    Ihr THM IT-Team
                """.trimIndent(),
                status = Mail.MailStatus.SENT,
                source = Mail.MailSource.INTERN,
                sentAt = LocalDateTime.now().minusDays(5)
            )
            welcomeMail.addRecipient(MailRecipient(address = "student@thm.de", type = RecipientType.TO, mail = welcomeMail))
            mails.add(welcomeMail)

            // Mail 2: Course notification
            val courseMail = Mail(
                sender = "prof@thm.de",
                subject = "WebTech Vorlesung - Wichtige Ankündigung",
                content = """
                    Liebe Studierende,
                    
                    bitte beachten Sie, dass die WebTech Vorlesung am kommenden Montag 
                    ausnahmsweise um 10:00 Uhr statt um 08:00 Uhr beginnt.
                    
                    Thema: REST APIs mit Spring Boot
                    
                    Bitte bringen Sie Ihre Laptops mit, da wir praktische Übungen 
                    durchführen werden.
                    
                    Viele Grüße,
                    Prof. Dr. Müller
                """.trimIndent(),
                status = Mail.MailStatus.SENT,
                source = Mail.MailSource.INTERN,
                sentAt = LocalDateTime.now().minusDays(2)
            )
            courseMail.addRecipient(MailRecipient(address = "student@thm.de", type = RecipientType.TO, mail = courseMail))
            mails.add(courseMail)

            // Mail 3: External mail (GitHub notification)
            val githubMail = Mail(
                sender = "noreply@github.com",
                subject = "[GitHub] Security Alert - New Sign-in",
                content = """
                    Hello,
                    
                    A new sign-in was detected on your GitHub account.
                    
                    Location: Gießen, Germany
                    Device: Chrome on Windows
                    Time: ${LocalDateTime.now().minusDays(1)}
                    
                    If this was you, you can ignore this message.
                    If you didn't sign in, please secure your account immediately.
                    
                    - The GitHub Team
                """.trimIndent(),
                status = Mail.MailStatus.SENT,
                source = Mail.MailSource.EXTERN,
                sentAt = LocalDateTime.now().minusDays(1)
            )
            githubMail.addRecipient(MailRecipient(address = "student@thm.de", type = RecipientType.TO, mail = githubMail))
            githubMail.addAttachment(Attachment(fileName = "security_log.txt", mimeType = "text/plain", size = 1024, mail = githubMail))
            mails.add(githubMail)

            // Mail 4: Draft email from student
            val draftMail = Mail(
                sender = "student@thm.de",
                subject = "Frage zur Projektabgabe",
                content = """
                    Sehr geehrter Herr Prof. Dr. Müller,
                    
                    ich habe eine Frage bezüglich der Projektabgabe für WebTech:
                    
                    Sollen wir das Projekt als ZIP-Datei hochladen oder ein 
                    Git-Repository verwenden?
                    
                    Mit freundlichen Grüßen,
                    Max Mustermann
                """.trimIndent(),
                status = Mail.MailStatus.DRAFT,
                source = Mail.MailSource.INTERN
            )
            draftMail.addRecipient(MailRecipient(address = "prof@thm.de", type = RecipientType.TO, mail = draftMail))
            mails.add(draftMail)

            // Mail 5: Newsletter
            val newsletterMail = Mail(
                sender = "news@thm.de",
                subject = "THM Newsletter - Dezember 2025",
                content = """
                    THM Newsletter - Dezember 2025
                    ================================
                    
                    Liebe Studierende und Mitarbeitende,
                    
                    hier die wichtigsten News des Monats:
                    
                    📚 Prüfungszeitraum
                    Der Prüfungszeitraum beginnt am 15. Januar 2026.
                    Anmeldeschluss ist der 31. Dezember 2025.
                    
                    🎄 Weihnachtsferien
                    Die Hochschule ist vom 23.12.2025 bis 02.01.2026 geschlossen.
                    
                    💻 Neues IT-System
                    Das neue Mail-System ist jetzt verfügbar!
                    
                    Frohe Feiertage wünscht
                    Ihre THM
                """.trimIndent(),
                status = Mail.MailStatus.SENT,
                source = Mail.MailSource.INTERN,
                sentAt = LocalDateTime.now().minusHours(12)
            )
            newsletterMail.addRecipient(MailRecipient(address = "student@thm.de", type = RecipientType.TO, mail = newsletterMail))
            newsletterMail.addRecipient(MailRecipient(address = "prof@thm.de", type = RecipientType.CC, mail = newsletterMail))
            mails.add(newsletterMail)

            // Mail 6: Sent mail by student
            val sentByStudent = Mail(
                sender = "student@thm.de",
                subject = "Krankmeldung für heute",
                content = """
                    Sehr geehrter Herr Prof. Dr. Müller,
                    
                    leider bin ich heute erkrankt und kann nicht an der Vorlesung teilnehmen.
                    
                    Ich werde die Materialien nacharbeiten.
                    
                    Mit freundlichen Grüßen,
                    Max Mustermann
                """.trimIndent(),
                status = Mail.MailStatus.SENT,
                source = Mail.MailSource.INTERN,
                sentAt = LocalDateTime.now().minusDays(3)
            )
            sentByStudent.addRecipient(MailRecipient(address = "prof@thm.de", type = RecipientType.TO, mail = sentByStudent))
            mails.add(sentByStudent)

            mailRepository.saveAll(mails)
            logger.info("Created {} sample emails", mails.size)
        }
    }
}