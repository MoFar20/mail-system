package de.thm.mni.mailsystem

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

/**
 * Main application class for the THM Mail System.
 *
 * Bootstraps the Spring Boot application with auto-configuration,
 * component scanning, and JPA entity management.
 */
@SpringBootApplication
class MailSystemApplication

/**
 * Application entry point.
 *
 * @param args Command-line arguments passed to the Spring Boot application.
 */
fun main(args: Array<String>) {
    runApplication<MailSystemApplication>(*args)
}
