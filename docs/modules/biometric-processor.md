# Biometric Processor - Module Implementation Plan

**Module Name**: biometric-processor
**Repository**: https://github.com/Rollingcat-Software/biometric-processor
**Technology**: Python 3.10+ / FastAPI
**Purpose**: AI/ML microservice for face recognition and liveness detection
**Status**: ❌ NOT STARTED - Full Implementation Required
**Priority**: 🟡 MEDIUM - Can develop in parallel after basic integration

---

## 📋 Table of Contents

1. [Module Overview](#module-overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [ML Models & Algorithms](#ml-models--algorithms)
5. [API Endpoints](#api-endpoints)
6. [Implementation Tasks](#implementation-tasks)
7. [Testing Requirements](#testing-requirements)
8. [Deployment](#deployment)
9. [Integration Points](#integration-points)

---

## 🎯 Module Overview

### Purpose
The Biometric Processor is the core AI/ML service responsible for:
- Face detection and quality assessment
- **Active liveness detection** (KEY INNOVATION - Biometric puzzle)
- Face encoding/embedding generation
- Face matching (1:1 verification and 1:N identification)
- Async job processing for enrollments and verifications
- Integration with identity-core-api via webhooks

### Key Innovation: Active Liveness Detection
Unlike passive liveness (analyzing single photo), FIVUCSAS uses **active liveness**:
1. Generate random challenge: "Smile", "Blink", "Turn left", "Turn right"
2. Capture video stream during challenge
3. Verify user performed correct action in real-time
4. Calculate liveness score (0-100)
5. Prevent spoofing attacks (photos, videos, deepfakes)

### Key Responsibilities
1. **Face Detection**: Detect faces in images/video frames
2. **Quality Assessment**: Evaluate image quality (lighting, blur, angle)
3. **Liveness Detection**: Active challenge-response verification
4. **Face Encoding**: Generate 128-D or 512-D embeddings
5. **Face Matching**: Compare embeddings for verification/identification
6. **Job Processing**: Async processing queue for long-running tasks
7. **Storage**: Store biometric templates securely (encrypted)

---

## 📊 Current Status

### ❌ Not Implemented (From Scratch)

This is a **completely new implementation**. The repository may have placeholder files, but no functional ML models or endpoints exist.

#### What Needs to Be Built

1. **Project Setup**
   - Python project structure
   - FastAPI application
   - Docker containerization
   - Dependencies (TensorFlow/PyTorch, OpenCV, etc.)

2. **Face Detection Pipeline**
   - Face detection model integration (MTCNN, Haar Cascade, or YOLO)
   - Face alignment and normalization
   - Multi-face handling

3. **Liveness Detection**
   - Challenge generation engine
   - Video frame analysis
   - Action verification (smile detection, eye blink, head movement)
   - Liveness score calculation
   - Anti-spoofing algorithms

4. **Face Recognition**
   - Face embedding model (FaceNet, ArcFace, or similar)
   - Embedding storage (pgvector)
   - Similarity matching algorithm
   - Threshold configuration

5. **API Layer**
   - RESTful endpoints
   - WebSocket for real-time liveness challenges
   - Job status tracking
   - Webhook callbacks to identity-core-api

6. **Background Processing**
   - Celery or RQ for job queue
   - Redis for task broker
   - Worker processes for parallel processing

7. **Storage & Caching**
   - Redis for temporary data and job status
   - PostgreSQL for biometric templates
   - S3 or local storage for images (temporary)

---

## 🏗️ Architecture

### Technology Stack
```yaml
Framework: FastAPI (Python 3.10+)
ML Libraries:
  - TensorFlow 2.x or PyTorch 2.x
  - OpenCV 4.x (image processing)
  - face_recognition (simple option) or FaceNet/ArcFace (advanced)
  - MediaPipe (alternative for face detection)
Task Queue: Celery + Redis
Database: PostgreSQL 16 with pgvector extension
Cache: Redis 7
Object Storage: MinIO or AWS S3 (for temporary images)
Deployment: Docker + Kubernetes
```

### System Architecture
```
┌─────────────────────────────────────────────────────┐
│           Biometric Processor Service               │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────────────┐      ┌────────────────────┐   │
│  │  FastAPI App    │      │  Celery Workers    │   │
│  │  (REST API)     │      │  (Background Jobs) │   │
│  └────────┬────────┘      └────────┬───────────┘   │
│           │                        │               │
│           ▼                        ▼               │
│  ┌─────────────────┐      ┌────────────────────┐   │
│  │  ML Models      │      │  Redis Queue       │   │
│  │  - Face Detect  │      │  (Job Broker)      │   │
│  │  - Liveness     │      └────────────────────┘   │
│  │  - FaceNet      │                               │
│  └─────────────────┘                               │
│           │                                         │
│           ▼                                         │
│  ┌─────────────────┐      ┌────────────────────┐   │
│  │  PostgreSQL     │      │  MinIO/S3          │   │
│  │  (pgvector)     │      │  (Image Storage)   │   │
│  └─────────────────┘      └────────────────────┘   │
│                                                      │
│  External Integration:                              │
│  ┌─────────────────────────────────────────┐       │
│  │  Webhook → identity-core-api            │       │
│  │  POST /api/v1/biometric/callback        │       │
│  └─────────────────────────────────────────┘       │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Processing Flow

#### Enrollment Flow
```
1. Client → POST /enroll
   - Submit photo + user info

2. FastAPI → Create job → Redis queue

3. Celery Worker:
   a. Detect face in image
   b. Assess quality (blur, lighting, angle)
   c. Perform liveness detection (if video provided)
   d. Generate face embedding (128-D or 512-D vector)
   e. Store embedding in PostgreSQL (pgvector)
   f. Update job status: COMPLETED or FAILED

4. Worker → Webhook callback to identity-core-api
   POST /api/v1/biometric/callback
   { jobId, status, quality, liveness, error }
```

#### Verification Flow
```
1. Client → POST /verify
   - Submit photo + userId

2. FastAPI → Immediate processing (real-time)

3. Processing:
   a. Detect face
   b. Generate embedding
   c. Retrieve stored embedding from DB
   d. Calculate similarity (cosine similarity)
   e. Compare against threshold (e.g., 0.6)
   f. Return: MATCH or NO_MATCH + confidence score
```

#### Liveness Detection Flow
```
1. Client → WebSocket /liveness

2. Server → Generate random challenge
   - Challenge: "Please smile"

3. Client → Stream video frames

4. Server → Analyze frames in real-time
   - Detect smile using facial landmarks
   - Calculate liveness score
   - Detect spoofing attempts

5. Server → Return result
   - Liveness score: 0-100
   - Status: LIVE or SPOOF
```

---

## 🤖 ML Models & Algorithms

### 1. Face Detection
**Options**:
- **MTCNN** (Multi-task Cascaded CNN) - Fast and accurate
- **Haar Cascade** - Simple but less accurate
- **MediaPipe Face Detection** - Google's solution, very fast
- **YOLO Face** - Real-time detection

**Recommended**: MTCNN or MediaPipe

**Output**: Bounding box coordinates, facial landmarks

---

### 2. Face Quality Assessment
**Metrics**:
- **Blur Detection**: Laplacian variance
- **Lighting**: Mean brightness, contrast
- **Face Angle**: Pitch, yaw, roll (using facial landmarks)
- **Face Size**: Pixel dimensions
- **Occlusion**: Detect sunglasses, masks

**Quality Score**: 0-100
- 0-40: Poor (reject)
- 41-70: Fair (warn user)
- 71-100: Good (accept)

---

### 3. Active Liveness Detection
**Challenges**:
1. **Smile Detection**
   - Use facial landmarks (mouth corners)
   - Detect upward movement
   - Threshold: Mouth aspect ratio > 0.5

2. **Eye Blink Detection**
   - Eye aspect ratio (EAR)
   - Detect closure and reopening
   - Threshold: EAR < 0.2 for 2-3 frames

3. **Head Movement**
   - Detect pitch (up/down)
   - Detect yaw (left/right)
   - Measure angle change

**Anti-Spoofing**:
- Texture analysis (detect print patterns)
- Depth analysis (monocular depth estimation)
- Micro-movement detection
- Challenge randomization

**Liveness Score**: 0-100
- 0-50: Likely spoof
- 51-80: Uncertain
- 81-100: Live person

---

### 4. Face Embedding Generation
**Options**:
- **FaceNet** (Google) - 128-D embeddings, proven accuracy
- **ArcFace** (InsightFace) - 512-D embeddings, state-of-the-art
- **VGGFace** - 2048-D embeddings, older
- **face_recognition** library - Simple Python wrapper around dlib

**Recommended**: FaceNet (for balance) or ArcFace (for best accuracy)

**Process**:
1. Align face (normalize rotation and scale)
2. Pass through neural network
3. Extract embedding vector (128-D or 512-D)
4. L2 normalize the vector

---

### 5. Face Matching
**Similarity Metric**: Cosine Similarity
```python
def cosine_similarity(embedding1, embedding2):
    return np.dot(embedding1, embedding2) / (
        np.linalg.norm(embedding1) * np.linalg.norm(embedding2)
    )
```

**Thresholds**:
- **High Security**: 0.7 (1% False Acceptance Rate)
- **Balanced**: 0.6 (0.1% FAR, default)
- **Low Security**: 0.5 (10% FAR)

**1:N Identification**:
- Use pgvector for efficient similarity search
- Query: `SELECT * FROM embeddings ORDER BY embedding <=> query_vector LIMIT 5`
- Return top N matches with confidence scores

---

## 🔌 API Endpoints

### REST Endpoints

#### 1. Health Check
```
GET /health
Response: { "status": "ok", "version": "1.0.0" }
```

#### 2. Enroll Face
```
POST /enroll
Request:
  - multipart/form-data
  - image: File (JPEG/PNG)
  - userId: string
  - tenantId: string
  - requireLiveness: boolean (optional)

Response:
{
  "jobId": "uuid",
  "status": "PENDING",
  "estimatedTime": 5  // seconds
}
```

#### 3. Verify Face (1:1)
```
POST /verify
Request:
  - multipart/form-data
  - image: File
  - userId: string

Response:
{
  "match": true,
  "confidence": 0.87,
  "liveness": 95,
  "quality": 88
}
```

#### 4. Identify Face (1:N)
```
POST /identify
Request:
  - multipart/form-data
  - image: File
  - tenantId: string
  - topN: int (default: 5)

Response:
{
  "matches": [
    { "userId": "123", "confidence": 0.92 },
    { "userId": "456", "confidence": 0.78 }
  ]
}
```

#### 5. Get Job Status
```
GET /jobs/{jobId}
Response:
{
  "jobId": "uuid",
  "status": "COMPLETED",  // PENDING, PROCESSING, COMPLETED, FAILED
  "result": {
    "quality": 88,
    "liveness": 95,
    "enrolled": true
  },
  "error": null,
  "createdAt": "2025-11-17T12:00:00Z",
  "completedAt": "2025-11-17T12:00:05Z"
}
```

#### 6. Standalone Liveness Check
```
POST /liveness
Request:
  - multipart/form-data
  - video: File (MP4, WebM) or image sequence

Response:
{
  "liveness": 92,
  "isLive": true,
  "challenge": "smile",
  "challengeCompleted": true
}
```

### WebSocket Endpoint

#### Real-time Liveness Detection
```
WebSocket /ws/liveness

Client → Server:
{
  "action": "start",
  "userId": "123"
}

Server → Client:
{
  "challenge": "smile",
  "instruction": "Please smile for the camera"
}

Client → Server: (video frames as base64)
{
  "frame": "base64_encoded_image"
}

Server → Client: (real-time feedback)
{
  "liveness": 75,
  "challengeProgress": 0.8
}

Server → Client: (final result)
{
  "status": "completed",
  "liveness": 95,
  "isLive": true
}
```

---

## 📝 Implementation Tasks

### Phase 1: Project Setup (1 week)
**Priority**: 🔴 CRITICAL

#### Task 1.1: Project Structure
- [ ] Create Python project with Poetry or pip
- [ ] Setup FastAPI application
- [ ] Configure project structure (routers, services, models, ml)
- [ ] Setup environment variables (.env)
- [ ] Create requirements.txt or pyproject.toml

#### Task 1.2: Database Setup
- [ ] PostgreSQL with pgvector extension
- [ ] Create migrations (Alembic)
- [ ] Tables: enrollments, embeddings, jobs
- [ ] Indexes for fast similarity search

#### Task 1.3: Redis Setup
- [ ] Configure Redis connection
- [ ] Setup Celery with Redis broker
- [ ] Create worker configuration

#### Task 1.4: Docker Setup
- [ ] Create Dockerfile for FastAPI app
- [ ] Create Dockerfile for Celery worker
- [ ] Create docker-compose.yml (app + worker + redis + postgres)

**Acceptance Criteria**:
- ✅ FastAPI app runs on port 8000
- ✅ Can connect to PostgreSQL and Redis
- ✅ Celery worker starts successfully
- ✅ Health endpoint returns 200 OK

---

### Phase 2: Face Detection (1 week)
**Priority**: 🔴 CRITICAL

#### Task 2.1: Integrate Face Detection Model
- [ ] Choose model: MTCNN or MediaPipe
- [ ] Install dependencies
- [ ] Create FaceDetector class
- [ ] Method: `detect_face(image) -> BoundingBox`
- [ ] Handle no face detected
- [ ] Handle multiple faces (use largest or reject)

#### Task 2.2: Face Alignment
- [ ] Detect facial landmarks (eyes, nose, mouth)
- [ ] Align face to canonical position
- [ ] Normalize rotation
- [ ] Crop to standard size (e.g., 160x160)

#### Task 2.3: Quality Assessment
- [ ] Implement blur detection (Laplacian variance)
- [ ] Implement lighting assessment
- [ ] Implement face angle estimation
- [ ] Calculate overall quality score (0-100)

**Acceptance Criteria**:
- ✅ Can detect faces in photos
- ✅ Returns bounding box coordinates
- ✅ Quality score accurate for various conditions
- ✅ Rejects blurry or poorly lit images

---

### Phase 3: Liveness Detection (2 weeks)
**Priority**: 🟠 HIGH

#### Task 3.1: Challenge Generation
- [ ] Random challenge selection (smile, blink, turn left, turn right)
- [ ] Challenge instructions generator
- [ ] Prevent predictable patterns

#### Task 3.2: Smile Detection
- [ ] Use facial landmarks (mouth corners)
- [ ] Calculate mouth aspect ratio
- [ ] Detect smile vs neutral
- [ ] Threshold calibration

#### Task 3.3: Blink Detection
- [ ] Use facial landmarks (eyes)
- [ ] Calculate Eye Aspect Ratio (EAR)
- [ ] Detect eye closure
- [ ] Count blinks

#### Task 3.4: Head Movement Detection
- [ ] Estimate head pose (pitch, yaw, roll)
- [ ] Detect left/right turn
- [ ] Detect up/down movement
- [ ] Validate movement amplitude

#### Task 3.5: Anti-Spoofing
- [ ] Texture analysis for print detection
- [ ] Micro-movement detection
- [ ] Challenge randomization
- [ ] Liveness score calculation

#### Task 3.6: WebSocket Integration
- [ ] Implement WebSocket endpoint
- [ ] Real-time frame processing
- [ ] Stream liveness feedback to client
- [ ] Handle connection errors

**Acceptance Criteria**:
- ✅ Can detect smile with >95% accuracy
- ✅ Can detect blinks reliably
- ✅ Can detect head movement
- ✅ Rejects photos and videos (spoofing)
- ✅ WebSocket provides real-time feedback

---

### Phase 4: Face Recognition (2 weeks)
**Priority**: 🔴 CRITICAL

#### Task 4.1: Integrate Face Embedding Model
- [ ] Choose model: FaceNet or ArcFace
- [ ] Download pre-trained weights
- [ ] Create FaceEncoder class
- [ ] Method: `generate_embedding(face_image) -> np.ndarray`
- [ ] L2 normalization

#### Task 4.2: Embedding Storage
- [ ] Create embeddings table in PostgreSQL
- [ ] Store embeddings as vectors (pgvector)
- [ ] Index for similarity search
- [ ] Encryption at rest (optional)

#### Task 4.3: Face Matching (1:1 Verification)
- [ ] Implement cosine similarity
- [ ] Configure thresholds
- [ ] Create verification service
- [ ] Return match + confidence score

#### Task 4.4: Face Matching (1:N Identification)
- [ ] Implement pgvector similarity search
- [ ] Query top N matches
- [ ] Filter by tenant ID
- [ ] Return ranked results

**Acceptance Criteria**:
- ✅ Face embeddings are consistent (same face → similar embeddings)
- ✅ 1:1 verification accuracy >99%
- ✅ 1:N identification returns correct match in top 5
- ✅ Search performance <200ms for 10,000 embeddings

---

### Phase 5: API Layer (1 week)
**Priority**: 🟠 HIGH

#### Task 5.1: Implement Enrollment Endpoint
- [ ] POST /enroll endpoint
- [ ] Accept image upload
- [ ] Create background job
- [ ] Return job ID
- [ ] Webhook callback on completion

#### Task 5.2: Implement Verification Endpoint
- [ ] POST /verify endpoint
- [ ] Real-time processing (no queue)
- [ ] Return match result
- [ ] Include quality and liveness scores

#### Task 5.3: Implement Identification Endpoint
- [ ] POST /identify endpoint
- [ ] Search all embeddings in tenant
- [ ] Return top N matches
- [ ] Include confidence scores

#### Task 5.4: Implement Job Status Endpoint
- [ ] GET /jobs/{jobId}
- [ ] Query Redis for job status
- [ ] Return progress and result

#### Task 5.5: Implement Liveness Endpoint
- [ ] POST /liveness for static check
- [ ] WebSocket /ws/liveness for real-time

**Acceptance Criteria**:
- ✅ All endpoints return proper HTTP status codes
- ✅ Request validation works
- ✅ Error messages are clear
- ✅ API documentation (OpenAPI/Swagger)

---

### Phase 6: Background Processing (1 week)
**Priority**: 🟠 HIGH

#### Task 6.1: Celery Task Implementation
- [ ] Create enrollment task
- [ ] Create batch processing task
- [ ] Configure task timeouts
- [ ] Configure retry logic

#### Task 6.2: Job Status Tracking
- [ ] Store job status in Redis
- [ ] Update status during processing
- [ ] Expire old jobs after 24 hours

#### Task 6.3: Webhook Integration
- [ ] Implement webhook callback to identity-core-api
- [ ] POST /api/v1/biometric/callback
- [ ] Retry logic for failed webhooks
- [ ] Webhook authentication

**Acceptance Criteria**:
- ✅ Enrollment jobs process in background
- ✅ Job status updates in real-time
- ✅ Webhook successfully notifies identity-core-api
- ✅ Failed jobs are retried

---

### Phase 7: Testing & Optimization (1 week)
**Priority**: 🟡 MEDIUM

#### Task 7.1: Unit Tests
- [ ] Test face detection
- [ ] Test liveness detection
- [ ] Test embedding generation
- [ ] Test similarity matching
- [ ] 80%+ code coverage

#### Task 7.2: Integration Tests
- [ ] Test full enrollment flow
- [ ] Test verification flow
- [ ] Test identification flow
- [ ] Test webhook callbacks

#### Task 7.3: Performance Optimization
- [ ] Profile slow operations
- [ ] Optimize image preprocessing
- [ ] Batch embedding generation
- [ ] Use GPU if available (CUDA)
- [ ] Implement caching for repeated queries

#### Task 7.4: Load Testing
- [ ] Test with 100 concurrent enrollments
- [ ] Test with 1000 verifications per second
- [ ] Identify bottlenecks
- [ ] Scale workers as needed

**Acceptance Criteria**:
- ✅ 80%+ test coverage
- ✅ All critical paths tested
- ✅ Enrollment: <2s (p95)
- ✅ Verification: <500ms (p95)
- ✅ Can handle 1000+ concurrent requests

---

## 🧪 Testing Requirements

### Unit Tests
```python
# test_face_detection.py
def test_detect_face_single_face()
def test_detect_face_no_face()
def test_detect_face_multiple_faces()
def test_quality_assessment_good()
def test_quality_assessment_blurry()

# test_liveness.py
def test_smile_detection()
def test_blink_detection()
def test_head_movement()
def test_anti_spoofing()

# test_face_recognition.py
def test_generate_embedding_consistency()
def test_verify_same_person()
def test_verify_different_people()
def test_identify_correct_match()
```

### Integration Tests
```python
# test_enrollment_flow.py
async def test_full_enrollment_flow()
async def test_enrollment_webhook_callback()

# test_verification_flow.py
async def test_verification_success()
async def test_verification_failure()
```

### Performance Tests
```bash
# Load testing with Locust or k6
POST /verify - 1000 req/s - p95 < 500ms
POST /enroll - 100 req/s - p95 < 2s
POST /identify - 100 req/s - p95 < 1s
```

---

## 🚀 Deployment

### Environment Variables
```bash
# Application
APP_NAME=biometric-processor
APP_VERSION=1.0.0
APP_PORT=8000
LOG_LEVEL=INFO

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/biometric_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1

# ML Models
FACE_DETECTION_MODEL=mtcnn
FACE_RECOGNITION_MODEL=facenet
MODEL_DEVICE=cuda  # or cpu

# Thresholds
FACE_MATCH_THRESHOLD=0.6
LIVENESS_THRESHOLD=80
QUALITY_THRESHOLD=70

# External Services
IDENTITY_API_URL=http://identity-core-api:8080/api/v1
WEBHOOK_SECRET=your_secret_key
```

### Docker Compose
```yaml
version: '3.8'

services:
  biometric-api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/biometric
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  biometric-worker:
    build: .
    command: celery -A app.worker worker --loglevel=info
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/biometric
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - db
      - redis

  db:
    image: pgvector/pgvector:pg16
    environment:
      - POSTGRES_DB=biometric
      - POSTGRES_PASSWORD=postgres
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

---

## 🔗 Integration Points

### Identity Core API Integration
```python
# Webhook callback after enrollment
async def send_webhook(job_id: str, result: dict):
    webhook_url = f"{IDENTITY_API_URL}/biometric/callback"
    headers = {"Authorization": f"Bearer {WEBHOOK_SECRET}"}
    payload = {
        "jobId": job_id,
        "status": result["status"],
        "quality": result.get("quality"),
        "liveness": result.get("liveness"),
        "error": result.get("error")
    }
    await http_client.post(webhook_url, json=payload, headers=headers)
```

---

## 📈 Success Criteria

### Functionality
- ✅ Face detection works on various image qualities
- ✅ Liveness detection prevents spoofing attacks
- ✅ Face matching accuracy >99%
- ✅ All API endpoints functional

### Performance
- ✅ Enrollment: <2s (p95)
- ✅ Verification: <500ms (p95)
- ✅ Identification: <1s (p95) for 10,000 faces
- ✅ Supports 1000+ concurrent requests

### Accuracy
- ✅ Face detection: >98%
- ✅ Liveness detection: >98% (reject spoofs)
- ✅ Face verification FAR: <0.1%
- ✅ Face verification FRR: <1%

### Security
- ✅ Biometric templates encrypted
- ✅ Webhook authentication
- ✅ Input validation
- ✅ Rate limiting

---

## 📅 Implementation Timeline

| Phase | Tasks | Estimated Time | Priority |
|-------|-------|----------------|----------|
| **Phase 1** | Project Setup | 1 week | 🔴 CRITICAL |
| **Phase 2** | Face Detection | 1 week | 🔴 CRITICAL |
| **Phase 3** | Liveness Detection | 2 weeks | 🟠 HIGH |
| **Phase 4** | Face Recognition | 2 weeks | 🔴 CRITICAL |
| **Phase 5** | API Layer | 1 week | 🟠 HIGH |
| **Phase 6** | Background Processing | 1 week | 🟠 HIGH |
| **Phase 7** | Testing & Optimization | 1 week | 🟡 MEDIUM |
| **Total** | | **9 weeks** | **~2-3 months** |

---

**Document Version**: 1.0
**Created**: 2025-11-17
**Last Updated**: 2025-11-17
**Owner**: ML/AI Team
**Review Date**: Weekly during implementation
