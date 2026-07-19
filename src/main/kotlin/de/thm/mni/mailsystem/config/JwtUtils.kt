package de.thm.mni.mailsystem.config

import io.jsonwebtoken.Jwts
import io.jsonwebtoken.security.Keys
import jakarta.annotation.PostConstruct
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.*

/**
 * Utility class for JWT token operations.
 *
 * Provides functionality to generate, validate, and extract information
 * from JSON Web Tokens (JWT) used for authentication.
 * Configuration values are read from application.properties.
 */
@Component
class JwtUtils {
    private val logger = LoggerFactory.getLogger(JwtUtils::class.java)

    /** Secret key used for signing JWT tokens. Loaded from application.properties. */
    @Value("\${jwt.secret}")
    private lateinit var jwtSecret: String

    /** Token expiration time in milliseconds. Loaded from application.properties (default: 24 hours). */
    @Value("\${jwt.expiration-ms}")
    private var jwtExpirationMs: Long = 86400000

    /** HMAC signing key derived from the secret. Lazily initialized. */
    private val key: javax.crypto.SecretKey by lazy { Keys.hmacShaKeyFor(jwtSecret.toByteArray()) }

    @PostConstruct
    fun validateSecret() {
        require(jwtSecret.toByteArray().size >= 32) {
            "SECURITY ERROR: jwt.secret must be at least 256 bits (32 bytes). " +
            "Generate one with: openssl rand -base64 64"
        }
    }

    /**
     * Generates a JWT token for the given username.
     *
     * Creates a token with the username as subject, current time as issue date,
     * and expiration time configured in application.properties.
     *
     * @param username The username to encode in the token.
     * @return A signed JWT token string.
     */
    fun generateToken(username: String): String {
        return Jwts.builder()
            .subject(username)
            .issuedAt(Date())
            .expiration(Date(System.currentTimeMillis() + jwtExpirationMs))
            .signWith(key)
            .compact()
    }

    /**
     * Extracts the username from a JWT token.
     *
     * Parses the token and retrieves the subject claim, which contains the username.
     *
     * @param token The JWT token string.
     * @return The username encoded in the token.
     * @throws io.jsonwebtoken.JwtException if the token is invalid or expired.
     */
    fun getUsernameFromToken(token: String): String {
        return Jwts.parser()
            .verifyWith(key)
            .build()
            .parseSignedClaims(token)
            .payload
            .subject
    }

    /**
     * Validates a JWT token.
     *
     * Checks if the token is properly signed, not expired, and has valid claims.
     *
     * @param token The JWT token string to validate.
     * @return true if the token is valid, false otherwise.
     */
    fun validateToken(token: String): Boolean {
        return try {
            logger.debug("Validating JWT token")
            val claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token)
            logger.debug("Token valid for user: {}", claims.payload.subject)
            true
        } catch (e: Exception) {
            logger.warn("Token validation failed: {} - {}", e.javaClass.simpleName, e.message)
            false
        }
    }
}