package de.thm.mni.mailsystem.dto

import jakarta.validation.constraints.Email
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Size

/**
 * Data Transfer Object for user registration.
 *
 * Used to receive registration requests from clients with proper validation.
 *
 * @property firstname The user's first name.
 * @property lastname The user's last name.
 * @property mail The email address to use as account identifier (must be unique).
 * @property password The password for the account (minimum 8 characters).
 */
data class RegisterRequest(
    @field:NotBlank(message = "First name is required")
    val firstname: String,

    @field:NotBlank(message = "Last name is required")
    val lastname: String,

    @field:NotBlank(message = "Mail address is required")
    @field:Email(message = "Must be a valid email address")
    val mail: String,

    @field:NotBlank(message = "Password is required")
    @field:Size(min = 8, message = "Password must be at least 8 characters long")
    val password: String
)

/**
 * Data Transfer Object for user registration response.
 *
 * @property message Success or error message.
 * @property mail The registered mail address.
 */
data class RegisterResponse(
    val message: String,
    val mail: String? = null
)

/**
 * Data Transfer Object for user login.
 *
 * @property mail The email address of the user.
 * @property password The password of the user.
 */
data class LoginRequest(
    @field:NotBlank(message = "Mail address is required")
    @field:Email(message = "Must be a valid email address")
    val mail: String,

    @field:NotBlank(message = "Password is required")
    @field:Size(max = 128, message = "Password must not exceed 128 characters")
    val password: String
)