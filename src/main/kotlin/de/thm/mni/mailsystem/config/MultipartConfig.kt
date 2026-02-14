package de.thm.mni.mailsystem.config

import org.springframework.boot.web.servlet.FilterRegistrationBean
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.multipart.support.MultipartFilter

/**
 * Configuration to ensure multipart request processing occurs
 * before the Spring Security filter chain.
 *
 * This prevents 415 Unsupported Media Type errors when uploading
 * files to authenticated endpoints.
 */
@Configuration
class MultipartConfig {

    /**
     * Registers the MultipartFilter with high priority so that
     * multipart resolution happens before security filters.
     *
     * @return FilterRegistrationBean for the MultipartFilter.
     */
    @Bean
    fun multipartFilter(): FilterRegistrationBean<MultipartFilter> {
        val registration = FilterRegistrationBean(MultipartFilter())
        registration.order = Int.MIN_VALUE // Ensure it runs before security filters
        return registration
    }
}


