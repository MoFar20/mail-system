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
        .cors { it.configurationSource(corsConfigurationSource()) }
        .csrf { it.disable() }
        .sessionManagement { it.sessionCreationPolicy(SessionCreationPolicy.STATELESS) }
        .exceptionHandling { exceptions ->
            exceptions.authenticationEntryPoint { request, response, _ ->
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Unauthorized")
            }
        }
        .authorizeHttpRequests { auth ->
            auth.requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
            auth.requestMatchers("/api/auth/**").permitAll()
            auth.requestMatchers("/actuator/**").permitAll()
            auth.anyRequest().authenticated()
        }
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

    return http.build()
}

@Bean
fun corsConfigurationSource(): CorsConfigurationSource {
    val configuration = CorsConfiguration()
        configuration.allowedOriginPatterns = listOf(
        "https://*.vercel.app",
        "https://mail-system-black.vercel.app",
        "http://localhost:4200"
    )
    
    configuration.allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
    configuration.allowedHeaders = listOf("Authorization", "Content-Type", "Accept", "X-Requested-With")
    configuration.allowCredentials = true
    configuration.exposedHeaders = listOf("Authorization", "Content-Type")
    
    val source = UrlBasedCorsConfigurationSource()
    source.registerCorsConfiguration("/**", configuration)
    return source
}

@Bean
fun corsFilter(): org.springframework.web.filter.CorsFilter {
    val source = UrlBasedCorsConfigurationSource()
    val config = CorsConfiguration().apply {
        allowCredentials = true
        allowedOriginPatterns = listOf("https://*.vercel.app", "http://localhost:4200")
        allowedMethods = listOf("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")
        allowedHeaders = listOf("*")
        exposedHeaders = listOf("Authorization", "Content-Type")
    }
    source.registerCorsConfiguration("/**", config)
    return org.springframework.web.filter.CorsFilter(source)
}
}
