# FIVUCSAS - PlantUML Diagrams Collection (Part 2)

**Document Version:** 2.0
**Date:** November 4, 2025
**Continuation of:** PLANTUML_DIAGRAMS.md

---

## 6. Component Diagrams

### 6.1 System-Wide Component Architecture

```plantuml
@startuml system_components

skinparam componentStyle rectangle
skinparam packageStyle rectangle

package "API Gateway Layer" {
    [NGINX Reverse Proxy] as nginx
    [Rate Limiter] as rate_limiter
    [Auth Middleware] as auth_middleware
}

package "Identity Core API" {
    component "Presentation Layer" {
        [Auth Controller] as auth_ctrl
        [User Controller] as user_ctrl
        [Biometric Controller] as bio_ctrl
    }

    component "Application Layer" {
        [Auth Service] as auth_svc
        [User Service] as user_svc
        [Biometric Service] as bio_svc
    }

    component "Domain Layer" {
        [User Entity] as user_entity
        [Biometric Entity] as bio_entity
        [Repository Interfaces] as repo_interfaces
    }

    component "Infrastructure Layer" {
        [JPA Repositories] as jpa_repo
        [JWT Service] as jwt_svc
        [Password Encoder] as pwd_encoder
        [HTTP Client] as http_client
    }
}

package "Biometric Processor (Python)" {
    [Face API Endpoints] as face_api
    [Liveness API Endpoints] as liveness_api

    [Face Recognition Service] as face_recognition
    [Liveness Detection Service] as liveness_detection
    [Quality Validator] as quality_validator

    [DeepFace Engine] as deepface
    [MediaPipe Engine] as mediapipe
}

package "Mobile/Desktop App (KMP)" {
    [UI Layer (Compose)] as ui_layer
    [ViewModel Layer] as vm_layer
    [Repository Layer] as app_repo
    [Camera Service] as camera_svc
}

database "PostgreSQL 16" {
    [Users Table] as users_table
    [Biometric Data (pgvector)] as bio_table
}

database "Redis 7" {
    [Session Cache] as session_cache
    [Rate Limit Cache] as rate_cache
    [Message Queue] as message_queue
}

' API Gateway Flow
nginx --> auth_middleware : forwards
auth_middleware --> rate_limiter : validates
rate_limiter --> auth_ctrl : allows
rate_limiter --> user_ctrl : allows
rate_limiter --> bio_ctrl : allows

' Identity Core Internal Flow
auth_ctrl --> auth_svc
user_ctrl --> user_svc
bio_ctrl --> bio_svc

auth_svc --> jwt_svc : generates tokens
auth_svc --> pwd_encoder : hashes passwords
user_svc --> jpa_repo : CRUD operations
bio_svc --> http_client : calls biometric API

jpa_repo --> user_entity
jpa_repo --> bio_entity
jpa_repo ..> repo_interfaces : implements

jpa_repo --> users_table : SQL
jpa_repo --> bio_table : pgvector queries
jwt_svc --> session_cache : stores sessions
rate_limiter --> rate_cache : checks limits
auth_svc --> message_queue : publishes events

' Biometric Processor Flow
http_client --> face_api : REST
http_client --> liveness_api : REST

face_api --> face_recognition
liveness_api --> liveness_detection
face_api --> quality_validator

face_recognition --> deepface : uses models
liveness_detection --> mediapipe : facial landmarks

' Mobile App Flow
camera_svc --> vm_layer : provides images
vm_layer --> ui_layer : updates state
app_repo --> nginx : HTTPS API calls
vm_layer --> app_repo : data requests

@enduml
```

### 6.2 Identity Core API Internal Components

```plantuml
@startuml identity_core_internal

package "Presentation Layer" {
    [Auth Controller] as auth_ctrl
    [User Controller] as user_ctrl
    [Biometric Controller] as bio_ctrl
    [Role Controller] as role_ctrl
    [Tenant Controller] as tenant_ctrl
}

package "Application Layer" {
    [Auth Service] as auth_svc
    [User Service] as user_svc
    [Biometric Service] as bio_svc
    [Role Service] as role_svc
    [Tenant Service] as tenant_svc
    [Email Service] as email_svc
    [SMS Service] as sms_svc
}

package "Domain Layer" {
    [User Entity] as user_entity
    [Role Entity] as role_entity
    [BiometricData Entity] as bio_entity
    [Session Entity] as session_entity
    [Tenant Entity] as tenant_entity

    [User Repository Interface] as user_repo_i
    [Role Repository Interface] as role_repo_i
    [Biometric Repository Interface] as bio_repo_i
}

package "Infrastructure Layer" {
    [JPA User Repository] as user_repo
    [JPA Role Repository] as role_repo
    [JPA Biometric Repository] as bio_repo
    [Redis Session Repository] as session_repo

    [JWT Service] as jwt
    [Password Encoder] as pwd_encoder
    [Biometric Client] as bio_client
    [Email Provider] as email_provider
    [SMS Provider] as sms_provider
}

package "Cross-Cutting Concerns" {
    [Exception Handler] as exc_handler
    [Security Config] as security
    [Logging Aspect] as logging
    [Metrics Collector] as metrics
    [Audit Interceptor] as audit
}

' Controller -> Service
auth_ctrl --> auth_svc
user_ctrl --> user_svc
bio_ctrl --> bio_svc
role_ctrl --> role_svc
tenant_ctrl --> tenant_svc

' Service -> Service
auth_svc --> email_svc
user_svc --> email_svc
auth_svc --> sms_svc

' Service -> Repository Interface
auth_svc --> user_repo_i
user_svc --> user_repo_i
bio_svc --> bio_repo_i
role_svc --> role_repo_i
tenant_svc --> user_repo_i

' Service -> Infrastructure
auth_svc --> jwt
auth_svc --> pwd_encoder
auth_svc --> session_repo
bio_svc --> bio_client
email_svc --> email_provider
sms_svc --> sms_provider

' Repository Interface -> Repository Impl
user_repo_i <|.. user_repo
role_repo_i <|.. role_repo
bio_repo_i <|.. bio_repo

' Repository -> Entity
user_repo --> user_entity
role_repo --> role_entity
bio_repo --> bio_entity

' Cross-cutting
exc_handler ..> auth_ctrl : handles
exc_handler ..> user_ctrl : handles
security ..> auth_ctrl : secures
logging ..> auth_svc : logs
logging ..> user_svc : logs
metrics ..> auth_svc : measures
audit ..> user_svc : audits

note right of bio_client
  WebClient to Biometric
  Processor on port 8001
end note

note bottom of user_repo
  Uses Spring Data JPA
  Custom queries for
  complex operations
end note

@enduml
```

### 6.3 Biometric Processor Internal Components

```plantuml
@startuml biometric_processor_internal

package "API Layer" {
    [Face Endpoints] as face_api
    [Liveness Endpoints] as liveness_api
    [Health Endpoint] as health_api
}

package "Service Layer" {
    [Face Recognition Service] as face_svc
    [Liveness Detection Service] as liveness_svc
    [Image Quality Service] as quality_svc
    [Person Manager Service] as person_svc
}

package "Core ML Layer" {
    [DeepFace Wrapper] as deepface
    [MediaPipe Wrapper] as mediapipe
    [OpenCV Utils] as opencv
    [Model Manager] as model_mgr
}

package "Models" {
    [VGG-Face Model] as vgg
    [ArcFace Model] as arcface
    [Facenet Model] as facenet
    [RetinaFace Detector] as retinaface
}

package "Utilities" {
    [Image Preprocessor] as preprocessor
    [Vector Operations] as vector_ops
    [File Handler] as file_handler
    [Config Manager] as config
    [Logger] as logger
}

package "Data Models" {
    [FaceEmbedding] as embedding
    [VerificationResult] as verification
    [QualityMetrics] as quality
    [BiometricPuzzle] as puzzle
}

' API -> Service
face_api --> face_svc
face_api --> quality_svc
liveness_api --> liveness_svc

' Service -> Core ML
face_svc --> deepface
face_svc --> opencv
quality_svc --> opencv
liveness_svc --> mediapipe
person_svc --> face_svc

' Core ML -> Models
deepface --> model_mgr
model_mgr --> vgg
model_mgr --> arcface
model_mgr --> facenet
deepface --> retinaface

' Service -> Utilities
face_svc --> preprocessor
face_svc --> vector_ops
face_svc --> file_handler
liveness_svc --> file_handler
quality_svc --> preprocessor

face_svc --> config
liveness_svc --> config
quality_svc --> config

face_api --> logger
face_svc --> logger
liveness_svc --> logger

' Service -> Data Models
face_svc ..> embedding : creates
face_svc ..> verification : creates
quality_svc ..> quality : creates
liveness_svc ..> puzzle : creates

note right of model_mgr
  Lazy loading of models
  Cache in memory
  GPU acceleration if available
end note

note bottom of deepface
  Abstraction over DeepFace library
  Handles model loading, inference
  Vector extraction
end note

@enduml
```

---

## 7. Deployment Diagrams

### 7.1 Production Kubernetes Deployment

```plantuml
@startuml kubernetes_deployment

skinparam componentStyle rectangle

node "Kubernetes Cluster" {

    package "Ingress Layer" {
        [NGINX Ingress Controller] as ingress
        [Cert Manager] as cert_manager
    }

    package "Application Namespace" {
        node "Identity API Pod 1" {
            [Identity API Container] as identity1
        }
        node "Identity API Pod 2" {
            [Identity API Container] as identity2
        }
        node "Identity API Pod 3" {
            [Identity API Container] as identity3
        }

        [Identity Service\n(ClusterIP)] as identity_svc
        [Horizontal Pod Autoscaler] as hpa

        node "Biometric Pod 1" {
            [Biometric Processor] as bio1
        }
        node "Biometric Pod 2" {
            [Biometric Processor] as bio2
        }

        [Biometric Service\n(ClusterIP)] as bio_svc
    }

    package "Data Namespace" {
        node "PostgreSQL Master" {
            [PostgreSQL 16] as postgres_master
            database "Persistent Volume\n(100Gi SSD)" as postgres_pv
        }

        node "PostgreSQL Replica 1" {
            [PostgreSQL 16 Replica] as postgres_replica1
        }

        node "PostgreSQL Replica 2" {
            [PostgreSQL 16 Replica] as postgres_replica2
        }

        [PostgreSQL Service\n(ClusterIP)] as postgres_svc

        node "Redis Master" {
            [Redis 7] as redis_master
        }

        node "Redis Replica 1" {
            [Redis 7 Replica] as redis_replica1
        }

        [Redis Service\n(ClusterIP)] as redis_svc
    }

    package "Monitoring Namespace" {
        [Prometheus] as prometheus
        [Grafana] as grafana
        [Jaeger] as jaeger
    }
}

cloud "External Access" {
    [Users] as users
    [Mobile Apps] as mobile
}

' Connections
users --> ingress : HTTPS
mobile --> ingress : HTTPS
ingress --> identity_svc : routes /api/v1/auth, /api/v1/users
ingress --> bio_svc : routes /api/v1/face

identity_svc --> identity1
identity_svc --> identity2
identity_svc --> identity3

bio_svc --> bio1
bio_svc --> bio2

hpa ..> identity1 : scales
hpa ..> identity2 : scales
hpa ..> identity3 : scales

identity1 --> postgres_svc : SQL queries
identity2 --> postgres_svc : SQL queries
identity3 --> postgres_svc : SQL queries

identity1 --> redis_svc : cache/sessions
identity2 --> redis_svc : cache/sessions
identity3 --> redis_svc : cache/sessions

identity1 --> bio_svc : REST calls
identity2 --> bio_svc : REST calls
identity3 --> bio_svc : REST calls

postgres_svc --> postgres_master : write
postgres_svc --> postgres_replica1 : read
postgres_svc --> postgres_replica2 : read

postgres_master ..> postgres_pv : mounts

redis_svc --> redis_master : write
redis_svc --> redis_replica1 : read

prometheus --> identity_svc : scrapes metrics
prometheus --> bio_svc : scrapes metrics
prometheus --> postgres_svc : scrapes metrics
prometheus --> redis_svc : scrapes metrics

grafana --> prometheus : queries
jaeger <-- identity1 : traces
jaeger <-- identity2 : traces
jaeger <-- identity3 : traces

@enduml
```

### 7.2 Development Environment Deployment

```plantuml
@startuml development_deployment

node "Developer Workstation" {
    [IntelliJ IDEA] as ide
    [Android Studio] as android_studio
    [VS Code] as vscode
    [Docker Desktop] as docker_desktop
}

node "Local Docker Environment" {
    rectangle "Docker Compose" {
        component "identity-core-api\n:8080" as identity_local
        component "biometric-processor\n:8001" as biometric_local
        component "PostgreSQL\n:5432" as postgres_local
        component "Redis\n:6379" as redis_local
        component "Mailhog\n:8025" as mailhog
    }
}

node "Mobile Emulators" {
    [Android Emulator] as android_emu
    [iOS Simulator] as ios_sim
}

node "Desktop App" {
    [Desktop Application\n(Compose)] as desktop_app
}

cloud "External Services" {
    [GitHub] as github
    [Docker Hub] as dockerhub
}

' IDE connections
ide --> identity_local : Debug\nGradle bootRun
vscode --> biometric_local : Debug\nuvicorn
android_studio --> android_emu : Deploy APK

' Docker Compose
identity_local --> postgres_local : JDBC
identity_local --> redis_local : Redis Protocol
identity_local --> mailhog : SMTP
identity_local --> biometric_local : REST

' Mobile/Desktop connections
android_emu --> identity_local : HTTP (localhost)
ios_sim --> identity_local : HTTP (localhost)
desktop_app --> identity_local : HTTP (localhost)

' External services
ide --> github : Git push
docker_desktop --> dockerhub : Pull images

note right of mailhog
  **Development Email Testing:**
  - Captures all emails
  - Web UI at localhost:8025
  - No external email sending
end note

note bottom of docker_desktop
  **Docker Compose:**
  docker-compose.dev.yml
  - Hot reload enabled
  - Debug ports exposed
  - Volume mounts for code
end note

@enduml
```

### 7.3 Multi-Region Production Deployment

```plantuml
@startuml multi_region_deployment

skinparam componentStyle rectangle

cloud "US-East-1 (Primary)" {
    package "Production Stack" {
        [API Gateway US] as api_gw_us
        [Identity API Cluster (3 pods)] as identity_us
        [Biometric Processor Cluster (2 pods)] as bio_us
        database "PostgreSQL Primary" as db_us_primary
        database "PostgreSQL Read Replica" as db_us_replica
        database "Redis Cluster" as redis_us
    }

    [S3 Bucket US] as s3_us
    [CloudFront Distribution] as cloudfront_us
}

cloud "EU-West-1 (Secondary)" {
    package "EU Stack" {
        [API Gateway EU] as api_gw_eu
        [Identity API Cluster (2 pods)] as identity_eu
        [Biometric Processor Cluster (2 pods)] as bio_eu
        database "PostgreSQL Read Replica" as db_eu
        database "Redis Cluster" as redis_eu
    }

    [S3 Bucket EU] as s3_eu
    [CloudFront Distribution] as cloudfront_eu
}

cloud "AP-Southeast-1 (Tertiary)" {
    package "APAC Stack" {
        [API Gateway APAC] as api_gw_apac
        [Identity API Cluster (2 pods)] as identity_apac
        [Biometric Processor Cluster (2 pods)] as bio_apac
        database "PostgreSQL Read Replica" as db_apac
        database "Redis Cluster" as redis_apac
    }

    [S3 Bucket APAC] as s3_apac
}

[Route 53 Global DNS] as route53
[WAF (Web Application Firewall)] as waf

actor "US Users" as us_users
actor "EU Users" as eu_users
actor "APAC Users" as apac_users

' Traffic Routing
us_users --> route53 : DNS query
eu_users --> route53 : DNS query
apac_users --> route53 : DNS query

route53 --> waf : geolocation routing
waf --> api_gw_us : US traffic
waf --> api_gw_eu : EU traffic
waf --> api_gw_apac : APAC traffic

' US Region Flow
api_gw_us --> identity_us
identity_us --> bio_us
identity_us --> db_us_primary : write
identity_us --> db_us_replica : read
identity_us --> redis_us
bio_us --> s3_us : store images
cloudfront_us --> s3_us

' EU Region Flow
api_gw_eu --> identity_eu
identity_eu --> bio_eu
identity_eu --> db_eu : read
identity_eu --> redis_eu
bio_eu --> s3_eu : store images
cloudfront_eu --> s3_eu

' APAC Region Flow
api_gw_apac --> identity_apac
identity_apac --> bio_apac
identity_apac --> db_apac : read
identity_apac --> redis_apac
bio_apac --> s3_apac : store images

' Database Replication
db_us_primary ..> db_us_replica : streaming replication (sync)
db_us_primary ..> db_eu : logical replication (async)
db_us_primary ..> db_apac : logical replication (async)

' Cross-Region Data
s3_us ..> s3_eu : S3 Cross-Region Replication
s3_us ..> s3_apac : S3 Cross-Region Replication

note right of route53
  Routing Policy:
  - Geolocation routing for optimal latency
  - Health checks on all regions
  - Automatic failover to nearest healthy region
  - Latency-based routing as fallback
end note

note bottom of db_us_primary
  Write operations only in US-East-1
  All other regions read-only
  Replication lag typically <2 seconds
end note

@enduml
```

### 7.4 High Availability Deployment

```plantuml
@startuml ha_deployment

skinparam componentStyle rectangle

cloud "Region: US-East-1" {
    node "Availability Zone 1a" {
        [Load Balancer AZ-1a] as lb1
        [Identity API Pod 1] as api1
        [Biometric Processor Pod 1] as bio1
        database "PostgreSQL Primary" as db1
        database "Redis Primary" as redis1
    }

    node "Availability Zone 1b" {
        [Load Balancer AZ-1b] as lb2
        [Identity API Pod 2] as api2
        [Biometric Processor Pod 2] as bio2
        database "PostgreSQL Replica" as db2
        database "Redis Replica" as redis2
    }

    node "Availability Zone 1c" {
        [Load Balancer AZ-1c] as lb3
        [Identity API Pod 3] as api3
        [Biometric Processor Pod 3] as bio3
        database "PostgreSQL Replica" as db3
        database "Redis Replica" as redis3
    }

    [Global Load Balancer\n(Route 53)] as global_lb
}

cloud "Region: EU-West-1" {
    node "AZ eu-west-1a" {
        [Identity API Pod EU-1] as api_eu1
        database "PostgreSQL Replica EU" as db_eu1
    }

    node "AZ eu-west-1b" {
        [Identity API Pod EU-2] as api_eu2
        database "PostgreSQL Replica EU-2" as db_eu2
    }
}

cloud "Monitoring & Backup" {
    [CloudWatch] as cloudwatch
    [S3 Backup Storage] as s3_backup
    [RDS Snapshots] as rds_snapshots
}

actor "Users" as users

' Traffic Flow
users --> global_lb : HTTPS
global_lb --> lb1 : primary region
global_lb ..> api_eu1 : failover to EU

lb1 --> api1
lb2 --> api2
lb3 --> api3

api1 --> bio1 : REST
api2 --> bio2 : REST
api3 --> bio3 : REST

api1 --> db1 : write
api2 --> db1 : write
api3 --> db1 : write

api1 --> db2 : read
api2 --> db2 : read
api3 --> db3 : read

api1 --> redis1 : cache
api2 --> redis1 : cache
api3 --> redis1 : cache

db1 ..> db2 : replication
db1 ..> db3 : replication
db1 ..> db_eu1 : cross-region replication
db1 ..> db_eu2 : cross-region replication

redis1 ..> redis2 : replication
redis1 ..> redis3 : replication

db1 --> rds_snapshots : automated backups
db1 --> s3_backup : continuous archival

api1 --> cloudwatch : logs/metrics
api2 --> cloudwatch : logs/metrics
api3 --> cloudwatch : logs/metrics

api_eu1 --> db_eu1 : read
api_eu2 --> db_eu2 : read

note right of global_lb
  Route 53 Health Checks:
  - Primary: US-East-1
  - Failover: EU-West-1
  - Latency-based routing
end note

note right of db1
  PostgreSQL Configuration:
  - Synchronous replication to AZ-1b
  - Async replication to AZ-1c
  - Cross-region async to EU
  - RPO: <5 minutes
  - RTO: <10 minutes
end note

@enduml
```

---

## 8. Use Case Diagrams

### 8.1 End User Use Cases

```plantuml
@startuml end_user_use_cases

left to right direction

actor "End User" as user
actor "Mobile App" as mobile
actor "Desktop Kiosk" as kiosk

rectangle "FIVUCSAS Platform" {

    rectangle "Authentication" {
        usecase "Register Account" as UC1
        usecase "Login with Password" as UC2
        usecase "Login with Face" as UC3
        usecase "Reset Password" as UC4
        usecase "Logout" as UC5
        usecase "Verify Email" as UC6
    }

    rectangle "Biometric Management" {
        usecase "Enroll Face" as UC7
        usecase "Complete Liveness Check" as UC8
        usecase "View Biometric Status" as UC9
        usecase "Re-enroll Face" as UC10
        usecase "Delete Biometric" as UC11
    }

    rectangle "Profile Management" {
        usecase "View Profile" as UC12
        usecase "Update Profile" as UC13
        usecase "Change Password" as UC14
        usecase "Upload Profile Photo" as UC15
        usecase "Manage Preferences" as UC16
    }

    rectangle "Verification" {
        usecase "Verify Identity\nat Door" as UC17
        usecase "Verify for Login" as UC18
        usecase "View Verification\nHistory" as UC19
    }

    rectangle "Notifications" {
        usecase "Receive Email\nNotifications" as UC20
        usecase "Receive Push\nNotifications" as UC21
        usecase "Configure\nNotification Prefs" as UC22
    }
}

' User to Authentication
user --> UC1
user --> UC2
user --> UC3
user --> UC4
user --> UC5
user --> UC6

' User to Biometric
user --> UC7
user --> UC8
user --> UC9
user --> UC10
user --> UC11

' User to Profile
user --> UC12
user --> UC13
user --> UC14
user --> UC15
user --> UC16

' User to Verification
user --> UC17 : via kiosk
user --> UC18 : via mobile
user --> UC19

' Notifications
user <-- UC20
user <-- UC21
user --> UC22

' Include relationships
UC1 ..> UC6 : <<include>>
UC2 ..> UC5 : <<include>>
UC3 ..> UC5 : <<include>>
UC7 ..> UC8 : <<include>>
UC17 ..> UC8 : <<include>>

' Extend relationships
UC3 ..> UC17 : <<extend>>
UC10 ..> UC7 : <<extend>>

note right of UC8
  **Liveness Check:**
  Required for all
  face-based authentication
  to prevent spoofing attacks
end note

note bottom of UC17
  **Physical Access:**
  Used at building entry,
  office doors, restricted areas
end note

@enduml
```

### 8.2 Tenant Admin Use Cases

```plantuml
@startuml tenant_admin_use_cases

left to right direction

actor "Tenant Admin" as admin
actor "System" as system

rectangle "FIVUCSAS Platform" {

    rectangle "User Management" {
        usecase "Create User" as UC1
        usecase "View All Users" as UC2
        usecase "Search Users" as UC3
        usecase "Update User" as UC4
        usecase "Deactivate User" as UC5
        usecase "Reactivate User" as UC6
        usecase "Delete User" as UC7
        usecase "Reset User Password" as UC8
        usecase "Unlock User Account" as UC9
    }

    rectangle "Role Management" {
        usecase "Create Role" as UC10
        usecase "Assign Role to User" as UC11
        usecase "Remove Role from User" as UC12
        usecase "Update Role Permissions" as UC13
        usecase "View Role Hierarchy" as UC14
    }

    rectangle "Biometric Management" {
        usecase "View User Biometrics" as UC15
        usecase "Force Biometric\nRe-enrollment" as UC16
        usecase "Delete User Biometric" as UC17
        usecase "View Biometric\nQuality Reports" as UC18
    }

    rectangle "Monitoring & Reports" {
        usecase "View Dashboard" as UC19
        usecase "Generate User Report" as UC20
        usecase "View Verification Logs" as UC21
        usecase "Export Audit Logs" as UC22
        usecase "View System Statistics" as UC23
        usecase "Monitor Active Sessions" as UC24
    }

    rectangle "Configuration" {
        usecase "Update Tenant Settings" as UC25
        usecase "Configure Security Policies" as UC26
        usecase "Manage API Keys" as UC27
        usecase "Configure Notifications" as UC28
        usecase "Set Verification Thresholds" as UC29
    }

    rectangle "Compliance" {
        usecase "Download GDPR\nData Export" as UC30
        usecase "Process Data\nDeletion Request" as UC31
        usecase "View Consent Records" as UC32
    }
}

' Admin to User Management
admin --> UC1
admin --> UC2
admin --> UC3
admin --> UC4
admin --> UC5
admin --> UC6
admin --> UC7
admin --> UC8
admin --> UC9

' Admin to Role Management
admin --> UC10
admin --> UC11
admin --> UC12
admin --> UC13
admin --> UC14

' Admin to Biometric Management
admin --> UC15
admin --> UC16
admin --> UC17
admin --> UC18

' Admin to Monitoring
admin --> UC19
admin --> UC20
admin --> UC21
admin --> UC22
admin --> UC23
admin --> UC24

' Admin to Configuration
admin --> UC25
admin --> UC26
admin --> UC27
admin --> UC28
admin --> UC29

' Admin to Compliance
admin --> UC30
admin --> UC31
admin --> UC32

' System actor
UC1 ..> UC8 : <<include>>
system --> UC24 : auto-cleanup
system --> UC21 : auto-log

' Include relationships
UC2 ..> UC3 : <<extend>>
UC4 ..> UC11 : <<include>>
UC20 ..> UC21 : <<include>>

note right of UC26
  **Security Policies:**
  - Password requirements
  - Lockout thresholds
  - Session timeout
  - MFA enforcement
  - Verification strictness
end note

note bottom of UC30
  **GDPR Compliance:**
  Admin can export all user
  data upon request.
  Must complete within 30 days.
end note

@enduml
```

### 8.3 System Admin Use Cases

```plantuml
@startuml system_admin_use_cases

left to right direction

actor "System Admin" as sysadmin
actor "DevOps" as devops

rectangle "FIVUCSAS Platform" {

    rectangle "Tenant Management" {
        usecase "Create Tenant" as UC1
        usecase "View All Tenants" as UC2
        usecase "Update Tenant Plan" as UC3
        usecase "Suspend Tenant" as UC4
        usecase "Activate Tenant" as UC5
        usecase "Delete Tenant" as UC6
        usecase "Manage Tenant Quotas" as UC7
    }

    rectangle "System Configuration" {
        usecase "Configure Global\nSecurity Settings" as UC8
        usecase "Manage Feature Flags" as UC9
        usecase "Update System\nParameters" as UC10
        usecase "Configure Rate Limits" as UC11
    }

    rectangle "Monitoring & Diagnostics" {
        usecase "View System Health" as UC12
        usecase "Monitor Service Metrics" as UC13
        usecase "View Error Logs" as UC14
        usecase "Analyze Performance" as UC15
        usecase "View Distributed Traces" as UC16
        usecase "Check Database Status" as UC17
    }

    rectangle "User Support" {
        usecase "Search Across Tenants" as UC18
        usecase "Unlock Any Account" as UC19
        usecase "Reset MFA" as UC20
        usecase "Investigate Security\nIncident" as UC21
        usecase "View User Activity" as UC22
    }

    rectangle "System Maintenance" {
        usecase "Run Database Migration" as UC23
        usecase "Clear Cache" as UC24
        usecase "Restart Services" as UC25
        usecase "Trigger Manual Backup" as UC26
        usecase "Cleanup Old Sessions" as UC27
    }

    rectangle "Model Management" {
        usecase "Update Biometric Models" as UC28
        usecase "Configure Model\nParameters" as UC29
        usecase "A/B Test Models" as UC30
        usecase "View Model Performance" as UC31
    }

    rectangle "Security & Compliance" {
        usecase "Review Audit Logs" as UC32
        usecase "Manage Admin Accounts" as UC33
        usecase "Configure IP Whitelist" as UC34
        usecase "Manage SSL Certificates" as UC35
        usecase "Review Security Alerts" as UC36
    }
}

' System Admin connections
sysadmin --> UC1
sysadmin --> UC2
sysadmin --> UC3
sysadmin --> UC4
sysadmin --> UC5
sysadmin --> UC6
sysadmin --> UC7
sysadmin --> UC8
sysadmin --> UC9
sysadmin --> UC10
sysadmin --> UC11
sysadmin --> UC12
sysadmin --> UC13
sysadmin --> UC14
sysadmin --> UC18
sysadmin --> UC19
sysadmin --> UC20
sysadmin --> UC21
sysadmin --> UC22
sysadmin --> UC28
sysadmin --> UC29
sysadmin --> UC30
sysadmin --> UC31
sysadmin --> UC32
sysadmin --> UC33
sysadmin --> UC34
sysadmin --> UC35
sysadmin --> UC36

' DevOps connections
devops --> UC12
devops --> UC13
devops --> UC14
devops --> UC15
devops --> UC16
devops --> UC17
devops --> UC23
devops --> UC24
devops --> UC25
devops --> UC26
devops --> UC27

' Include/Extend relationships
UC4 ..> UC6 : <<extend>>
UC3 ..> UC7 : <<include>>
UC21 ..> UC22 : <<include>>
UC21 ..> UC32 : <<include>>

note right of UC1
  **Tenant Creation:**
  - Provision isolated schema
  - Create admin account
  - Set initial quotas
  - Generate API credentials
end note

note bottom of UC23
  **Database Migrations:**
  Zero-downtime migrations
  using Flyway or Liquibase
  Automatic rollback on failure
end note

note right of UC30
  **A/B Testing:**
  Compare VGG-Face vs ArcFace
  Measure accuracy & performance
  Gradual rollout strategy
end note

@enduml
```

### 8.4 External System Integration Use Cases

```plantuml
@startuml external_system_use_cases

left to right direction

actor "Door Controller" as door
actor "HR System" as hr
actor "Mobile App" as mobile
actor "Third-Party App" as thirdparty

rectangle "FIVUCSAS Platform API" {

    rectangle "Public API" {
        usecase "Authenticate via API Key" as UC1
        usecase "Get API Documentation" as UC2
        usecase "Check API Health" as UC3
    }

    rectangle "User Management API" {
        usecase "Create User via API" as UC4
        usecase "Sync User Data" as UC5
        usecase "Bulk Import Users" as UC6
        usecase "Get User Details" as UC7
        usecase "Update User via API" as UC8
    }

    rectangle "Biometric API" {
        usecase "Enroll Face via API" as UC9
        usecase "Verify Face via API" as UC10
        usecase "Check Enrollment\nStatus" as UC11
    }

    rectangle "Verification API" {
        usecase "Request Door Access" as UC12
        usecase "Verify at Kiosk" as UC13
        usecase "Authenticate User" as UC14
        usecase "Get Verification Result" as UC15
    }

    rectangle "Webhook API" {
        usecase "Register Webhook" as UC16
        usecase "Receive User Created\nEvent" as UC17
        usecase "Receive Verification\nEvent" as UC18
        usecase "Receive Enrollment\nEvent" as UC19
    }

    rectangle "Analytics API" {
        usecase "Get Tenant Statistics" as UC20
        usecase "Get Verification Metrics" as UC21
        usecase "Export Audit Logs" as UC22
    }
}

' Door Controller use cases
door --> UC1
door --> UC12
door --> UC15

' HR System use cases
hr --> UC1
hr --> UC4
hr --> UC5
hr --> UC6
hr --> UC7
hr --> UC8
hr --> UC16

' Mobile App use cases
mobile --> UC1
mobile --> UC9
mobile --> UC10
mobile --> UC14

' Third-party App use cases
thirdparty --> UC1
thirdparty --> UC2
thirdparty --> UC3
thirdparty --> UC7
thirdparty --> UC11
thirdparty --> UC20
thirdparty --> UC21
thirdparty --> UC22

' Webhook subscriptions
hr <-- UC17
hr <-- UC18
hr <-- UC19
thirdparty <-- UC17

' Include relationships
UC4 ..> UC1 : <<include>>
UC5 ..> UC1 : <<include>>
UC9 ..> UC1 : <<include>>
UC10 ..> UC1 : <<include>>
UC12 ..> UC10 : <<include>>

note right of UC1
  **API Key Auth:**
  - Bearer token authentication
  - Rate limiting per key
  - Scope-based permissions
  - Usage tracking
end note

note bottom of UC12
  **Door Access Flow:**
  1. Capture face at kiosk
  2. Call verify API
  3. Check result
  4. Grant/deny access
  Response time: <2 seconds
end note

note right of UC16
  **Webhook System:**
  - HTTP POST to endpoint
  - Retry on failure (3x)
  - HMAC signature verification
  - Event types: user.*, verification.*
end note

@enduml
```

---

## 9. Additional Diagrams

### 9.1 Data Flow Diagram - Face Verification

```plantuml
@startuml data_flow_verification

!define RECTANGLE class

skinparam component {
    BackgroundColor<<external>> LightBlue
    BackgroundColor<<process>> LightGreen
    BackgroundColor<<datastore>> LightYellow
}

RECTANGLE "User" as user <<external>>
RECTANGLE "Mobile App" as app <<external>>
RECTANGLE "API Gateway" as gateway <<process>>
RECTANGLE "Identity API" as identity <<process>>
RECTANGLE "Biometric Processor" as biometric <<process>>
RECTANGLE "Database" as db <<datastore>>
RECTANGLE "Redis" as redis <<datastore>>

user -> app : 1.0 User face image
app -> gateway : 2.0 Verification request\n+ image bytes
gateway -> identity : 3.0 Authenticated request
identity -> redis : 4.0 Check rate limit
redis --> identity : 4.1 Limit status
identity -> db : 5.0 Query stored embedding
db --> identity : 5.1 Embedding vector (512-D)
identity -> biometric : 6.0 Image + stored embedding
biometric -> biometric : 7.0 Extract new embedding
biometric -> biometric : 8.0 Calculate distance
biometric --> identity : 9.0 Verification result\n{verified, confidence}
identity -> db : 10.0 Log verification attempt
identity -> redis : 11.0 Publish event
identity --> gateway : 12.0 Response DTO
gateway --> app : 13.0 JSON response
app --> user : 14.0 Display result

note right of biometric
  **Processing:**
  - Face detection
  - Embedding extraction (VGG-Face)
  - Cosine similarity calculation
  - Threshold comparison (0.30)
end note

note bottom of db
  **Data Stored:**
  - User metadata
  - Biometric embeddings (encrypted)
  - Verification logs
  - Audit trail
end note

@enduml
```

### 9.2 Network Architecture Diagram

```plantuml
@startuml network_architecture

skinparam componentStyle rectangle

package "VPC (10.0.0.0/16)" {

    package "Public Subnets (10.0.1.0/24, 10.0.2.0/24)" {
        [Internet Gateway] as igw
        [NAT Gateway AZ-1] as nat1
        [NAT Gateway AZ-2] as nat2
        [Application Load Balancer] as alb

        [Bastion Host] as bastion
    }

    package "Private App Subnet AZ-1 (10.0.10.0/24)" {
        [Identity API Pod 1] as api1
        [Identity API Pod 2] as api2
        [Biometric Processor Pod 1] as bio1
    }

    package "Private App Subnet AZ-2 (10.0.11.0/24)" {
        [Identity API Pod 3] as api3
        [Identity API Pod 4] as api4
        [Biometric Processor Pod 2] as bio2
    }

    package "Private Data Subnet AZ-1 (10.0.20.0/24)" {
        database "PostgreSQL Primary" as db1
        database "Redis Master" as redis1
    }

    package "Private Data Subnet AZ-2 (10.0.21.0/24)" {
        database "PostgreSQL Replica" as db2
        database "Redis Replica" as redis2
    }

    package "Security Groups" {
        [ALB Security Group\nAllow: 80, 443 from 0.0.0.0/0] as sg_alb
        [App Security Group\nAllow: 8080 from ALB SG] as sg_app
        [DB Security Group\nAllow: 5432 from App SG] as sg_db
        [Redis Security Group\nAllow: 6379 from App SG] as sg_redis
        [Bastion Security Group\nAllow: 22 from Corp IP] as sg_bastion
    }

    [VPC Flow Logs] as flow_logs
    [Network ACL] as nacl
}

cloud "Internet" {
    actor "Users" as users
}

cloud "AWS Services" {
    [S3 (via VPC Endpoint)] as s3
    [CloudWatch (via VPC Endpoint)] as cloudwatch
}

' Traffic Flow
users --> igw : HTTPS (443)
igw --> alb : forwards
alb --> api1 : HTTP (8080)
alb --> api2 : HTTP (8080)
alb --> api3 : HTTP (8080)
alb --> api4 : HTTP (8080)

api1 --> nat1 : outbound internet
api2 --> nat1 : outbound internet
api3 --> nat2 : outbound internet
api4 --> nat2 : outbound internet

api1 --> bio1 : HTTP (8001)
api2 --> bio1 : HTTP (8001)
api3 --> bio2 : HTTP (8001)
api4 --> bio2 : HTTP (8001)

api1 --> db1 : PostgreSQL (5432)
api2 --> db1 : PostgreSQL (5432)
api3 --> db1 : PostgreSQL (5432)
api4 --> db1 : PostgreSQL (5432)

api1 --> redis1 : Redis (6379)
api2 --> redis1 : Redis (6379)
api3 --> redis1 : Redis (6379)
api4 --> redis1 : Redis (6379)

db1 ..> db2 : replication (5432)
redis1 ..> redis2 : replication (6379)

api1 --> s3 : store files
api2 --> s3 : store files
api3 --> s3 : store files
api4 --> s3 : store files

api1 --> cloudwatch : logs/metrics
api2 --> cloudwatch : logs/metrics

bastion --> api1 : SSH debugging
bastion --> db1 : psql client

alb -[hidden]-> sg_alb
api1 -[hidden]-> sg_app
db1 -[hidden]-> sg_db

note right of sg_alb
  Security Group Rules:

  ALB SG:
  Inbound: 443 (0.0.0.0/0)
  Outbound: 8080 (App SG)

  App SG:
  Inbound: 8080 (ALB SG), 22 (Bastion SG)
  Outbound: 5432 (DB SG), 6379 (Redis SG), 443 (0.0.0.0/0)

  DB SG:
  Inbound: 5432 (App SG), 5432 (Bastion SG)
  Outbound: None

  Redis SG:
  Inbound: 6379 (App SG)
  Outbound: None
end note

note left of flow_logs
  Monitoring & Compliance:
  - VPC Flow Logs to S3
  - CloudWatch Logs
  - GuardDuty threat detection
  - AWS Config compliance
  - Network ACLs for subnet isolation
end note

@enduml
```

### 9.3 Security Architecture Diagram

```plantuml
@startuml security_architecture

skinparam componentStyle rectangle

rectangle "Layer 1: Perimeter Security" {
    [WAF (Web Application Firewall)] as waf
    [DDoS Protection\n(AWS Shield)] as shield
    [Rate Limiting] as rate_limit
}

rectangle "Layer 2: Network Security" {
    [VPC] as vpc
    [Security Groups] as security_groups
    [Network ACLs] as nacl
    [Private Subnets] as private_subnet
    [VPC Flow Logs] as flow_logs
}

rectangle "Layer 3: Application Security" {
    [API Gateway\n(NGINX)] as api_gateway
    [JWT Validation] as jwt
    [CORS Policy] as cors
    [Input Validation] as input_validation
    [HTTPS/TLS 1.3] as tls
}

rectangle "Layer 4: Authentication & Authorization" {
    [Spring Security] as spring_security
    [Password Hashing\n(BCrypt)] as bcrypt
    [JWT Service\n(HS512)] as jwt_service
    [Multi-Factor Auth] as mfa
    [Role-Based Access Control] as rbac
    [Permission System] as permissions
}

rectangle "Layer 5: Data Security" {
    [Encryption at Rest\n(AES-256)] as encryption_rest
    [Encryption in Transit\n(TLS 1.3)] as encryption_transit
    [Database RLS\n(Row-Level Security)] as rls
    [Multi-Tenancy Isolation] as multi_tenancy
    [Data Masking] as masking
    [Audit Logging] as audit
}

rectangle "Layer 6: Secrets Management" {
    [AWS Secrets Manager] as secrets_manager
    [Environment Variables] as env_vars
    [Vault Integration] as vault
}

rectangle "Layer 7: Monitoring & Compliance" {
    [CloudWatch Alarms] as alarms
    [Security Audit Logs] as security_logs
    [Intrusion Detection\n(GuardDuty)] as ids
    [Compliance Reports\n(KVKK/GDPR)] as compliance
    [Vulnerability Scanning] as vuln_scan
}

actor "Attacker" as attacker
actor "Legitimate User" as user

' Attack Flow (Blocked)
attacker --> shield : DDoS Attack
shield -[#red]-> waf : BLOCKED
attacker --> waf : SQL Injection
waf -[#red]-> attacker : BLOCKED
attacker --> rate_limit : Brute Force
rate_limit -[#red]-> attacker : BLOCKED

' Legitimate Flow
user --> shield : Normal Request
shield --> waf : Allowed
waf --> rate_limit : Pass WAF Rules
rate_limit --> api_gateway : Within Limits

api_gateway --> tls : HTTPS Only
tls --> jwt : Decrypt
jwt --> spring_security : Validate Token
spring_security --> rbac : Check Roles
rbac --> permissions : Check Permissions

api_gateway --> input_validation : Sanitize Input
input_validation --> spring_security

spring_security --> encryption_transit : Access DB
encryption_transit --> rls : Row Filtering
rls --> encryption_rest : Read Data
encryption_rest --> masking : Sensitive Fields
masking --> audit : Log Access

spring_security --> secrets_manager : Get DB Credentials
jwt_service --> secrets_manager : Get JWT Secret

security_groups --> private_subnet : Isolate Resources
nacl --> flow_logs : Log Traffic
flow_logs --> security_logs : Centralize

alarms --> security_logs : Monitor
ids --> security_logs : Detect Threats
vuln_scan --> compliance : Automated Scans

note right of waf
  WAF Rules:
  - Block SQL Injection
  - Block XSS
  - Block common exploits
  - Rate limiting per IP
  - Geo-blocking (optional)
  - Bot detection
end note

note right of spring_security
  Authentication Flow:
  1. User submits credentials
  2. BCrypt verifies password
  3. JWT token generated (HS512)
  4. MFA challenge (if enabled)
  5. Roles & permissions loaded
  6. Access granted
end note

note right of encryption_rest
  Data Encryption:
  - Database: AES-256 at rest
  - Biometric embeddings: Encrypted column
  - Backups: Encrypted with KMS
  - File storage: S3 encryption
end note

note right of multi_tenancy
  Tenant Isolation:
  - Separate schemas per tenant
  - Row-Level Security (RLS)
  - Tenant ID in JWT
  - No cross-tenant queries
  - Audit all tenant access
end note

note bottom of compliance
  Compliance Features:
  - KVKK (Turkish GDPR)
  - GDPR (EU)
  - Data retention policies
  - Right to be forgotten
  - Consent management
  - Audit trail (7 years)
  - Encrypted PII
end note

@enduml
```

---

## 10. Summary & Usage Guide

### Diagram Categories

1. **Entity-Relationship Diagrams** - Database schema visualization
2. **Class Diagrams** - Object-oriented design and relationships
3. **Sequence Diagrams** - Interaction flows over time
4. **State Machine Diagrams** - Lifecycle and transitions
5. **Activity Diagrams** - Business process flows
6. **Component Diagrams** - System structure and dependencies
7. **Deployment Diagrams** - Infrastructure and deployment
8. **Use Case Diagrams** - Functional requirements
9. **Data Flow Diagrams** - Information flow
10. **Network/Security Diagrams** - Infrastructure and security

### How to Generate Diagrams

**Option 1: Online PlantUML Editor**
```
1. Visit: http://www.plantuml.com/plantuml/uml/
2. Copy diagram code
3. Paste into editor
4. View or download PNG/SVG
```

**Option 2: VS Code Extension**
```
1. Install "PlantUML" extension by jebbs
2. Create .puml file
3. Copy diagram code
4. Press Alt+D to preview
5. Right-click → Export to PNG/SVG
```

**Option 3: IntelliJ IDEA Plugin**
```
1. Install "PlantUML integration" plugin
2. Create .puml file
3. Copy diagram code
4. View in tool window
5. Export as needed
```

**Option 4: Command Line**
```bash
# Install PlantUML
brew install plantuml  # macOS
sudo apt install plantuml  # Ubuntu

# Generate diagram
plantuml diagram.puml

# Generate all diagrams in folder
plantuml *.puml
```

### Best Practices

1. **Update diagrams when architecture changes**
2. **Version control diagrams with code**
3. **Include diagrams in pull requests**
4. **Use diagrams in documentation**
5. **Review diagrams in architecture meetings**

---

**Total Diagrams in Collection: 30+**

All diagrams are ready for generation using PlantUML!
