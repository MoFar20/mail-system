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

@Configuration
@EnableWebSecurity
class SecurityConfig(private val jwtAuthenticationFilter: JwtAuthenticationFilter) {

    private val logger = LoggerFactory.getLogger(SecurityConfig::class.java)

    @Bean
    fun passwordEncoder() = BCryptPasswordEncoder()

    @Bean
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http
            .cors { it.configurationSource(corsConfigurationSource()) }
            .csrf { it.disable() }
            .sessionManagement { session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            }
            .securityContext { context ->
                context.requireExplicitSave(false)
            }
            .exceptionHandling { exceptions ->
                exceptions.authenticationEntryPoint { request, response, authException ->
                    logger.warn("Authentication failed for {}: {}", request.requestURI, authException?.message)
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, authException?.message ?: "Unauthorized")
                }
            }
            .authorizeHttpRequests { auth ->
                auth
                    // Public: Authentication endpoints
                    .requestMatchers("/api/auth/**").permitAll()
                    
                    // Public: Static frontend resources (Angular SPA)
                    .requestMatchers("/", "/index.html", "/*.js", "/*.css", "/*.ico", "/assets/**").permitAll()
                    
                    // Public: API documentation (Swagger UI, OpenAPI)
                    .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                    
                    // Public: H2 Console (development/debugging)
                    .requestMatchers("/h2-console/**").permitAll()
                    
                    // Public: CORS preflight requests
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    
                    // Protected: All mail API endpoints require authentication
                    .requestMatchers("/api/mails/**").authenticated()
                    
                    // Protected: Any other API endpoints require authentication
                    .requestMatchers("/api/**").authenticated()
                    
                    // Public: Angular SPA routes and any unmatched static resources
                    .anyRequest().permitAll()
            }
            .headers { headers ->
                headers.frameOptions { it.sameOrigin() } // Required for H2 Console
            }
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter::class.java)

        return http.build()
    }

    @Bean
    fun corsConfigurationSource(): CorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            // Allow frontend on different port during development
            addAllowedOrigin("http://localhost:4200")
            // Allow same-origin requests (production - frontend served by Spring Boot)
            addAllowedOrigin("http://localhost:8080")
            
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