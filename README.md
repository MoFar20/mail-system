# THM Mail-System

A distributed three-tier mail system built with Angular (Frontend), Spring Boot/Kotlin (Backend), and an H2 Database. This project demonstrates strict architectural layering, type safety, and clean code principles.

## Quick Start

**1. Start the Backend (Spring Boot on port 8080):**
```bash
./gradlew bootRun
```

**2. Start the Frontend (Angular on port 4200):**
```bash
cd mail-client
npm install
ng serve
```

## Test Credentials

| Username         | Password      | 
|------------------|---------------|
| `student@thm.de` | `password123` |
| `prof@thm.de`    | `password123` |
| `admin@thm.de`   | `admin123`    |

## Features

### Functional Features
*   Create, Read, Update, and Delete emails.
*   Send emails (with mocked transmission - 90% success rate).
*   JWT-based authentication.
*   Inbox, Sent, and Drafts views.
*   File attachment support with metadata tracking.
*   Automatic sample data initialization.

### Code Quality & Architecture
*   Strict layer separation (Components → Services → API).
*   Fully service-based HTTP communication (no `HttpClient` usage in components).
*   100% type-safe TypeScript (zero `any` usage).
*   Memory-leak-free Observable subscriptions utilizing the `takeUntil()` pattern.
*   Centralized error handling with user-friendly messages.
*   Proper `OnDestroy` lifecycle management across all components.

## Architecture Overview

```text
mail-system/
├── src/                    # Spring Boot Backend (Kotlin)
│   └── main/kotlin/de/thm/mni/mailsystem/
│       ├── config/         # Security & JWT configuration
│       ├── controller/     # REST API controllers
│       ├── model/          # JPA entities
│       ├── repository/     # Spring Data repositories
│       └── service/        # Business logic
│
├── mail-client/            # Angular Frontend (TypeScript)
│   └── src/app/
│       ├── components/     # UI components (event & state management only)
│       ├── services/       # API services (HTTP & business logic)
│       ├── guards/         # Route guards
│       ├── interceptors/   # HTTP interceptors (JWT auth)
│       └── models/         # Type-safe DTOs & interfaces
│
└── build.gradle.kts        # Gradle build configuration
```

### Key Architectural Principles

*   **Layer 1: Components:** Handle user interactions and UI state exclusively. All HTTP requests are delegated to services, and subscriptions are securely managed with the `takeUntil()` pattern to prevent memory leaks.
*   **Layer 2: Services:** Manage all HTTP communication via `HttpClient`. Implement centralized error handling with `catchError` and return strongly-typed Observable responses for UI consumption.
*   **Layer 3: Backend API:** Provide RESTful endpoints secured by JWT authentication. Maintain a clean separation of concerns routing from Controller to Service to Repository.

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register a new user account |
| POST | `/api/auth/login` | Authenticate and retrieve JWT token |

### Mail Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mails` | Retrieve all mails |
| GET | `/api/mails/inbox` | Retrieve inbox for authenticated user |
| GET | `/api/mails/sent` | Retrieve sent mails for authenticated user |
| GET | `/api/mails/drafts` | Retrieve drafts for authenticated user |
| GET | `/api/mails/{id}` | Retrieve a single mail |
| POST | `/api/mails` | Create a new mail (draft) |
| PUT | `/api/mails/{id}` | Update an existing mail (drafts only) |
| DELETE | `/api/mails/{id}` | Delete a mail |
| POST | `/api/mails/{id}/send` | Send a mail (90% success rate) |

### Attachment Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mails/{id}/attachments` | Retrieve all attachments for a mail |
| POST | `/api/mails/{id}/attachments` | Add an attachment to a mail |
| DELETE | `/api/mails/{mailId}/attachments/{attachmentId}` | Delete a specific attachment |

## Technologies Used

*   **Backend:** Spring Boot 4.0, Kotlin, Spring Security, JWT, Spring Data JPA.
*   **Frontend:** Angular 18+, TypeScript, RxJS, Reactive Forms.
*   **Database:** H2 (in-memory).
*   **Build Tools:** Gradle (Kotlin DSL), npm.
*   **Code Quality:** TypeScript strict mode, Memory leak prevention, Type-safe DTOs.

## Development Notes

*   All components follow a strict layer separation pattern to ensure modularity.
*   Observable subscriptions must be managed using the `takeUntil()` pattern to ensure proper garbage collection.
*   Services are strictly responsible for handling HTTP communication and business logic.
*   Type safety is enforced globally using DTOs defined in the `src/app/models/` directory.
*   Error responses are standardized using the `ApiErrorResponse` interface for consistent UI feedback.