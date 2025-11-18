# FIVUCSAS - Complete PlantUML Diagrams Collection

**Document Version:** 2.0
**Date:** November 4, 2025
**Purpose:** Production-ready diagrams for documentation and architecture review

---

## Table of Contents

1. [Entity-Relationship Diagrams](#1-entity-relationship-diagrams)
2. [Class Diagrams](#2-class-diagrams)
3. [Sequence Diagrams](#3-sequence-diagrams)
4. [State Machine Diagrams](#4-state-machine-diagrams)
5. [Activity Diagrams](#5-activity-diagrams)

---

## 1. Entity-Relationship Diagrams

### 1.1 Complete Database ER Diagram

```plantuml
@startuml fivucsas_er_diagram

skinparam linetype ortho
skinparam packageStyle rectangle

' Shared Schema Tables
package "Shared Schema" <<Database>> {
    entity tenants {
        * id : UUID <<PK>>
        --
        name : VARCHAR(255)
        slug : VARCHAR(100) <<UNIQUE>>
        domain : VARCHAR(255)
        subscription_plan : VARCHAR(50)
        subscription_status : VARCHAR(50)
        max_users : INTEGER
        max_storage_gb : INTEGER
        max_api_calls_per_day : INTEGER
        current_user_count : INTEGER
        current_storage_mb : NUMERIC
        api_calls_today : INTEGER
        is_active : BOOLEAN
        is_trial : BOOLEAN
        contact_email : VARCHAR(255)
        settings : JSONB
        features : JSONB
        created_at : TIMESTAMP
        updated_at : TIMESTAMP
        deleted_at : TIMESTAMP
    }

    entity system_admins {
        * id : UUID <<PK>>
        --
        email : VARCHAR(255) <<UNIQUE>>
        password_hash : VARCHAR(255)
        first_name : VARCHAR(100)
        last_name : VARCHAR(100)
        mfa_enabled : BOOLEAN
        mfa_secret : VARCHAR(255)
        is_active : BOOLEAN
        is_super_admin : BOOLEAN
        last_login_at : TIMESTAMP
        last_login_ip : INET
        created_at : TIMESTAMP
    }
}

' Tenant Schema Tables
package "Tenant Schema (per tenant)" <<Database>> {
    entity users {
        * id : UUID <<PK>>
        --
        email : VARCHAR(255) <<UNIQUE>>
        password_hash : VARCHAR(255)
        first_name : VARCHAR(100)
        last_name : VARCHAR(100)
        phone_number : VARCHAR(20)
        id_number : VARCHAR(50) <<UNIQUE>>
        date_of_birth : DATE
        address_line1 : VARCHAR(255)
        city : VARCHAR(100)
        country : VARCHAR(2)
        status : VARCHAR(20)
        is_biometric_enrolled : BOOLEAN
        verification_count : INTEGER
        created_at : TIMESTAMP
        updated_at : TIMESTAMP
    }

    entity roles {
        * id : UUID <<PK>>
        --
        name : VARCHAR(100) <<UNIQUE>>
        description : VARCHAR(500)
        is_system_role : BOOLEAN
        created_at : TIMESTAMP
    }

    entity permissions {
        * id : UUID <<PK>>
        --
        code : VARCHAR(100) <<UNIQUE>>
        name : VARCHAR(200)
        category : VARCHAR(50)
        description : VARCHAR(500)
    }

    entity user_roles {
        * id : UUID <<PK>>
        --
        user_id : UUID <<FK>>
        role_id : UUID <<FK>>
        assigned_at : TIMESTAMP
        assigned_by : UUID
    }

    entity role_permissions {
        * id : UUID <<PK>>
        --
        role_id : UUID <<FK>>
        permission_id : UUID <<FK>>
    }

    entity biometric_data {
        * id : UUID <<PK>>
        --
        user_id : UUID <<FK>>
        biometric_type : VARCHAR(50)
        embedding : VECTOR(512)
        quality_score : NUMERIC(3,2)
        is_active : BOOLEAN
        is_primary : BOOLEAN
        enrolled_at : TIMESTAMP
        updated_at : TIMESTAMP
    }

    entity verification_logs {
        * id : UUID <<PK>>
        --
        user_id : UUID <<FK>>
        biometric_id : UUID <<FK>>
        verified : BOOLEAN
        confidence : NUMERIC(5,4)
        verification_method : VARCHAR(50)
        ip_address : INET
        user_agent : VARCHAR(500)
        location : GEOGRAPHY
        verified_at : TIMESTAMP
    }

    entity sessions {
        * id : UUID <<PK>>
        --
        user_id : UUID <<FK>>
        refresh_token_hash : VARCHAR(255)
        ip_address : INET
        user_agent : VARCHAR(500)
        is_active : BOOLEAN
        created_at : TIMESTAMP
        expires_at : TIMESTAMP
        last_activity_at : TIMESTAMP
    }

    entity audit_logs {
        * id : UUID <<PK>>
        --
        user_id : UUID <<FK>>
        action : VARCHAR(100)
        entity_type : VARCHAR(100)
        entity_id : UUID
        old_value : JSONB
        new_value : JSONB
        ip_address : INET
        user_agent : VARCHAR(500)
        created_at : TIMESTAMP
    }
}

' Relationships
users ||--o{ user_roles : has
roles ||--o{ user_roles : assigned_to
roles ||--o{ role_permissions : has
permissions ||--o{ role_permissions : granted_in

users ||--o{ biometric_data : has
users ||--o{ verification_logs : generates
users ||--o{ sessions : has
users ||--o{ audit_logs : creates

biometric_data ||--o{ verification_logs : used_in

@enduml
```

### 1.2 Core Business Entities ER Diagram (Simplified)

```plantuml
@startuml core_entities_er

entity "Tenant" as tenant {
    * id : UUID <<PK>>
    --
    * name : VARCHAR
    * slug : VARCHAR
    subscription_plan : VARCHAR
    max_users : INTEGER
    is_active : BOOLEAN
}

entity "User" as user {
    * id : UUID <<PK>>
    --
    * email : VARCHAR
    * password_hash : VARCHAR
    * first_name : VARCHAR
    * last_name : VARCHAR
    * status : VARCHAR
    is_biometric_enrolled : BOOLEAN
    verification_count : INTEGER
}

entity "Role" as role {
    * id : UUID <<PK>>
    --
    * name : VARCHAR
    display_name : VARCHAR
    is_system_role : BOOLEAN
}

entity "Permission" as permission {
    * id : UUID <<PK>>
    --
    * code : VARCHAR
    * resource : VARCHAR
    * action : VARCHAR
}

entity "BiometricData" as biometric {
    * id : UUID <<PK>>
    --
    user_id : UUID <<FK>>
    biometric_type : VARCHAR
    embedding : vector(512)
    quality_score : NUMERIC
    is_active : BOOLEAN
    is_primary : BOOLEAN
}

entity "VerificationLog" as verification {
    * id : UUID <<PK>>
    --
    user_id : UUID <<FK>>
    biometric_data_id : UUID <<FK>>
    verified : BOOLEAN
    confidence : NUMERIC
    distance : NUMERIC
    verified_at : TIMESTAMP
}

' Relationships
tenant ||--o{ user : "manages"
user ||--o{ role : "has (M:N)"
role ||--o{ permission : "has (M:N)"
user ||--|{ biometric : "has"
user ||--o{ verification : "verified"
biometric ||--o{ verification : "used in"

@enduml
```

---

## 2. Class Diagrams

### 2.1 Domain Model - Complete Class Diagram

```plantuml
@startuml domain_model

skinparam classAttributeIconSize 0
skinparam linetype ortho

package "Domain Layer" {

    ' Aggregate Roots
    class Tenant <<Aggregate Root>> {
        - id: UUID
        - name: String
        - slug: String
        - subscriptionPlan: SubscriptionPlan
        - subscriptionStatus: SubscriptionStatus
        - maxUsers: Int
        - currentUserCount: Int
        - isActive: Boolean
        - settings: Map<String, Any>
        - features: Set<String>
        - createdAt: Instant
        - updatedAt: Instant
        --
        + activate(): void
        + suspend(): void
        + upgradePlan(plan: SubscriptionPlan): void
        + canAddUser(): Boolean
        + incrementUserCount(): void
        + decrementUserCount(): void
    }

    class User <<Aggregate Root>> {
        - id: UUID
        - email: String
        - passwordHash: String
        - firstName: String
        - lastName: String
        - phoneNumber: String?
        - status: UserStatus
        - isBiometricEnrolled: Boolean
        - verificationCount: Int
        - failedVerificationCount: Int
        - enrolledAt: Instant?
        - lastVerifiedAt: Instant?
        - createdAt: Instant
        - updatedAt: Instant
        --
        + enroll(biometricData: BiometricData): void
        + verify(verificationResult: VerificationResult): void
        + activate(): void
        + suspend(): void
        + lock(): void
        + unlock(): void
        + hasRole(roleName: String): Boolean
        + hasPermission(permissionCode: String): Boolean
        + changePassword(newPassword: String): void
        + incrementVerificationCount(): void
        + incrementFailedVerificationCount(): void
        + resetFailedAttempts(): void
    }

    ' Value Objects
    class Email <<Value Object>> {
        - value: String
        --
        + Email(value: String)
        + validate(): Boolean
        + toString(): String
        + equals(other: Email): Boolean
    }

    class PhoneNumber <<Value Object>> {
        - value: String
        - countryCode: String
        --
        + PhoneNumber(value: String)
        + validate(): Boolean
        + format(): String
    }

    ' Entities
    class Role <<Entity>> {
        - id: UUID
        - name: String
        - displayName: String
        - description: String
        - parentRole: Role?
        - level: Int
        - isSystemRole: Boolean
        - permissions: Set<Permission>
        --
        + addPermission(permission: Permission): void
        + removePermission(permission: Permission): void
        + hasPermission(permissionCode: String): Boolean
        + getAllPermissions(): Set<Permission>
    }

    class Permission <<Entity>> {
        - id: UUID
        - code: String
        - resource: String
        - action: String
        - description: String
        --
        + matches(resource: String, action: String): Boolean
    }

    class BiometricData <<Entity>> {
        - id: UUID
        - userId: UUID
        - biometricType: BiometricType
        - modelName: String
        - modelVersion: String
        - embedding: FloatArray
        - qualityScore: Float
        - sharpnessScore: Float
        - brightnessScore: Float
        - contrastScore: Float
        - enrolledAt: Instant
        - isActive: Boolean
        - isPrimary: Boolean
        - version: Int
        - previousVersionId: UUID?
        --
        + calculateDistance(otherEmbedding: FloatArray): Float
        + verify(queryEmbedding: FloatArray, threshold: Float): Boolean
        + archive(): void
        + makeObsolete(): void
        + isHighQuality(): Boolean
    }

    class VerificationLog <<Entity>> {
        - id: UUID
        - userId: UUID
        - biometricDataId: UUID?
        - verified: Boolean
        - confidence: Float
        - distance: Float
        - threshold: Float
        - modelName: String
        - detectorBackend: String
        - verifiedAt: Instant
        - verificationContext: String
        - processingTimeMs: Int
        - failureReason: String?
        --
        + isSuccessful(): Boolean
        + isFastEnough(): Boolean
    }

    class AuditLog <<Entity>> {
        - id: UUID
        - eventType: String
        - eventCategory: EventCategory
        - severity: Severity
        - actorType: ActorType
        - actorId: UUID?
        - targetType: String?
        - targetId: UUID?
        - description: String
        - changes: Map<String, Any>
        - ipAddress: String
        - occurredAt: Instant
        --
        + isSecurityEvent(): Boolean
        + requiresAlert(): Boolean
    }

    class Session <<Entity>> {
        - id: UUID
        - userId: UUID
        - refreshTokenHash: String
        - accessTokenJti: String
        - deviceFingerprint: String
        - deviceName: String
        - ipAddress: String
        - createdAt: Instant
        - lastActivityAt: Instant
        - expiresAt: Instant
        - isActive: Boolean
        --
        + isExpired(): Boolean
        + revoke(reason: String): void
        + updateActivity(): void
        + isFromSameDevice(fingerprint: String): Boolean
    }

    ' Enums
    enum UserStatus {
        ACTIVE
        INACTIVE
        SUSPENDED
        LOCKED
        PENDING_VERIFICATION
    }

    enum BiometricType {
        FACE
        FINGERPRINT
        VOICE
        IRIS
    }

    enum SubscriptionPlan {
        TRIAL
        BASIC
        PROFESSIONAL
        ENTERPRISE
        CUSTOM
    }

    enum SubscriptionStatus {
        ACTIVE
        SUSPENDED
        CANCELLED
        EXPIRED
    }

    enum EventCategory {
        SECURITY
        DATA_CHANGE
        AUTHENTICATION
        AUTHORIZATION
        SYSTEM
    }

    enum Severity {
        DEBUG
        INFO
        WARNING
        ERROR
        CRITICAL
    }

    enum ActorType {
        USER
        SYSTEM
        ADMIN
        API
    }
}

' Relationships
Tenant "1" *-- "many" User : manages
User "1" *-- "many" BiometricData : has
User "many" -- "many" Role : has
Role "many" -- "many" Permission : has
Role "1" o-- "many" Role : parent of
User "1" *-- "many" VerificationLog : verified
BiometricData "1" o-- "many" VerificationLog : used in
User "1" *-- "many" Session : has
User "1" *-- "many" AuditLog : performed

User *-- Email
User *-- PhoneNumber
User -- UserStatus
BiometricData -- BiometricType
Tenant -- SubscriptionPlan
Tenant -- SubscriptionStatus
AuditLog -- EventCategory
AuditLog -- Severity
AuditLog -- ActorType

@enduml
```

### 2.2 Service Layer Class Diagram

```plantuml
@startuml service_layer

skinparam classAttributeIconSize 0

package "Application Layer" {

    ' Service Interfaces
    interface UserService {
        + createUser(request: CreateUserRequest): User
        + updateUser(id: UUID, request: UpdateUserRequest): User
        + deleteUser(id: UUID): void
        + findById(id: UUID): User?
        + findAll(pageable: Pageable): Page<User>
        + search(query: String): List<User>
    }

    interface AuthService {
        + register(request: RegisterRequest): AuthResponse
        + login(request: LoginRequest): AuthResponse
        + logout(userId: UUID): void
        + refreshToken(refreshToken: String): TokenPair
        + verifyToken(token: String): Boolean
        + resetPassword(email: String): void
    }

    interface BiometricService {
        + enrollFace(userId: UUID, image: ByteArray): EnrollmentResponse
        + verifyFace(userId: UUID, image: ByteArray): VerificationResponse
        + deleteBiometric(id: UUID): void
        + getBiometricData(userId: UUID): List<BiometricData>
    }

    interface RoleService {
        + createRole(request: CreateRoleRequest): Role
        + updateRole(id: UUID, request: UpdateRoleRequest): Role
        + deleteRole(id: UUID): void
        + assignPermission(roleId: UUID, permissionId: UUID): void
        + removePermission(roleId: UUID, permissionId: UUID): void
    }

    ' Service Implementations
    class UserServiceImpl implements UserService {
        - userRepository: UserRepository
        - passwordEncoder: PasswordEncoder
        - eventPublisher: EventPublisher
        --
        + createUser(request: CreateUserRequest): User
        + updateUser(id: UUID, request: UpdateUserRequest): User
        - validateUser(request: CreateUserRequest): void
        - publishUserCreatedEvent(user: User): void
    }

    class AuthServiceImpl implements AuthService {
        - userRepository: UserRepository
        - passwordEncoder: PasswordEncoder
        - jwtService: JwtService
        - sessionRepository: SessionRepository
        --
        + register(request: RegisterRequest): AuthResponse
        + login(request: LoginRequest): AuthResponse
        - validateCredentials(email: String, password: String): User
        - handleFailedLogin(user: User): void
    }

    class BiometricServiceImpl implements BiometricService {
        - biometricRepository: BiometricDataRepository
        - userRepository: UserRepository
        - biometricClient: BiometricProcessorClient
        --
        + enrollFace(userId: UUID, image: ByteArray): EnrollmentResponse
        + verifyFace(userId: UUID, image: ByteArray): VerificationResponse
        - validateImageQuality(image: ByteArray): void
        - extractEmbedding(image: ByteArray): FloatArray
    }

    ' External Clients
    class BiometricProcessorClient {
        - webClient: WebClient
        - baseUrl: String
        --
        + enrollFace(image: ByteArray): EmbeddingResponse
        + verifyFace(image: ByteArray, embedding: FloatArray): VerificationResult
        + healthCheck(): Boolean
    }

    ' Repositories (Ports)
    interface UserRepository {
        + save(user: User): User
        + findById(id: UUID): User?
        + findByEmail(email: String): User?
        + findAll(pageable: Pageable): Page<User>
        + delete(id: UUID): void
    }

    interface BiometricDataRepository {
        + save(data: BiometricData): BiometricData
        + findByUserId(userId: UUID): List<BiometricData>
        + findPrimaryByUserId(userId: UUID): BiometricData?
        + searchSimilar(embedding: FloatArray, threshold: Float): List<BiometricData>
    }

    interface SessionRepository {
        + save(session: Session): Session
        + findByRefreshTokenHash(hash: String): Session?
        + findActiveByUserId(userId: UUID): List<Session>
        + deleteExpired(): Int
    }

    ' DTOs
    class CreateUserRequest {
        + email: String
        + password: String
        + firstName: String
        + lastName: String
        + phoneNumber: String?
    }

    class AuthResponse {
        + accessToken: String
        + refreshToken: String
        + tokenType: String
        + expiresIn: Long
        + user: UserDto
    }

    class EnrollmentResponse {
        + success: Boolean
        + userId: UUID
        + qualityScore: Float
        + message: String
    }

    class VerificationResponse {
        + verified: Boolean
        + confidence: Float
        + distance: Float
        + message: String
    }
}

' Relationships
UserServiceImpl ..> UserRepository : uses
AuthServiceImpl ..> UserRepository : uses
AuthServiceImpl ..> SessionRepository : uses
BiometricServiceImpl ..> BiometricDataRepository : uses
BiometricServiceImpl ..> UserRepository : uses
BiometricServiceImpl ..> BiometricProcessorClient : uses

@enduml
```

### 2.3 Biometric Processor Class Diagram

```plantuml
@startuml biometric_processor_classes

skinparam classAttributeIconSize 0

package "Biometric Processor" {

    ' Service Classes
    class FaceRecognitionService {
        - model_name: str
        - detector_backend: str
        - verification_threshold: float
        --
        + __init__(model_name: str, detector_backend: str)
        + extract_embedding(image_path: str): Tuple[bool, str, str]
        + verify_faces(image_path: str, stored_embedding: str): Tuple[bool, float, str]
        - _calculate_cosine_distance(emb1: ndarray, emb2: ndarray): float
        + validate_image(image_path: str): Tuple[bool, str]
    }

    class LivenessDetectionService {
        - puzzle_steps: List[PuzzleStep]
        - timeout_seconds: int
        --
        + generate_puzzle(): BiometricPuzzle
        + verify_liveness(video_frames: List[bytes], puzzle_id: str): LivenessResult
        - _detect_action(frame: bytes, action: str): bool
        - _calculate_ear(landmarks: List[Point]): float
        - _calculate_mar(landmarks: List[Point]): float
    }

    class ImageQualityValidator {
        - min_sharpness: float
        - min_brightness: float
        - min_contrast: float
        --
        + validate(image_path: str): QualityMetrics
        - _calculate_sharpness(image: ndarray): float
        - _calculate_brightness(image: ndarray): float
        - _calculate_contrast(image: ndarray): float
        - _detect_face_size(image: ndarray): float
    }

    ' Model Classes
    class FaceEmbedding {
        + embedding: List[float]
        + dimension: int
        + model_name: str
        --
        + to_numpy(): ndarray
        + calculate_distance(other: FaceEmbedding, metric: str): float
        + get_statistics(): Dict[str, float]
    }

    class VerificationResult {
        + verified: bool
        + confidence: float
        + distance: float
        + threshold: float
        + model_name: str
        --
        + is_successful(): bool
        + to_dict(): Dict[str, Any]
    }

    class QualityMetrics {
        + sharpness_score: float
        + brightness_score: float
        + contrast_score: float
        + face_size_score: float
        + pose_quality_score: float
        + overall_score: float
        + quality_level: QualityLevel
        + issues: List[str]
        --
        + is_acceptable(): bool
        + get_problematic_metrics(): List[str]
    }

    class BiometricPuzzle {
        + puzzle_id: str
        + steps: List[PuzzleStep]
        + timeout: int
        + created_at: datetime
        + expires_at: datetime
        --
        + is_expired(): bool
        + get_next_step(): PuzzleStep
    }

    class PuzzleStep {
        + action: str
        + duration: int
        + order: int
        --
        + validate_action(detected_action: str): bool
    }

    class LivenessResult {
        + success: bool
        + liveness_confirmed: bool
        + steps_completed: int
        + total_steps: int
        + completion_time: float
        + failure_reason: str
        --
        + is_successful(): bool
    }

    ' Enums
    enum QualityLevel {
        EXCELLENT
        GOOD
        FAIR
        POOR
        VERY_POOR
    }

    enum BiometricAction {
        SMILE
        BLINK_LEFT
        BLINK_RIGHT
        BLINK_BOTH
        LOOK_LEFT
        LOOK_RIGHT
        LOOK_UP
        LOOK_DOWN
        NEUTRAL
    }
}

' Relationships
FaceRecognitionService --> FaceEmbedding : creates
FaceRecognitionService --> VerificationResult : returns
ImageQualityValidator --> QualityMetrics : returns
LivenessDetectionService --> BiometricPuzzle : generates
LivenessDetectionService --> LivenessResult : returns
BiometricPuzzle *-- PuzzleStep : contains
QualityMetrics -- QualityLevel : uses
PuzzleStep -- BiometricAction : defines

@enduml
```

---

## 3. Sequence Diagrams

### 3.1 User Registration Flow

```plantuml
@startuml user_registration

actor User
participant "Mobile App" as App
participant "API Gateway" as Gateway
participant "Identity Core" as Identity
participant "Database" as DB
participant "Email Service" as Email

User -> App: Enter registration details
App -> App: Validate input locally

App -> Gateway: POST /api/v1/auth/register
Gateway -> Identity: Forward request

Identity -> Identity: Validate email format
Identity -> Identity: Check password strength

Identity -> DB: Check if email exists
alt Email already exists
    DB --> Identity: User found
    Identity --> Gateway: 409 Conflict
    Gateway --> App: Email already registered
    App --> User: Show error message
else Email not found
    DB --> Identity: No user found

    Identity -> Identity: Hash password (BCrypt)
    Identity -> Identity: Create User entity

    Identity -> DB: INSERT user
    DB --> Identity: User created (UUID)

    Identity -> Identity: Generate email verification token

    Identity -> DB: INSERT verification_token
    DB --> Identity: Token saved

    Identity -> Email: Send verification email
    Email --> Identity: Email queued

    Identity -> Identity: Generate JWT tokens

    Identity -> DB: INSERT session
    DB --> Identity: Session created

    Identity --> Gateway: 201 Created + AuthResponse
    Gateway --> App: Registration successful
    App --> User: Show success message
    App -> App: Store tokens securely
end

@enduml
```

### 3.2 Face Enrollment with Quality Validation

```plantuml
@startuml face_enrollment_quality

actor User
participant "Mobile App" as App
participant "Camera" as Camera
participant "API Gateway" as Gateway
participant "Identity Core" as Identity
participant "Biometric Processor" as Biometric
participant "Database" as DB

User -> App: Navigate to enrollment
App -> Camera: Request camera permission
Camera --> App: Permission granted

App -> Camera: Start preview
Camera --> App: Camera stream active

User -> App: Capture face photo
App -> Camera: Capture image
Camera --> App: Image captured (ByteArray)

App -> App: Compress image (< 5MB)

App -> Gateway: POST /biometric/enroll/{userId}\n(multipart/form-data)
Gateway -> Identity: Forward request

Identity -> DB: Check user exists
DB --> Identity: User found

Identity -> DB: Check if already enrolled
DB --> Identity: Not enrolled yet

Identity -> Biometric: POST /face/enroll\n(image data)

Biometric -> Biometric: Save temp file
Biometric -> Biometric: Validate image format

Biometric -> Biometric: **Quality Validation**\n- Check resolution\n- Check file size\n- Verify not corrupted

alt Quality Check Failed
    Biometric --> Identity: 400 Bad Request\n(Quality issues)
    Identity --> Gateway: Error response
    Gateway --> App: Quality validation failed
    App --> User: Show specific issues:\n- Resolution too low\n- Image too dark\n- etc.

    User -> App: Retake photo
    App -> Camera: Capture again
else Quality Check Passed

    Biometric -> Biometric: **Detect Face**\nUsing RetinaFace

    alt No Face Detected
        Biometric --> Identity: 400 Bad Request\n(No face found)
        Identity --> Gateway: Error response
        Gateway --> App: No face detected
        App --> User: Please center face\nin camera
    else Multiple Faces
        Biometric --> Identity: 400 Bad Request\n(Multiple faces)
        Identity --> Gateway: Error response
        Gateway --> App: Multiple faces detected
        App --> User: Ensure only one person\nin frame
    else Single Face Detected

        Biometric -> Biometric: **Calculate Quality Scores**\n- Sharpness: 85/100\n- Brightness: 78/100\n- Contrast: 82/100\n- Face size: 90/100\n- Pose: 88/100

        alt Overall Quality < Threshold (50)
            Biometric --> Identity: 400 Bad Request\n(Low quality)
            Identity --> Gateway: Error with scores
            Gateway --> App: Quality too low
            App --> User: Show quality report:\n- Improve lighting\n- Hold steady\n- Move closer
        else Quality Acceptable

            Biometric -> Biometric: **Extract Embedding**\nVGG-Face model
            Biometric -> Biometric: Generate 512-D vector

            Biometric -> Biometric: Cleanup temp file

            Biometric --> Identity: 200 OK\n{embedding, quality_score}

            Identity -> Identity: Convert embedding to JSONB
            Identity -> Identity: Encrypt embedding (AES-256)

            Identity -> DB: INSERT biometric_data
            DB --> Identity: Biometric saved (UUID)

            Identity -> DB: UPDATE users\nSET is_biometric_enrolled = true
            DB --> Identity: User updated

            Identity -> DB: INSERT audit_log\n(biometric.enrolled event)
            DB --> Identity: Audit logged

            Identity --> Gateway: 200 OK\n{success, userId, confidence}
            Gateway --> App: Enrollment successful

            App --> User: Face enrolled successfully!\nQuality Score: 85/100
        end
    end
end

@enduml
```

### 3.3 Face Verification with Liveness Detection

```plantuml
@startuml face_verification_liveness

actor User
participant "Mobile App" as App
participant "Camera" as Camera
participant "API Gateway" as Gateway
participant "Identity Core" as Identity
participant "Biometric Processor" as Biometric
participant "Database" as DB
participant "Redis" as Redis

User -> App: Initiate verification
App -> App: Check network connectivity

App -> Gateway: GET /api/v1/liveness/generate-puzzle
Gateway -> Biometric: Forward request

Biometric -> Biometric: Generate random puzzle\n(3-5 steps)
Biometric -> Redis: SETEX puzzle:{id} 60
Redis --> Biometric: Cached

Biometric --> Gateway: 200 OK\n{puzzle_id, steps[], timeout}
Gateway --> App: Puzzle received

App -> Camera: Start video stream
Camera --> App: Stream active

App --> User: **Show Instructions**\n1. Smile\n2. Blink both eyes\n3. Look right\n4. Return to neutral

loop For each puzzle step
    App --> User: Display current step:\n"Please SMILE"

    User -> Camera: Perform action
    Camera --> App: Video frames

    App -> App: **Detect facial landmarks**\nUsing MediaPipe

    App -> App: **Calculate metrics**\n- EAR (Eye Aspect Ratio)\n- MAR (Mouth Aspect Ratio)\n- Head pose angles

    alt Action detected correctly
        App --> User: Step complete (green)
        App -> App: Move to next step
    else Action timeout (no detection)
        App --> User: Timeout, try again
        App -> App: Retry current step
    end
end

App -> App: Capture final frame
App -> App: Extract landmarks sequence

App -> Gateway: POST /api/v1/liveness/verify
note right
{
  "puzzle_id": "uuid",
  "video_frames": [base64...],
  "landmarks_sequence": [[x,y]...],
  "user_id": "uuid"
}
end note

Gateway -> Biometric: Forward request

Biometric -> Redis: GET puzzle:{id}
Redis --> Biometric: Puzzle data

Biometric -> Biometric: Validate puzzle not expired
Biometric -> Biometric: Verify step sequence matches
Biometric -> Biometric: Analyze timing patterns

alt Liveness check failed
    Biometric --> Gateway: 403 Forbidden\n(Liveness not confirmed)
    Gateway --> App: Liveness failed
    App --> User: Verification failed:\nCould not confirm liveness
else Liveness confirmed

    Biometric --> Gateway: 200 OK\n{liveness_confirmed, final_frame}
    Gateway -> Identity: POST /biometric/verify/{userId}\n(final_frame)

    Identity -> DB: SELECT embedding\nFROM biometric_data\nWHERE user_id = ?
    DB --> Identity: Stored embedding

    Identity -> Biometric: POST /face/verify\n{image, stored_embedding}

    Biometric -> Biometric: Extract new embedding
    Biometric -> Biometric: Calculate cosine distance
    Biometric -> Biometric: Compare with threshold

    alt Distance < Threshold (0.30)
        Biometric --> Identity: {verified: true,\nconfidence: 0.92}

        Identity -> DB: UPDATE users\nSET verification_count++,\nlast_verified_at = NOW()

        Identity -> DB: INSERT verification_logs

        Identity -> Redis: PUBLISH user.verified

        Identity --> Gateway: 200 OK\n{verified: true,\nconfidence: 92%}
        Gateway --> App: Verification successful

        App --> User: **Verified Successfully!**\nConfidence: 92%\nWelcome back!
    else Distance >= Threshold
        Biometric --> Identity: {verified: false,\nconfidence: 0.45}

        Identity -> DB: UPDATE users\nSET failed_verification_count++

        Identity -> DB: INSERT verification_logs\n(failed)

        Identity --> Gateway: 200 OK\n{verified: false,\nconfidence: 45%}
        Gateway --> App: Verification failed

        App --> User: **Verification Failed**\nFace does not match\nConfidence: 45%
    end
end

@enduml
```

### 3.4 Multi-Tenant User Creation

```plantuml
@startuml multi_tenant_creation

actor "Tenant Admin" as Admin
participant "Admin Dashboard" as Dashboard
participant "API Gateway" as Gateway
participant "Identity Core" as Identity
participant "PostgreSQL" as DB

Admin -> Dashboard: Login to tenant\n(tenant-acme)
Dashboard -> Dashboard: Set tenant context\nX-Tenant-ID: tenant-acme

Admin -> Dashboard: Navigate to\n"Add User" page
Admin -> Dashboard: Fill user form

Dashboard -> Dashboard: Validate form\n- Email format\n- Password strength\n- Required fields

Dashboard -> Gateway: POST /api/v1/users\nHeader: X-Tenant-ID: tenant-acme
note right
{
  "email": "john@acme.com",
  "firstName": "John",
  "lastName": "Doe",
  "roles": ["END_USER"]
}
end note

Gateway -> Gateway: Extract tenant ID\nfrom header
Gateway -> Identity: Forward with\ntenant context

Identity -> Identity: Set database schema:\ntenant_acme

Identity -> DB: SET search_path = 'tenant_acme'
DB --> Identity: Schema set

Identity -> DB: BEGIN TRANSACTION

Identity -> DB: SELECT tenant_id, max_users,\ncurrent_user_count\nFROM shared.tenants\nWHERE slug = 'tenant-acme'
DB --> Identity: Tenant info

alt Current users >= Max users
    Identity -> DB: ROLLBACK
    Identity --> Gateway: 403 Forbidden\n(User limit reached)
    Gateway --> Dashboard: Quota exceeded
    Dashboard --> Admin: Cannot add user:\nPlan limit reached (100/100)\nPlease upgrade plan
else Quota available

    Identity -> DB: SELECT * FROM users\nWHERE email = 'john@acme.com'
    DB --> Identity: No user found

    alt Email already exists
        Identity -> DB: ROLLBACK
        Identity --> Gateway: 409 Conflict
        Gateway --> Dashboard: Email exists
        Dashboard --> Admin: User already exists\nin your organization
    else Email unique

        Identity -> Identity: Hash password
        Identity -> Identity: Create User entity

        Identity -> DB: INSERT INTO users\n(id, email, first_name, ...)\nVALUES (?, ?, ?, ...)
        DB --> Identity: User created (UUID)

        Identity -> DB: INSERT INTO user_roles\n(user_id, role_id)\nSELECT ?, id FROM roles\nWHERE name = 'END_USER'
        DB --> Identity: Roles assigned

        Identity -> DB: UPDATE shared.tenants\nSET current_user_count =\n    current_user_count + 1\nWHERE slug = 'tenant-acme'
        DB --> Identity: Count updated

        Identity -> DB: INSERT INTO audit_logs\n(event_type, actor_id,\n target_id, description)
        DB --> Identity: Audit logged

        Identity -> DB: COMMIT TRANSACTION
        DB --> Identity: Transaction committed

        Identity --> Gateway: 201 Created\n{user object}
        Gateway --> Dashboard: User created

        Dashboard --> Admin: User created successfully!\nInvitation email sent to:\njohn@acme.com

        Dashboard -> Dashboard: Refresh user list
        Dashboard --> Admin: Updated list:\nUsers: 51/100
    end
end

note right of DB
**Multi-Tenancy Isolation:**
- Each tenant has separate schema
- tenant_acme.users
- tenant_techcorp.users
- Complete data isolation
- Shared tables in 'shared' schema
end note

@enduml
```

---

## 4. State Machine Diagrams

### 4.1 User Lifecycle State Machine

```plantuml
@startuml user_state_machine

[*] --> PENDING_VERIFICATION : User registers

PENDING_VERIFICATION --> ACTIVE : Email verified\n& email verification
PENDING_VERIFICATION --> PENDING_VERIFICATION : Resend verification

ACTIVE --> SUSPENDED : Admin suspends\nOR policy violation
ACTIVE --> LOCKED : Too many\nfailed login attempts
ACTIVE --> INACTIVE : Admin deactivates\nOR user requests

SUSPENDED --> ACTIVE : Admin reinstates
SUSPENDED --> INACTIVE : Permanent suspension

LOCKED --> ACTIVE : Unlock timeout expires\nOR admin unlocks
LOCKED --> ACTIVE : Password reset\ncompleted

INACTIVE --> ACTIVE : Admin reactivates\nOR user re-registers

ACTIVE --> [*] : Account deleted\n(soft delete)
SUSPENDED --> [*] : Account deleted
LOCKED --> [*] : Account deleted
INACTIVE --> [*] : Account deleted

note right of PENDING_VERIFICATION
  **Initial State**
  - Created but not verified
  - Limited access
  - Email verification required
end note

note right of ACTIVE
  **Normal State**
  - Full access
  - Can enroll biometric
  - Can verify identity
end note

note right of LOCKED
  **Security State**
  - Auto-locked after 5 failed attempts
  - Requires password reset
  - Or auto-unlock after 15 minutes
end note

note right of SUSPENDED
  **Administrative State**
  - Admin action required
  - Policy violation or security concern
  - All access revoked
end note

@enduml
```

### 4.2 Biometric Enrollment State Machine

```plantuml
@startuml biometric_enrollment_state

[*] --> NOT_ENROLLED : User created

NOT_ENROLLED --> CAPTURING : Start enrollment

CAPTURING --> VALIDATING_QUALITY : Image captured

VALIDATING_QUALITY --> QUALITY_FAILED : Quality check fails\n(too dark, blurry, etc.)
QUALITY_FAILED --> CAPTURING : Retry capture

VALIDATING_QUALITY --> DETECTING_FACE : Quality acceptable

DETECTING_FACE --> FACE_NOT_DETECTED : No face found\nOR multiple faces
FACE_NOT_DETECTED --> CAPTURING : Retry capture

DETECTING_FACE --> EXTRACTING_EMBEDDING : Single face detected

EXTRACTING_EMBEDDING --> EXTRACTION_FAILED : Model error\nOR processing error
EXTRACTION_FAILED --> CAPTURING : Retry enrollment

EXTRACTING_EMBEDDING --> STORING : Embedding extracted

STORING --> STORAGE_FAILED : Database error
STORAGE_FAILED --> EXTRACTING_EMBEDDING : Retry storage

STORING --> ENROLLED : Successfully stored

ENROLLED --> UPDATING : Re-enrollment requested
UPDATING --> VALIDATING_QUALITY : New image captured

ENROLLED --> ARCHIVED : User deactivated\nOR biometric expired
ARCHIVED --> UPDATING : Re-activation

ENROLLED --> [*] : User deleted

note right of VALIDATING_QUALITY
  **Quality Checks:**
  - Sharpness ≥ 40/100
  - Brightness ≥ 30/100
  - Contrast ≥ 30/100
  - Face size ≥ 50% of image
  - Pose quality ≥ 40/100
end note

note right of ENROLLED
  **Final State**
  - Biometric data stored
  - User can verify
  - Version tracking enabled
end note

@enduml
```

### 4.3 Verification Attempt State Machine

```plantuml
@startuml verification_state_machine

[*] --> INITIATED : User starts verification

INITIATED --> LIVENESS_CHECK : Liveness enabled
INITIATED --> FACE_CAPTURE : Liveness disabled

LIVENESS_CHECK --> PUZZLE_GENERATED : Generate puzzle

PUZZLE_GENERATED --> PERFORMING_ACTIONS : Show instructions

PERFORMING_ACTIONS --> LIVENESS_FAILED : Timeout\nOR wrong sequence\nOR spoofing detected
LIVENESS_FAILED --> [*] : Return failure

PERFORMING_ACTIONS --> LIVENESS_CONFIRMED : All steps completed\ncorrectly

LIVENESS_CONFIRMED --> FACE_CAPTURE : Capture final frame

FACE_CAPTURE --> QUALITY_CHECK : Image captured

QUALITY_CHECK --> LOW_QUALITY : Quality < threshold
LOW_QUALITY --> FACE_CAPTURE : Retry capture

QUALITY_CHECK --> EXTRACTING : Quality acceptable

EXTRACTING --> EXTRACTION_ERROR : Processing failed
EXTRACTION_ERROR --> [*] : Return error

EXTRACTING --> COMPARING : Embedding extracted

COMPARING --> RETRIEVING_STORED : Get stored embedding

RETRIEVING_STORED --> DATABASE_ERROR : User not found\nOR no biometric data
DATABASE_ERROR --> [*] : Return error

RETRIEVING_STORED --> CALCULATING_DISTANCE : Embeddings retrieved

CALCULATING_DISTANCE --> VERIFICATION_SUCCESS : Distance < threshold\n(e.g., < 0.30)
CALCULATING_DISTANCE --> VERIFICATION_FAILURE : Distance >= threshold

VERIFICATION_SUCCESS --> LOGGING_SUCCESS : Log successful verification
LOGGING_SUCCESS --> [*] : Return success

VERIFICATION_FAILURE --> LOGGING_FAILURE : Log failed verification
LOGGING_FAILURE --> [*] : Return failure

note right of LIVENESS_CHECK
  **Optional Step**
  - Enabled for high-security contexts
  - Random puzzle generation
  - Prevents photo/video attacks
end note

note right of COMPARING
  **Distance Calculation**
  - Cosine similarity
  - Threshold: 0.30 (configurable)
  - Lower distance = higher similarity
end note

@enduml
```

### 4.4 Session Lifecycle State Machine

```plantuml
@startuml session_state_machine

[*] --> CREATED : User logs in

CREATED --> ACTIVE : Token validated

ACTIVE --> ACTIVE : API requests\n(update last_activity)

ACTIVE --> EXPIRED : Reaches expiry time\n(default: 7 days)

ACTIVE --> REVOKED_BY_USER : User logs out

ACTIVE --> REVOKED_BY_ADMIN : Admin revokes session

ACTIVE --> REVOKED_BY_SYSTEM : Security policy\nOR suspicious activity

ACTIVE --> REFRESHED : Refresh token used

REFRESHED --> ACTIVE : New token pair issued

EXPIRED --> [*] : Cleanup job\ndeletes session

REVOKED_BY_USER --> [*] : Session terminated
REVOKED_BY_ADMIN --> [*] : Session terminated
REVOKED_BY_SYSTEM --> [*] : Session terminated

note right of ACTIVE
  **Active Session**
  - Valid refresh token
  - Can generate access tokens
  - Tracks last activity
  - Device information stored
end note

note right of REFRESHED
  **Token Rotation**
  - Old refresh token invalidated
  - New refresh token issued
  - New access token issued
  - Prevents token replay attacks
end note

@enduml
```

---

## 5. Activity Diagrams

### 5.1 Complete User Onboarding Activity

```plantuml
@startuml user_onboarding_activity

start

:User opens mobile app;

if (User has account?) then (yes)
  :Navigate to login;
  stop
else (no)
  :Tap "Register";
endif

partition "Registration Process" {
  :Enter registration details:
  - Email
  - Password
  - First name
  - Last name
  - Phone number;

  :Validate input locally;

  if (All fields valid?) then (no)
    :Show validation errors;
    stop
  endif

  :Submit registration request;

  fork
    :Create user account;
  fork again
    :Send verification email;
  end fork

  :Show success message;
  :Auto-login with JWT tokens;
}

partition "Email Verification" {
  :User opens email;
  :Click verification link;

  if (Link valid & not expired?) then (yes)
    :Mark email as verified;
    :Show success notification;
  else (no)
    :Show error: "Link expired";
    :Offer resend option;
  endif
}

partition "Profile Completion" {
  :Navigate to profile;

  if (Profile complete?) then (no)
    :Prompt to complete profile:
    - Profile photo (optional)
    - Date of birth
    - Address;

    :Save profile updates;
  endif
}

partition "Biometric Enrollment" {
  :Show enrollment prompt:
  "Secure your account with
  face recognition";

  if (User agrees?) then (yes)
    :Navigate to enrollment screen;

    repeat
      :Request camera permission;

      if (Permission granted?) then (no)
        :Show permission explanation;
        :Request again;
        stop
      endif

      :Show camera preview;
      :Display face position guide;

      :User captures face photo;

      :Validate image quality;

    repeat while (Quality acceptable?) is (no)
    ->yes;

    :Extract face embedding;
    :Store biometric data;

    :Show success:
    "Face enrolled successfully!";
  else (no)
    :Show "Skip for now" option;
    note right
      User can enroll later
      from settings
    end note
  endif
}

partition "Onboarding Complete" {
  :Show welcome tour;
  :Highlight key features;
  :Navigate to home screen;
}

stop

@enduml
```

### 5.2 Face Verification Decision Activity

```plantuml
@startuml verification_decision_activity

start

:Receive verification request;

partition "Pre-Verification Checks" {
  if (User exists?) then (no)
    :Return 404 Not Found;
    stop
  endif

  if (User is active?) then (no)
    :Return 403 Forbidden\n"Account suspended";
    stop
  endif

  if (User has biometric enrolled?) then (no)
    :Return 400 Bad Request\n"No biometric data";
    stop
  endif

  :Check rate limit;

  if (Rate limit exceeded?) then (yes)
    :Return 429 Too Many Requests;
    stop
  endif
}

partition "Liveness Detection" {
  if (Liveness required?) then (yes)
    :Generate liveness puzzle;
    :Return puzzle to client;

    :Wait for liveness verification;

    if (Liveness confirmed?) then (no)
      :Log liveness failure;
      :Return 403 Forbidden\n"Liveness check failed";
      stop
    endif
  endif
}

partition "Image Processing" {
  :Receive face image;

  fork
    :Validate image format;
  fork again
    :Check file size;
  fork again
    :Validate image dimensions;
  end fork

  if (Image valid?) then (no)
    :Return 400 Bad Request\n"Invalid image";
    stop
  endif

  :Forward to Biometric Processor;
}

partition "Quality Assessment" {
  :Calculate quality metrics;

  if (Sharpness < 40?) then (yes)
    :Return error: "Image too blurry";
    stop
  endif

  if (Brightness < 30 OR > 80?) then (yes)
    :Return error: "Poor lighting";
    stop
  endif

  if (Face size < 50%?) then (yes)
    :Return error: "Face too small";
    stop
  endif
}

partition "Face Detection" {
  :Detect faces in image;

  if (Faces detected?) then (== 0)
    :Return error: "No face detected";
    stop
  elseif (> 1)
    :Return error: "Multiple faces";
    stop
  endif
}

partition "Embedding Extraction & Comparison" {
  :Extract embedding from image;

  :Retrieve stored embedding(s);

  if (Primary biometric exists?) then (yes)
    :Use primary embedding;
  else (no)
    :Use most recent active embedding;
  endif

  :Calculate cosine distance;

  if (Distance < threshold?) then (yes)
    :Set verified = true;
    :Calculate confidence = 1 - distance;
  else (no)
    :Set verified = false;
    :Calculate confidence;
  endif
}

partition "Post-Verification Actions" {
  if (Verified?) then (yes)
    fork
      :Increment verification_count;
    fork again
      :Update last_verified_at;
    fork again
      :Reset failed_verification_count;
    fork again
      :Log successful verification;
    fork again
      :Publish "user.verified" event;
    end fork

    :Return success response:
    {
      verified: true,
      confidence: 0.92,
      message: "Verified successfully"
    };
  else (no)
    fork
      :Increment failed_verification_count;
    fork again
      :Log failed verification;
    end fork

    if (Failed count > 5?) then (yes)
      :Lock user account;
      :Send security alert;
    endif

    :Return failure response:
    {
      verified: false,
      confidence: 0.45,
      message: "Face does not match"
    };
  endif
}

stop

@enduml
```

### 5.3 Tenant Management Activity

```plantuml
@startuml tenant_management_activity

start

:System Admin logs in;

partition "Tenant Creation" {
  :Navigate to "Create Tenant";

  :Enter tenant details:
  - Organization name
  - Domain (optional)
  - Contact email
  - Subscription plan;

  :Validate input;

  if (Slug available?) then (no)
    :Show error: "Name taken";
    stop
  endif

  fork
    :Create tenant in shared schema;
  fork again
    :Create dedicated schema\n"tenant_{slug}";
  fork again
    :Copy schema structure;
  fork again
    :Insert default roles\nand permissions;
  fork again
    :Generate API credentials;
  end fork

  :Send welcome email to tenant;

  :Show tenant dashboard;
}

partition "Tenant Configuration" {
  :Tenant Admin logs in;

  repeat
    :View current configuration;

    if (Need to change settings?) then (yes)
      :Select setting to modify:
      |Settings|
      - Subscription plan
      - User quota
      - Feature flags
      - Security policies
      - Branding
      - Notification settings;

      :Update configuration;

      if (Requires approval?) then (yes)
        :Submit change request;
        :Notify system admin;

        :System admin reviews;

        if (Approved?) then (yes)
          :Apply changes;
        else (no)
          :Notify tenant admin;
        endif
      else (no)
        :Apply changes immediately;
      endif

      :Log configuration change;
    endif
  repeat while (More changes?) is (yes)
  ->no;
}

partition "Usage Monitoring" {
  :View tenant dashboard;

  fork
    :Show current user count;
  fork again
    :Show API call statistics;
  fork again
    :Show storage usage;
  fork again
    :Show verification metrics;
  end fork

  if (Approaching quota limits?) then (yes)
    :Show warning notification;

    if (Upgrade offered?) then (yes)
      :Initiate upgrade process;

      :Select new plan;
      :Process payment;
      :Update subscription;
      :Increase quotas;

      :Send confirmation;
    endif
  endif
}

partition "Tenant Suspension/Deletion" {
  if (Suspend tenant?) then (yes)
    :System admin suspends;

    fork
      :Set is_active = false;
    fork again
      :Revoke all active sessions;
    fork again
      :Notify tenant admin;
    fork again
      :Log suspension event;
    end fork

    :All access blocked;
  endif

  if (Delete tenant?) then (yes)
    :Confirm deletion;

    if (Data retention required?) then (yes)
      :Export tenant data;
      :Store in archive;
    endif

    fork
      :Soft delete tenant record;
    fork again
      :Mark schema for cleanup;
    fork again
      :Revoke all credentials;
    fork again
      :Cancel subscription;
    fork again
      :Send deletion confirmation;
    end fork
  endif
}

stop

@enduml
```

### 5.4 Biometric Re-enrollment Activity

```plantuml
@startuml biometric_reenrollment_activity

start

:User initiates re-enrollment;

partition "Reason Determination" {
  if (Why re-enroll?) then (Quality improvement)
    :User wants better quality;
  elseif (Appearance changed)
    :Significant change:
    - Weight loss/gain
    - Surgery
    - Aging;
  elseif (Failed verifications)
    :Multiple verification failures;
  elseif (Security concern)
    :Suspected compromise;
  elseif (Upgrade model)
    :New model available;
  endif
}

partition "Pre-Enrollment Validation" {
  :Retrieve existing biometric data;

  if (Active biometric exists?) then (no)
    :Redirect to initial enrollment;
    stop
  endif

  :Check re-enrollment cooldown;

  if (Too soon since last enrollment?) then (yes)
    :Show warning:
    "Please wait 24 hours
    between enrollments";

    if (Admin override?) then (no)
      stop
    endif
  endif

  :Require re-authentication;

  if (Password verified?) then (no)
    :Return to login;
    stop
  endif
}

partition "Capture New Biometric" {
  :Show camera interface;

  repeat
    :Capture face image;
    :Validate quality;
  repeat while (Quality < existing?) is (yes)
  ->better;

  :Extract new embedding;
}

partition "Comparison with Existing" {
  :Compare new vs. old embedding;

  if (Similarity > 0.5?) then (yes)
    :Likely same person;
    :Proceed with re-enrollment;
  else (no)
    :Suspiciously different;

    if (Admin approval required?) then (yes)
      :Create approval request;
      :Notify admin;

      :Wait for admin review;

      if (Approved?) then (no)
        :Reject re-enrollment;
        :Log security event;
        stop
      endif
    endif
  endif
}

partition "Version Management" {
  :Create new biometric_data record:
  - version = old_version + 1
  - previous_version_id = old_id;

  :Store new embedding;

  if (Keep old version?) then (yes)
    :Archive old biometric:
    - Set is_active = false
    - Keep for audit;
  else (no)
    :Delete old biometric;
  endif

  :Update user record:
  - enrolled_at = NOW()
  - Set new as primary;
}

partition "Testing New Biometric" {
  :Prompt user:
  "Test new enrollment?";

  if (User agrees?) then (yes)
    :Perform test verification;

    repeat
      :Capture test image;
      :Verify against new embedding;

      if (Verified successfully?) then (yes)
        :Show success message;
      else (no)
        :Show failure;

        if (Rollback?) then (yes)
          :Restore old biometric;
          :Delete new biometric;
          stop
        endif
      endif
    repeat while (Try again?) is (yes)
  endif
}

partition "Finalization" {
  fork
    :Log re-enrollment event;
  fork again
    :Update verification logs;
  fork again
    :Notify user via email;
  fork again
    :Update analytics;
  end fork

  :Show success screen:
  "Biometric updated successfully
  Quality improved: 75 → 92";
}

stop

@enduml
```

---

**This file contains:**
- ER Diagrams (2 variants)
- Class Diagrams (3 detailed diagrams)
- Sequence Diagrams (4 comprehensive flows)
- State Machine Diagrams (4 lifecycle diagrams)
- Activity Diagrams (4 complex processes)

**Continue to PLANTUML_DIAGRAMS_PART2.md for:**
- Component Diagrams
- Deployment Diagrams
- Use Case Diagrams
- Additional Diagrams
