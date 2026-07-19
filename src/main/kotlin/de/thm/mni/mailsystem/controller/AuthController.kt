package de.thm.mni.mailsystem.controller

import de.thm.mni.mailsystem.config.JwtUtils
import de.thm.mni.mailsystem.dto.LoginRequest
import de.thm.mni.mailsystem.dto.RegisterRequest
import de.thm.mni.mailsystem.dto.RegisterResponse
import de.thm.mni.mailsystem.model.User
import de.thm.mni.mailsystem.repository.UserRepository
import io.github.bucket4j.Bandwidth
import io.github.bucket4j.Bucket
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import io.swagger.v3.oas.annotations.security.SecurityRequirements
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * REST controller for authentication operations.
 *
 * Handles user authentication, registration, and JWT token generation.
 * All endpoints are publicly accessible (configured in SecurityConfig).
 *
 * @property userRepository Repository for user data access.
 * @property passwordEncoder BCrypt encoder for password hashing and validation.
 * @property jwtUtils Utility for JWT token operations.
 */
@RestController
@RequestMapping("/api/auth")
@SecurityRequirements()
class AuthController(
    private val userRepository: UserRepository,
    private val passwordEncoder: BCryptPasswordEncoder,
    private val jwtUtils: JwtUtils
) {
    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    private val loginBuckets = ConcurrentHashMap<String, Bucket>()
    private val registerBuckets = ConcurrentHashMap<String, Bucket>()

    private fun newLoginBucket(): Bucket = Bucket.builder()
        .addLimit(
            Bandwidth.builder()
                .capacity(10)
                .refillIntervally(10, Duration.ofMinutes(1))
                .build()
        )
        .build()

    private fun newRegisterBucket(): Bucket = Bucket.builder()
        .addLimit(
            Bandwidth.builder()
                .capacity(5)
                .refillIntervally(5, Duration.ofMinutes(10))
                .build()
        )
        .build()

    /**
     * Registers a new user account.
     *
     * Creates a new user with the provided email and password. The password
     * is hashed using BCrypt before storage. The email must be unique.
     * Emails are stored in lowercase for case-insensitive comparison.
     *
     * @param registerRequest Registration data containing mail, firstname, lastname, and password.
     * @param httpRequest The HTTP servlet request (used for rate limiting by IP).
     * @return RegisterResponse with success message and mail.
     * @throws ResponseStatusException with CONFLICT if mail already exists.
     * @throws ResponseStatusException with BAD_REQUEST if validation fails.
     * @throws ResponseStatusException with TOO_MANY_REQUESTS if rate limit exceeded.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody registerRequest: RegisterRequest, httpRequest: HttpServletRequest): RegisterResponse {
        val ip = httpRequest.remoteAddr
        val bucket = registerBuckets.computeIfAbsent(ip) { newRegisterBucket() }
        if (!bucket.tryConsume(1)) {
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many registration attempts. Please try again later.")
        }

        // Normalize email to lowercase for case-insensitive comparison
        val normalizedEmail = registerRequest.mail.lowercase()

        // Check if user already exists (case-insensitive)
        if (userRepository.findByMail(normalizedEmail).isPresent) {
            logger.warn("Registration attempt with existing mail: {}", normalizedEmail)
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "An account with this email address already exists"
            )
        }

        // Create new user with hashed password
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
     * Authenticates a user and returns a JWT token.
     *
     * Validates the provided mail and password against the database.
     * If credentials are valid, generates and returns a JWT token.
     * Email comparison is case-insensitive.
     *
     * @param loginRequest DTO containing mail and password fields with validation.
     * @param httpRequest The HTTP servlet request (used for rate limiting by IP).
     * @return Map containing the JWT token with key "token".
     * @throws ResponseStatusException with UNAUTHORIZED if credentials are invalid.
     * @throws ResponseStatusException with TOO_MANY_REQUESTS if rate limit exceeded.
     */
    @PostMapping("/login")
    fun login(@Valid @RequestBody loginRequest: LoginRequest, httpRequest: HttpServletRequest): Map<String, String> {
        val ip = httpRequest.remoteAddr
        val bucket = loginBuckets.computeIfAbsent(ip) { newLoginBucket() }
        if (!bucket.tryConsume(1)) {
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.")
        }

        val normalizedEmail = loginRequest.mail.lowercase()
        val password = loginRequest.password

        val user = userRepository.findByMail(normalizedEmail)
            .orElseThrow {
                logger.warn("Login attempt with non-existent mail: {}", normalizedEmail)
                ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
            }

        if (passwordEncoder.matches(password, user.passwordHash)) {
            val token = jwtUtils.generateToken(normalizedEmail)
            logger.info("User logged in: {}", normalizedEmail)
            return mapOf("token" to token, "firstname" to user.firstname, "lastname" to user.lastname)
        } else {
            logger.warn("Login attempt with invalid password for user: {}", normalizedEmail)
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
        }
    }
}