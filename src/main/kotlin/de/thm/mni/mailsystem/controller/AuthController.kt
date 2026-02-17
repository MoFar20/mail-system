package de.thm.mni.mailsystem.controller

import de.thm.mni.mailsystem.config.JwtUtils
import de.thm.mni.mailsystem.dto.RegisterRequest
import de.thm.mni.mailsystem.dto.RegisterResponse
import de.thm.mni.mailsystem.model.User
import de.thm.mni.mailsystem.repository.UserRepository
import jakarta.validation.Valid
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

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
@CrossOrigin(origins = ["http://localhost:4200"])
class AuthController(
    private val userRepository: UserRepository,
    private val passwordEncoder: BCryptPasswordEncoder,
    private val jwtUtils: JwtUtils
) {
    private val logger = LoggerFactory.getLogger(AuthController::class.java)

    /**
     * Registers a new user account.
     *
     * Creates a new user with the provided email and password. The password
     * is hashed using BCrypt before storage. The email must be unique.
     * Emails are stored in lowercase for case-insensitive comparison.
     *
     * @param registerRequest Registration data containing username and password.
     * @return RegisterResponse with success message and username.
     * @throws ResponseStatusException with CONFLICT if username already exists.
     * @throws ResponseStatusException with BAD_REQUEST if validation fails.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody registerRequest: RegisterRequest): RegisterResponse {
        // Normalize email to lowercase for case-insensitive comparison
        val normalizedEmail = registerRequest.username.lowercase()

        // Check if user already exists (case-insensitive)
        if (userRepository.findByUsername(normalizedEmail).isPresent) {
            logger.warn("Registration attempt with existing username: {}", normalizedEmail)
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "An account with this email address already exists"
            )
        }

        // Create new user with hashed password
        val hashedPassword = passwordEncoder.encode(registerRequest.password)
            ?: throw ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Password encoding failed")

        val newUser = User(
            username = normalizedEmail,  // Store email in lowercase
            passwordHash = hashedPassword
        )

        userRepository.save(newUser)
        logger.info("New user registered: {}", normalizedEmail)

        return RegisterResponse(
            message = "Account created successfully. You can now log in.",
            username = normalizedEmail
        )
    }

    /**
     * Authenticates a user and returns a JWT token.
     *
     * Validates the provided username and password against the database.
     * If credentials are valid, generates and returns a JWT token.
     * Email comparison is case-insensitive.
     *
     * @param loginRequest Map containing "username" and "password" keys.
     * @return Map containing the JWT token with key "token".
     * @throws ResponseStatusException with BAD_REQUEST if username or password is missing.
     * @throws ResponseStatusException with UNAUTHORIZED if credentials are invalid.
     */
    @PostMapping("/login")
    fun login(@RequestBody loginRequest: Map<String, String>): Map<String, String> {
        val username = loginRequest["username"]
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required")

        // Normalize email to lowercase for case-insensitive comparison
        val normalizedEmail = username.lowercase()
        val password = loginRequest["password"]
            ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Password is required")

        val user = userRepository.findByUsername(normalizedEmail)
            .orElseThrow {
                logger.warn("Login attempt with non-existent username: {}", normalizedEmail)
                ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
            }

        // Check password
        if (passwordEncoder.matches(password, user.passwordHash)) {
            val token = jwtUtils.generateToken(normalizedEmail)
            logger.info("User logged in: {}", username)
            return mapOf("token" to token)
        } else {
            logger.warn("Login attempt with invalid password for user: {}", username)
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials")
        }
    }
}