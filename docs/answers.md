# Web-Technologies
## Part 1: REST API Design
### Communication - REST Design and Spring Boot Implementation
#### Question 1: Find out which information is required for a mail entity.
**Answer:**

To create a Web-Mail client that allows users to receive, send, and manage emails, the following information is required for the Mail entity:
- Sender: The email address of the user who sends the email.
- Recipients: A list of target email addresses categorized by type (TO, CC, BCC, REPLY_TO).
- Subject: The title or brief summary of the email.
- Content: The plain text body of the email.
- Attachments: Optional binary file attachments associated with the email.
- Status: The current state of the email (DRAFT, SENT, or ERROR).
- Source: Indicates whether the email was generated internally (INTERN) or externally (EXTERN).
- Timestamps: Dates for creation, last update, and when the mail was successfully sent.

#### Question 2: Create a UML-Diagram that illustrates your abstract entity model.
Answer:
```plaintext
+-------------------+
|       User        |
+-------------------+
| id: Long          |
| firstname: String |
| lastname: String  |
| mail: String      |
| passwordHash: Str |
+-------------------+

+-----------------------+           +-----------------------+
|         Mail          |           |     MailRecipient     |
+-----------------------+           +-----------------------+
| id: Long              | 1       * | id: Long              |
| sender: String        |-----------| address: String       |
| subject: String       | contains  | type: RecipientType   |
| content: String       |           +-----------------------+
| status: MailStatus    |
| source: MailSource    |           +-----------------------+
| createdAt: DateTime   | 1       * |      Attachment       |
| updatedAt: DateTime   |-----------+-----------------------+
| sentAt: DateTime      | includes  | id: Long              |
+-----------------------+           | fileName: String      |
                                    | mimeType: String      |
                                    | size: Long            |
                                    | data: ByteArray       |
                                    +-----------------------+`
```

#### Question 3: Perform a URL-Design for your resources.
**Answer:**

To adhere to REST principles, each resource is uniquely identifiable via a URI. The following URL-design maps our primary resources and sub-resources:
- Authentication (Non-Resource / RPC style):
    - POST /api/auth/register
    - POST /api/auth/login
- Mails (Primary Resource):
    - GET /api/mails
    - POST /api/mails
    - GET /api/mails/{id}
    - PUT /api/mails/{id}
    - DELETE /api/mails/{id}
- Filtered Lists:
    - GET /api/mails/inbox
    - GET /api/mails/sent
    - GET /api/mails/drafts
- Sub-Resources:
    - POST /api/mails/{id}/send
    - GET /api/mails/{id}/attachments
    - POST /api/mails/{id}/attachments
    - GET /api/mails/{mailId}/attachments/{attachmentId}/download
    - DELETE /api/mails/{mailId}/attachments/{attachmentId}

#### Question 4: Create DTO objects that model your requests and responses.
**Answer:**

Message modeling via Data Transfer Objects (DTOs) is necessary to avoid missing information during requests and to prevent exposing sensitive security data (like passwords) in responses.
- Request DTOs:
  - ``RegisterRequest``: Models the registration data requiring firstname, lastname, mail, and password.
  - ``MailCreateRequest`` & ``MailUpdateRequest``: Model the input for creating/updating a mail, including sender, subject, content, and recipient lists.

- Response DTOs:
  - ``RegisterResponse``: Returns a success message and the registered mail.
  - ``MailDTO``: Safely models the mail response without exposing internal database identifiers for relations. It includes nested ``MailRecipientDTO`` and ``AttachmentDTO`` (which excludes raw binary data to optimize response size).

#### Question 5: Find out how you can upload a file with Spring Boot. Realize a file-upload in your application.
**Answer:**

To realize optional file attachments in the Web-Mail client, Spring Boot uses the ``multipart/form-data`` content type.
- **Mechanism**: The file is received in the controller endpoint using the ``@RequestPart`` or ``@RequestParam`` annotation bound to Spring's ``MultipartFile`` interface.

- **Storage**: The ``MultipartFile`` provides methods to extract the original filename, MIME type, size, and the binary data (``.bytes``). The binary content is **not** stored as a BLOB in the database. Instead it is written to a **configurable folder on the server's filesystem**. The target directory is injected into `MailService` via `@Value("${app.attachment.storage-path}")`, making it configurable in `application.properties` (default: `./data/attachments`). Within that folder each mail gets its own sub-directory (`{mailId}/`), and each file is stored under a UUID-prefixed name to prevent collisions. Only the metadata (filename, MIME type, size) and the resulting filesystem path (`storagePath`) are persisted in the `Attachment` database row.

---

## Part 3: Layered Architecture
### System Architectures, Layered Application Architectures

#### Question 1: What is the responsibility of the API layer? Give one example.
**Answer:**

The API layer is responsible for handling everything related to the technical API so that the other layers do not have to deal with it. It serves to protect the Business layer from the underlying technical API details.
* **Example:** A controller class like `UserRestApi` (or `MailController` in my system) maps incoming HTTP requests to DTOs and delegates the processing to the Service layer.

#### Question 2: What is the responsibility of the Business layer? Give one example.
**Answer:**

The Business layer is responsible for handling the domain rules, which are the actual user features and core rules of the application. These business rules come from the problem domain and are independent of the specific technology used (like REST or the specific database).
* **Example:** A business rule handled by a `UserService` could be that a user can only register if no other user has used the same email address. In my mail system, a rule would be that only mails with a `DRAFT` status can be sent or modified.

#### Question 3: What is the responsibility of the Repository layer? Give one example.
**Answer:**

The Repository layer protects the system from having direct knowledge of external services. This includes abstracting the interactions with databases, other REST APIs, or IMAP/SMTP servers. It ensures that the rest of the application remains database-agnostic.
* **Example:** A `UserRepository` (or `MailRepository`) is the only class allowed to know about the database connection and SQL/JPA queries. It provides simple methods like `save(user)` while hiding the technical database implementation in my system.

#### Question 4: Draw a 3-tier application architecture of your current email system.
**Answer:**

Below is the text-based architectural diagram of the 3-tier email application, demonstrating the flow of data between the API Layer, Business Layer, and Repository Layer:

```text
=======================================================================
[API Layer]
 
      Input DTOs (e.g., MailCreateRequest) & Output DTOs (e.g., MailDto)
                                 ^
                                 |
                      +----------------------+
                      |    MailController    |
                      +----------------------+
                                 |
=================================|=====================================
[Business Layer]                 |
                                 v
                      +----------------------+       +----------------+
                      |     MailService      | ----> |  Mail Entity   |
                      +----------------------+       +----------------+
                                 |                           ^
=================================|===========================|=========
[Repository Layer]               |                           |
                                 v                           |
                      +----------------------+               |
                      |    MailRepository    | --------------+
                      +----------------------+
=======================================================================
```
---
## Part 3: Object-relational Mapping (ORM)
### Repository Layer and JPA
#### Question 1: If an admin loads a list of all users and a user is indirectly connected to all objects inside the database, does the application have to load the whole database? Argue why or why not!
**Answer:**

No, the application does not have to load the whole database. This is prevented by a mechanism called "Lazy Loading". In JPA/Hibernate, relationships between entities are not necessarily fetched immediately from the database. Instead, access to specific related attributes or objects triggers the loading of that data only when it is explicitly called in the code. This means that if an admin requests a list of users, the application can load only the user entities without loading all related objects (like mails, attachments, etc.) unless those relationships are accessed. This approach optimizes performance and reduces memory usage by avoiding unnecessary data retrieval.

#### Question 2: One goal in a layered application architecture is to avoid coupling the business logic to a database technology. Is your domain model coupled to a database technology? Check: Can you change your database from an SQL-based to a no-sql database without adjusting the model classes? Argue why or why not!
**Answer:**

Yes, the current domain model is tightly coupled to the relational database technology.
- Our model classes use Java Persistence API (JPA) annotations such as ``@Entity``, ``@Table``, ``@Id``, and ``@Column`` to map the objects directly to SQL database tables.

- Because these annotations are standard specifications specifically designed for ORM in relational databases, changing to a No-SQL database (like MongoDB) would break the mapping. I would be forced to adjust the model classes by removing these JPA annotations and replacing them with No-SQL specific ones

#### Question 3: Research what Lazy Loading in JPA is, and where and how it can be configured? Assume we want to use DTOs between the persistence layer and the business layer to decouple our domain model from JPA. Will lazy loading still work or will the translation from repository DTO objects to model object trigger the loading anyway? Which benefits and drawbacks will we get when using DTO objects between business layer and persistence layer?
**Answer:**
- **Lazy Loading & Configuration**: Lazy loading is a design pattern where the initialization of related entities is deferred until they are explicitly accessed. It can be configured inside JPA relationship annotations by setting the fetch strategy (e.g., @OneToMany(fetch = FetchType.LAZY)).

- **Impact of DTO Translation**: If we use DTOs to decouple the layers, the translation mapping process from the JPA entity to the DTO will almost certainly trigger the lazy loading. This happens because the mapper needs to access the entity's attributes (via getter methods) to populate the DTO, effectively forcing the ORM to fetch the data from the database.

- **Benefits of using DTOs here**: Complete decoupling. The Business Layer remains pure and unaware of JPA annotations, making the system highly modular.

- **Drawbacks of using DTOs here**: It introduces significant boilerplate code (mapping logic) and can lead to performance degradation (the N+1 query problem) if the mapper accidentally triggers lazy loading for large nested relationships that weren't actually needed for the specific use case.

#### Question 4: Consider places where lazy loading is reasonable to use and implement lazy loading!
**Answer:**

Lazy loading is highly reasonable to use in relationships that involve a lot of children or heavy data payloads.
- In our Web-Mail system, the most logical place to implement lazy loading is the attachments list within the Mail entity.

- Since attachments contain large binary data (BLOBs/ByteArrays), they should not be loaded when a user simply fetches their inbox list. They should only be lazily loaded when the user explicitly opens a specific email and requests to download the attachment.
---
## Part 4: Data Protection
### Protection from change or access
#### Question 1: What is the difference between symmetric and asymmetric signing?
**Answer:**

The primary difference lies in the keys used for the cryptographic process: 
- **Symmetric Signing**: This method uses a single shared key for both creating the signature (signing) and checking its validity (verifying). 
- **Asymmetric Signing**: This method uses a key pair consisting of a private key and a public key. The private key is used exclusively for signing the data, while the public key is used for verification.

#### Question 2: Describe how the server can use a signature to verify that the information was not manipulated.
**Answer:**

A server verifies data integrity by independently recreating the signature and comparing it to the provided one to ensure trust.

- When using a shared secret and hashing, the server takes the received message payload and hashes it together with its own known secret to generate a new signature (``sign(message, secret) = hash(message + secret)``).
- The server then compares this newly generated signature against the signature that was provided by the client in the request.
- If the two signatures are exactly equal (``signature == sign(message, secret)``), the server knows the information was not manipulated; if they differ, the verification fails, indicating potential manipulation.

#### Question 3: What information must be shared between trusted servers in symmetric and what in asymmetric signing?
**Answer:**

- **In Symmetric Signing**: The "Shared Secret" (the single key) must be exchanged between all trusted servers. This presents a potential risk because any party that holds the shared secret can not only verify but also create valid signatures.
- **In Asymmetric Signing**: Only the "Public Key" must be shared and exchanged between trusted servers to verify the signatures. Every server has its own keys, and the private key used for generating the signatures remains safely hidden.
---
## Part 5: Single-Page Application (Angular)
### Angular: Pages, Navigation, Data-Binding

**Note:** The exercises in this section were purely practical and did not contain theoretical questions. Below is a brief documentation of how these practical tasks were implemented in the `mail-client` frontend application:

* **Project Structure:** The Angular project was set up following a feature/layer-based structure, separating the application into `components` (for UI elements), `services` (for API communication), `guards` (for route protection), `interceptors` (for HTTP processing), and `models` (for TypeScript interfaces).

* **Routing & Navigation:** Single-page navigation was implemented in `app.routes.ts` using the Angular Router, mapping URLs to their respective page components (e.g., Home, Login, Register).

* **Registration & Login Components:** The authentication forms were built using **Angular Reactive Forms**. I implemented two-way data binding and rigorous form validation, including a custom validator to ensure the "Password" and "Confirm Password" fields match before allowing submission.

* **Component-Based UI:** The Mail Client interface was designed using modular and reusable components, initially populated with static data and later connected to the Spring Boot REST API for dynamic data fetching.

---
## Part 6: Single-Page Application (Http-Clients & Authentication)
### Angular: Http-Clients, Authentication

**Note:** The exercises in this section involved practical implementation and architectural discussions regarding the frontend-backend integration. Below is the documentation of how these tasks were realized in my system:

* **Backend Communication:** I replaced the static demo data by integrating Angular's `HttpClient` to communicate dynamically with the Spring Boot REST API. Responses are processed and transformed using RxJS `Observable` pipelines (`pipe` and `map`) to map the API JSON responses to my strongly typed frontend models.

* **Authentication Interceptor:** To securely interact with the protected backend endpoints, I implemented an `HttpInterceptorFn`. This interceptor automatically retrieves the saved JWT from the local storage and appends it to the `Authorization` header as a `Bearer` token for all outgoing HTTP requests.

* **Route Protection (Guards):** I implemented an `authGuard` as a functional guard using Angular's `CanActivateFn` type (the modern approach since Angular 14+), utilizing the `inject()` function to access `AuthService` and `Router`. The guard checks the authentication state and redirects unauthenticated users back to the login page.

* **File Upload Implementation:** Although not explicitly detailed in the lecture slides, I successfully implemented attachment uploads by constructing `FormData` objects in Angular and submitting them as `multipart/form-data` POST requests via the `HttpClient` to my Spring Boot backend.

---
## Part 7: Generated OpenAPI Specification

**Note:** The tasks in this section required practical implementation to generate an up-to-date OpenAPI documentation directly from the Spring Boot code. Below is the documentation of how this was realized:

* **OpenAPI Integration:** I integrated the `springdoc-openapi-starter-webmvc-ui` dependency into my `build.gradle.kts` to automatically generate the OpenAPI specification (OAS 3.1) from the existing controllers and DTOs. No additional annotations were needed on the controller methods — springdoc infers all endpoint information directly from the standard Spring MVC annotations (`@RestController`, `@RequestMapping`, `@PostMapping`, `@RequestBody`, etc.).

* **API Documentation:** The generated Swagger UI is accessible at `/swagger-ui/index.html` and documents all endpoints with their request/response schemas automatically derived from the Kotlin data classes (DTOs). This provides clear documentation for both developers and automation tools without code duplication.

* **Authentication Specification:** As required by the exercise, I documented the JWT (Bearer) authentication. Since this is a global configuration, I created an `OpenAPIConfig.kt` class. Within this class, I used the `Components().addSecuritySchemes("bearer-jwt", ...)` method to register the HTTP Bearer scheme, and added it via `addSecurityItem(SecurityRequirement().addList("bearer-jwt"))` so that the Swagger UI correctly displays the "Authorize" button for all protected endpoints.
---
## Part 8: Mono Repository (Build Automation)
### Build Automation with Gradle and Mono-Repositories

### Question 1: Is the `node_modules` folder required in production?
**Answer:**
No, the `node_modules` folder is completely unnecessary in the production environment for an Angular application.

* During the "Translation / Compilation for Production" process, the Angular source code is translated and compiled into runnable static bundled artifacts.

* These final production artifacts consist exclusively of plain HTML, CSS, and JS files.

* Only these compiled static files are deployed to the dedicated web server (e.g., Caddy Linux server), meaning the raw Node dependencies are never used at runtime.

### Question 2: Check if the `node_modules` folder contains dev dependencies. If yes, then find a way to exclude them.
**Answer:**
* Since the Angular application is fully compiled into static assets (HTML, CSS, JS) prior to deployment, the entire `node_modules` folder (including all regular and dev dependencies) is safely ignored for the production build.

* In our Gradle configuration, the `buildAngular` task (an `NpmTask`) compiles the Angular source into `mail-client/dist/mail-client/browser`. The subsequent `processResources` task then merges only those compiled static assets into the Spring Boot resource bundle. The `node_modules` directory is never referenced by either task and is therefore completely excluded from the final application.

***

### Implementation Note: Mono-Repository Setup
* **Unified Structure:** I successfully consolidated the frontend (Angular) and backend (Spring Boot) into a single Mono-Repository structure to improve feature testing and maintain a clear responsibility for the entire system.
* **Build Automation:** The Angular frontend is not a separate Gradle module, but is instead integrated via the `com.github.node-gradle.node` Gradle plugin. A custom `buildAngular` NpmTask runs `npm run build` inside the `mail-client/` directory, and the compiled output is merged into Spring Boot's static resources via the `processResources` task — resulting in a single self-contained JAR that serves both the API and the frontend.
* **Distribution Generation:** I utilized the standard Gradle tasks (`build`, `clean`) at the root level. Running `./gradlew build` automatically compiles both the frontend (via the `buildAngular` NpmTask) and backend into a single deployable JAR.