# FIVUCSAS - Fixed PlantUML Diagrams

**Purpose:** Fixed versions of diagrams that failed to generate due to C4-PlantUML dependencies or syntax issues

**Date:** November 4, 2025

---

## 1. Complete Database ER Diagram (Fixed)

```plantuml
@startuml fivucsas_er_diagram_fixed

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

---

## 2. System-Wide Components (Fixed - No C4)

```plantuml
@startuml system_components_fixed

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

---

## 3. Kubernetes Deployment (Fixed - Standard Deployment Diagram)

```plantuml
@startuml kubernetes_deployment_fixed

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

---

## 4. High Availability Deployment (Fixed)

```plantuml
@startuml ha_deployment_fixed

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

## 5. Multi-Region Deployment (Fixed)

```plantuml
@startuml multi_region_deployment_fixed

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

---

## 6. Network Architecture (Fixed)

```plantuml
@startuml network_architecture_fixed

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

---

## 7. Security Architecture (Fixed)

```plantuml
@startuml security_architecture_fixed

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

## How to Generate These Fixed Diagrams

### Method 1: PlantUML Online Editor
1. Visit: http://www.plantuml.com/plantuml/uml/
2. Copy the content between `@startuml` and `@enduml`
3. Paste into the editor
4. The diagram will render automatically
5. Download as PNG or SVG

### Method 2: VS Code with PlantUML Extension
1. Install "PlantUML" extension by jebbs
2. Open this markdown file
3. Right-click on a code block
4. Select "Preview Current Diagram"
5. Export via right-click → "Export Current Diagram"

### Method 3: Command Line (with Java and Graphviz)
```bash
# Install PlantUML
brew install plantuml   # macOS
# OR
apt-get install plantuml   # Ubuntu

# Generate diagram
plantuml diagram.puml -o output/

# Generate all diagrams in a file
plantuml -tpng PLANTUML_DIAGRAMS_FIXED.md
```

### Method 4: IntelliJ IDEA
1. Install "PlantUML integration" plugin
2. Open this file
3. Click the PlantUML icon in the gutter
4. Export via toolbar

---

## Differences from Original Diagrams

### What Was Fixed:

1. **Removed C4-PlantUML dependencies** (`!include <C4/C4_Component>`)
   - Replaced with standard PlantUML component syntax
   - Works with vanilla PlantUML installations

2. **Fixed deployment diagram syntax**
   - Replaced C4 deployment elements with standard `node`, `component`, `database`
   - More compatible with various PlantUML renderers

3. **Simplified ER diagram**
   - Changed from custom macros to standard `entity` syntax
   - Better compatibility across PlantUML versions

4. **Removed deployment-specific C4 elements**
   - `Container_Boundary` → `package`
   - `Component` → `[Component Name]`
   - `ContainerDb` → `database`

5. **Fixed network and security diagrams**
   - Used standard PlantUML `rectangle`, `package`, `component`
   - No external dependencies required

---

## Summary

**Fixed Diagrams:** 7 diagrams
- Complete Database ER Diagram
- System-Wide Components
- Kubernetes Deployment
- High Availability Deployment
- Multi-Region Deployment
- Network Architecture
- Security Architecture

**Compatibility:** Standard PlantUML (no C4 library required)

**Status:** ✅ Ready to generate with any PlantUML installation

---

**Note:** These fixed diagrams provide the same information as the original diagrams but use standard PlantUML syntax for maximum compatibility.
