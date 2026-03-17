package de.thm.mni.mailsystem.config

import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.slf4j.LoggerFactory
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.core.context.SecurityContextImpl
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource
import org.springframework.stereotype.Component
import org.springframework.web.filter.OncePerRequestFilter

/**
 * JWT authentication filter that validates JWT tokens on each request.
 *
 * This filter extracts the JWT token from the Authorization header,
 * validates it, and sets the authentication in the Spring Security context.
 * Executes once per request to ensure consistent authentication state.
 *
 * @property jwtUtils Utility class for JWT token operations.
 */
@Component
class JwtAuthenticationFilter(
    private val jwtUtils: JwtUtils
) : OncePerRequestFilter() {

    private val logger = LoggerFactory.getLogger(JwtAuthenticationFilter::class.java)

    /**
     * Determines whether this filter should be skipped for the current request.
     *
     * Skips JWT authentication for public authentication endpoints like
     * login and registration, as these don't require a valid JWT token.
     *
     * @param request The incoming HTTP request.
     * @return true if the filter should be skipped, false otherwise.
     */
    override fun shouldNotFilter(request: HttpServletRequest): Boolean {
        val path = request.requestURI
        // Skip JWT filter for public auth endpoints
        val publicPaths = listOf("/api/auth/login", "/api/auth/register", "/h2-console")
        return publicPaths.any { path.startsWith(it) }
    }

    /**
     * Filters each HTTP request to validate JWT authentication.
     *
     * Extracts the JWT token from the Authorization header (Bearer token),
     * validates it, extracts the username, and sets the authentication
     * in the security context if valid.
     *
     * @param request The incoming HTTP request.
     * @param response The outgoing HTTP response.
     * @param filterChain The filter chain to continue processing.
     */
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        filterChain: FilterChain
    ) {
        if (request.method == "OPTIONS") {
            response.status = HttpServletResponse.SC_OK
            return 
        }
        try {
            logger.debug("Processing request: {} {}", request.method, request.requestURI)

            val jwt = parseJwt(request)

            if (jwt != null && jwtUtils.validateToken(jwt)) {
                val username = jwtUtils.getUsernameFromToken(jwt)
                logger.debug("Valid JWT token for user: {}", username)

                val authentication = UsernamePasswordAuthenticationToken(
                    username, null, emptyList()
                )
                authentication.details = WebAuthenticationDetailsSource().buildDetails(request)

                val securityContext = SecurityContextImpl()
                securityContext.authentication = authentication
                SecurityContextHolder.setContext(securityContext)

                logger.debug("Authentication set in SecurityContext for user: {}", username)
            } else if (jwt != null) {
                logger.warn("Invalid JWT token received")
            }
        } catch (e: Exception) {
            logger.error("Error processing JWT token: {}", e.message, e)
        }

        filterChain.doFilter(request, response)
    }

    /**
     * Extracts the JWT token from the Authorization header.
     *
     * @param request The HTTP request containing the Authorization header.
     * @return The JWT token string, or null if not found or invalid format.
     */
    private fun parseJwt(request: HttpServletRequest): String? {
        val headerAuth = request.getHeader("Authorization")
        return if (headerAuth != null && headerAuth.startsWith("Bearer ")) {
            headerAuth.substring(7)
        } else {
            null
        }
    }
}
