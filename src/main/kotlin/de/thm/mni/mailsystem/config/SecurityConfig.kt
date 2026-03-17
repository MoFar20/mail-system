package de.thm.mni.mailsystem.config

import org.slf4j.LoggerFactory
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpMethod
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.CorsConfigurationSource
import org.springframework.web.cors.UrlBasedCorsConfigurationSource
import jakarta.servlet.http.HttpServletResponse


/**
 * Spring Security configuration for the mail system.
 *
 * Configures JWT-based authentication with stateless sessions and defines
 * which endpoints require authentication.
 *
 * @property jwtAuthenticationFilter The JWT filter to validate tokens on each request.
 */
@Configuration
@EnableWebSecurity
class SecurityConfig(private val jwtAuthenticationFilter: JwtAuthenticationFilter) {

    private val logger = LoggerFactory.getLogger(SecurityConfig::class.java)

    /**
     * Provides a BCrypt password encoder bean for secure password hashing.
     *
     * @return BCryptPasswordEncoder instance for password encoding and validation.
     */
    @Bean
    fun passwordEncoder() = BCryptPasswordEncoder()

    /**
     * Configures the security filter chain with JWT authentication.
     *
     * @param http The HttpSecurity builder.
     * @return The configured SecurityFilterChain.
     */
    @Bean
fun filterChain(http: HttpSecurity): SecurityFilterChain {
    http
        // 1. Link the CORS configuration source immediately
        .cors { it.configurationSource(corsConfigurationSource()) }
        .csrf { it.disable() }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        .authorizeHttpRequests { auth ->
            // 2. EXPLICITLY ALLOW PREFLIGHT (OPTIONS)
            auth.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
            
            // 3. ALLOW AUTH ENDPOINTS
            auth.requestMatchers("/api/auth/**").permitAll()
            auth.requestMatchers("/h2-console/**").permitAll()
            
            auth.anyRequest().authenticated()
        }
        .headers { it.frameOptions { it.sameOrigin() } }
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

    return http.build()
}

    /**
     * Configures CORS to allow requests from the Angular frontend.
     *
     * @return The CORS configuration source.
     */
    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            addAllowedOrigin("http://localhost:4200", "https://remarkable-jeanne-thmdms-34e6c67e.koyeb.app/")
            addAllowedMethod("*")
            addAllowedHeader("*")
            exposedHeaders = listOf("Authorization", "Content-Type")
            allowCredentials = true
            maxAge = 3600L
        }
        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", configuration)
        return source
    }
}
