package de.thm.mni.mailsystem.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * Data Transfer Object for user registration.
 *
 * Used to receive registration requests from clients with proper validation.
 *
 * @property username The email address to use as username (must be unique).
 * @property password The password for the account (minimum 8 characters).
 */
data class RegisterRequest(
    @field:NotBlank(message = "Username/Email is required")
    @field:Email(message = "Username must be a valid email address")
    val username: String,

    @field:NotBlank(message = "Password is required")
    @field:Size(min = 8, message = "Password must be at least 8 characters long")
    val password: String
)

/**
 * Data Transfer Object for user registration response.
 *
 * @property message Success or error message.
 * @property username The registered username (email).
 */
data class RegisterResponse(
    val message: String,
    val username: String? = null
)
