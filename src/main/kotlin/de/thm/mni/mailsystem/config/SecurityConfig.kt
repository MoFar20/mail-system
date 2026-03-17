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
import org.springframework.web.filter.CorsFilter
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
fun corsFilter(): org.springframework.web.filter.CorsFilter {
    val source = UrlBasedCorsConfigurationSource()
    val config = CorsConfiguration()
    
    config.allowCredentials = true
    config.allowedOriginPatterns = listOf(
        "https://*.vercel.app", 
        "http://localhost:4200"
    )
    
    config.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
    config.allowedHeaders = listOf("*")
    config.exposedHeaders = listOf("Authorization", "Content-Type", "Link", "X-Total-Count")
    
    source.registerCorsConfiguration("/**", config)
    return org.springframework.web.filter.CorsFilter(source)
}

@Bean
fun filterChain(http: HttpSecurity): SecurityFilterChain {
    http
        .cors { } 
        .csrf { it.disable() }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        .authorizeHttpRequests { auth ->
            auth.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
            auth.requestMatchers("/api/auth/**").permitAll()
            auth.requestMatchers("/actuator/**").permitAll()
            auth.requestMatchers("/").permitAll()
            auth.anyRequest().authenticated()
        }
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

    return http.build()
}
}
