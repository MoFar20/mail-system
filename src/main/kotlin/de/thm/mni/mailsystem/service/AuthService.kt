package de.thm.mni.mailsystem.service

import de.thm.mni.mailsystem.config.JwtUtils
import de.thm.mni.mailsystem.dto.LoginRequest
import de.thm.mni.mailsystem.dto.LoginResponse
import de.thm.mni.mailsystem.dto.RegisterRequest
import de.thm.mni.mailsystem.dto.RegisterResponse
import de.thm.mni.mailsystem.model.User
import de.thm.mni.mailsystem.repository.UserRepository
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

/**
 * Service layer for authentication operations.
 *
 * ## Architecture Role (3-Tier Spring Boot Application)
 *
 * **Layer Classification:** Business Logic (Service) Layer
 *
 * Owns all authentication business rules and delegates persistence to [UserRepository]:
 * - **Registration:** email normalisation, uniqueness check, password hashing, user creation
 * - **Login:** credential validation, JWT generation
 *
 * Rate limiting is intentionally kept in the controller (it is an HTTP/infrastructure concern
 * tied to [jakarta.servlet.http.HttpServletRequest] and does not belong to business logic).
 *
 * @property userRepository Repository for user persistence operations.
 * @property passwordEncoder BCrypt encoder for password hashing and verification.
 * @property jwtUtils Utility for JWT token generation.
 */
@Service
class AuthService(
    private val userRepository: UserRepository,
    private val passwordEncoder: BCryptPasswordEncoder,
    private val jwtUtils: JwtUtils
) {
    private val logger = LoggerFactory.getLogger(AuthService::class.java)

    /**
     * Registers a new user account.
     *
     * Business rules enforced:
     * - Email address is normalised to lowercase before persistence.
     * - The email must be unique across all accounts (HTTP 409 CONFLICT otherwise).
     * - Password is hashed with BCrypt before storage; the plain-text value is never persisted.
     *
     * @param registerRequest Validated registration data (firstname, lastname, mail, password).
     * @return [RegisterResponse] confirming the created account's email address.
     * @throws ResponseStatusException HTTP 409 if the email address is already registered.
     */
    fun register(registerRequest: RegisterRequest): RegisterResponse {
        val normalizedEmail = registerRequest.mail.lowercase()

        if (userRepository.findByMail(normalizedEmail).isPresent) {
            logger.warn("Registration attempt with existing mail: {}", normalizedEmail)
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "An account with this email address already exists"
            )
        }

        val hashedPassword = passwordEncoder.encode(registerRequest.password)
            ?: throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Password encoding failed")

        val newUser = User(
            firstname = registerRequest.firstname,
            lastname = registerRequest.lastname,
            mail = normalizedEmail,
            passwordHash = hashedPassword
        )

        userRepository.save(newUser)
        logger.info("New user registered: {}", normalizedEmail)

        return RegisterResponse(
            message = "Account created successfully. You can now log in.",
            mail = normalizedEmail
        )
    }

    /**
     * Authenticates a user and returns a signed JWT.
     *
     * Business rules enforced:
     * - Email comparison is case-insensitive (normalised to lowercase).
     * - Both "user not found" and "wrong password" produce the same HTTP 401 response
     *   to avoid user-enumeration attacks.
     *
     * @param loginRequest Validated login data (mail, password).
     * @return [LoginResponse] containing the JWT token and the user's display name.
     * @throws ResponseStatusException HTTP 401 if credentials are invalid.
     */
    fun login(loginRequest: LoginRequest): LoginResponse {
        val normalizedEmail = loginRequest.mail.lowercase()

        val user = userRepository.findByMail(normalizedEmail).orElseThrow {
            logger.warn("Login attempt with non-existent mail: {}", normalizedEmail)
            ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
        }

        if (!passwordEncoder.matches(loginRequest.password, user.passwordHash)) {
            logger.warn("Login attempt with invalid password for user: {}", normalizedEmail)
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
        }

        val token = jwtUtils.generateToken(normalizedEmail)
        logger.info("User logged in: {}", normalizedEmail)
        return LoginResponse(token = token, firstname = user.firstname, lastname = user.lastname)
    }
}
