package de.thm.mni.mailsystem.controller

import de.thm.mni.mailsystem.dto.LoginRequest
import de.thm.mni.mailsystem.dto.LoginResponse
import de.thm.mni.mailsystem.dto.RegisterRequest
import de.thm.mni.mailsystem.dto.RegisterResponse
import de.thm.mni.mailsystem.service.AuthService
import io.github.bucket4j.Bandwidth
import io.github.bucket4j.Bucket
import io.swagger.v3.oas.annotations.security.SecurityRequirements
import jakarta.servlet.http.HttpServletRequest
import jakarta.validation.Valid
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import java.time.Duration
import java.util.concurrent.ConcurrentHashMap

/**
 * REST controller for authentication operations.
 *
 * Handles HTTP transport concerns only: request mapping, response status codes,
 * and IP-based rate limiting. All business logic (user lookup, password hashing,
 * JWT generation) is delegated to [AuthService].
 *
 * All endpoints are publicly accessible (configured in SecurityConfig).
 *
 * @property authService Service layer handling registration and login business logic.
 */
@RestController
@RequestMapping("/api/auth")
@SecurityRequirements()
class AuthController(private val authService: AuthService) {

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
     * @param registerRequest Registration data (firstname, lastname, mail, password).
     * @param httpRequest The HTTP servlet request used for IP-based rate limiting.
     * @return [RegisterResponse] with a success message and the registered email.
     * @throws ResponseStatusException HTTP 429 if the rate limit for this IP is exceeded.
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    fun register(@Valid @RequestBody registerRequest: RegisterRequest, httpRequest: HttpServletRequest): RegisterResponse {
        val bucket = registerBuckets.computeIfAbsent(httpRequest.remoteAddr) { newRegisterBucket() }
        if (!bucket.tryConsume(1)) {
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many registration attempts. Please try again later.")
        }
        return authService.register(registerRequest)
    }

    /**
     * Authenticates a user and returns a JWT token.
     *
     * @param loginRequest Login credentials (mail, password).
     * @param httpRequest The HTTP servlet request used for IP-based rate limiting.
     * @return [LoginResponse] containing the JWT token and the user's display name.
     * @throws ResponseStatusException HTTP 429 if the rate limit for this IP is exceeded.
     */
    @PostMapping("/login")
    fun login(@Valid @RequestBody loginRequest: LoginRequest, httpRequest: HttpServletRequest): LoginResponse {
        val bucket = loginBuckets.computeIfAbsent(httpRequest.remoteAddr) { newLoginBucket() }
        if (!bucket.tryConsume(1)) {
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many login attempts. Please try again later.")
        }
        return authService.login(loginRequest)
    }
}
