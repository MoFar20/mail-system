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
 * Database initialization component that seeds the mail system with sample data on application startup.
 *
 * ## Architecture Role (3-Tier Spring Boot Application)
 *
 * **Layer Classification:** Infrastructure/Initialization Layer
 *
 * This component bridges the initialization phase between application startup and the service layer:
 * - **Trigger:** Implements [CommandLineRunner] to execute after Spring context initialization
 * - **Scope:** Non-production initialization (development/testing support)
 * - **Purpose:** Provides consistent test data for demonstration and manual testing
 *
 * ## Data Population Strategy
 *
 * This seeder creates:
 * - 3 test user accounts with different roles (student, professor, administrator)
 * - 6 sample emails demonstrating various system features (drafts, sent, received, external)
 * - Email relationships (recipients, attachments, multiple recipient types)
 *
 * ## Idempotency
 *
 * Both [seedUsers] and [seedMails] check if data already exists before creating records.
 * This allows safe repeated application restarts without duplicate data pollution.
 *
 * @property userRepository Repository for user entity persistence and queries
 * @property mailRepository Repository for mail entity persistence and queries
 * @property passwordEncoder BCrypt encoder for secure password hashing (never store plain text)
 *
 * @see CommandLineRunner
 * @see Transactional
 */
@Component
class DataSeeder(
    private val userRepository: UserRepository,
    private val mailRepository: MailRepository,
    private val passwordEncoder: BCryptPasswordEncoder
) : CommandLineRunner {

    private val logger = LoggerFactory.getLogger(DataSeeder::class.java)

    /**
     * Main entry point executed by Spring Boot on application startup.
     *
     * Orchestrates the database seeding sequence:
     * 1. Populates user table with test accounts
     * 2. Populates mail table with sample emails
     *
     * **Transactional Guarantee:**
     * If any step fails, the entire operation is rolled back, maintaining database consistency.
     *
     * @param args Command line arguments passed to the Spring Boot application (unused but required by interface)
     *
     * @see seedUsers
     * @see seedMails
     */
    @Transactional
    override fun run(vararg args: String) {
        seedUsers()
        seedMails()
    }

    /**
     * Populates the user table with test credentials if empty.
     *
     * **Pre-Condition Check:**
     * Only creates users if the user table is empty ([userRepository.count] == 0).
     * This prevents duplicate records on repeated application starts.
     *
     * **Test Credentials Created:**
     * - `student@thm.de` / `password123` - Regular user role (student)
     * - `prof@thm.de` / `password123` - Educator/instructor role (professor)
     * - `admin@thm.de` / `admin123` - Administrator role with different password
     *
     * **Security Note:**
     * All passwords are hashed using BCrypt before persistence.
     * The [passwordEncoder.encode] method generates a secure hash from plain text.
     *
     * **Logging:**
     * INFO level log records the number of users created for audit trail.
     *
     * @see BCryptPasswordEncoder
     * @see UserRepository.saveAll
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
     * Populates the mail table with sample emails demonstrating system features if empty.
     *
     * **Pre-Condition Check:**
     * Only creates emails if the mail table is empty ([mailRepository.count] == 0).
     * This prevents duplicate sample data on repeated starts.
     *
     * **Sample Emails Hierarchy:**
     *
     * **Email 1 - Welcome Message (SENT, INTERNAL)**
     * - From: admin@thm.de → To: student@thm.de
     * - Demonstrates: Received mail, single recipient (TO type), past timestamp
     * - Status: SENT (simulated as delivered 5 days ago)
     *
     * **Email 2 - Course Notification (SENT, INTERNAL)**
     * - From: prof@thm.de → To: student@thm.de
     * - Demonstrates: Professor-to-student communication, course update
     * - Status: SENT (delivered 2 days ago)
     *
     * **Email 3 - External Alert (SENT, EXTERNAL, WITH ATTACHMENT)**
     * - From: noreply@github.com → To: student@thm.de
     * - Demonstrates: External mail source, attachment metadata, security notification
     * - Attachment: "security_log.txt" (1024 bytes, text/plain)
     * - Status: SENT (delivered 1 day ago)
     *
     * **Email 4 - Unsent Draft (DRAFT, INTERNAL)**
     * - From: student@thm.de → To: prof@thm.de
     * - Demonstrates: Composition in progress, not yet sent, editable state
     * - Status: DRAFT (no sentAt timestamp)
     *
     * **Email 5 - Newsletter (SENT, MULTIPLE RECIPIENTS: TO + CC)**
     * - From: news@thm.de → To: student@thm.de, CC: prof@thm.de
     * - Demonstrates: Multiple recipient types (TO, CC), institutional communication
     * - Status: SENT (delivered ~12 hours ago)
     *
     * **Email 6 - Student-to-Professor (SENT, INTERNAL)**
     * - From: student@thm.de → To: prof@thm.de
     * - Demonstrates: Sent mail from user perspective, communication pattern
     * - Status: SENT (delivered 3 days ago)
     *
     * **Logging:**
     * INFO level log records the number of emails created for audit trail.
     *
     * **Relationship Management:**
     * Each mail properly establishes bidirectional relationships:
     * - Recipients linked to mail via [Mail.addRecipient]
     * - Attachments linked to mail via [Mail.addAttachment]
     *
     * @see Mail
     * @see MailRecipient
     * @see Attachment
     * @see MailRepository.saveAll
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