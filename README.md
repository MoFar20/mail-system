# THM Mail-System

A distributed three-tier mail system built with Angular (Frontend), Spring Boot/Kotlin (Backend), and H2 Database.

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

- ✅ Create, Read, Update, Delete emails
- ✅ Send emails (with mocked transmission - 90% success rate)
- ✅ JWT-based authentication
- ✅ Inbox, Sent, and Drafts views
- ✅ File attachment metadata
- ✅ Automatic sample data initialization

## Architecture

```
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
│       ├── components/     # UI components
│       ├── services/       # API services
│       ├── guards/         # Route guards
│       └── interceptors/   # HTTP interceptors
│
└── build.gradle.kts        # Gradle build configuration
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user account |
| POST | `/api/auth/login` | Authenticate and get JWT token |

### Mail Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mails` | Get all mails |
| GET | `/api/mails/inbox` | Get inbox for authenticated user |
| GET | `/api/mails/sent` | Get sent mails for authenticated user |
| GET | `/api/mails/drafts` | Get drafts for authenticated user |
| GET | `/api/mails/{id}` | Get single mail |
| POST | `/api/mails` | Create new mail (draft) |
| PUT | `/api/mails/{id}` | Update mail (drafts only) |
| DELETE | `/api/mails/{id}` | Delete mail |
| POST | `/api/mails/{id}/send` | Send mail (90% success rate) |

### Attachment Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/mails/{id}/attachments` | Get all attachments for a mail |
| POST | `/api/mails/{id}/attachments` | Add attachment to mail |
| DELETE | `/api/mails/{mailId}/attachments/{attachmentId}` | Delete attachment |

## Technologies

- **Backend:** Spring Boot 4.0, Kotlin, Spring Security, JWT, Spring Data JPA
- **Frontend:** Angular 18+, TypeScript, RxJS
- **Database:** H2 (in-memory)
- **Build:** Gradle (Kotlin DSL), npm

