package de.thm.mni.mailsystem.repository

import de.thm.mni.mailsystem.model.User
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.stereotype.Repository
import java.util.*

/**
 * Repository interface for User entity data access.
 *
 * Provides standard CRUD operations through JPA Repository and custom
 * query methods for user-specific operations.
 */
@Repository
interface UserRepository : JpaRepository<User, Long> {
    /**
     * Finds a user by their mail address.
     *
     * @param mail The mail address to search for.
     * @return Optional containing the User if found, empty Optional otherwise.
     */
    fun findByMail(mail: String): Optional<User>
}