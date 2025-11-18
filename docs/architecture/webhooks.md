# Webhook Integration Documentation

## Overview

Webhook integration between **Biometric Processor API** (Python/FastAPI) and **Identity Core API** (Java/Spring Boot) for enrollment completion notifications.

## Architecture

```
┌─────────────────────────────┐          ┌──────────────────────────────┐
│  Biometric Processor API    │          │   Identity Core API          │
│  (Python/FastAPI)           │          │   (Java/Spring Boot)         │
│                             │          │                              │
│  1. Process Enrollment      │          │                              │
│  2. Extract Face Embedding  │          │                              │
│  3. Store in Database       │          │                              │
│                             │          │                              │
│  4. Send Webhook ────────────────────→ │  5. Receive Webhook         │
│     (HMAC-SHA256 Signed)    │          │  6. Verify Signature        │
│     - Retry Logic           │          │  7. Update Enrollment Job   │
│     - Exponential Backoff   │          │  8. Update User Status      │
│                             │          │                              │
└─────────────────────────────┘          └──────────────────────────────┘
```

## Flow

### 1. Enrollment Initiation
- User submits face image through Identity Core API
- Identity Core creates `EnrollmentJob` with status `PENDING`
- Forwards request to Biometric Processor

### 2. Biometric Processing
- Biometric Processor processes image (face detection, quality, liveness, embedding)
- Stores embedding in database (pgvector)
- Updates local job status to `SUCCESS` or `FAILED`

### 3. Webhook Notification
- Biometric Processor calls Identity Core webhook endpoint
- Includes HMAC-SHA256 signature for verification
- Implements retry logic with exponential backoff (3 attempts)

### 4. Webhook Processing
- Identity Core verifies webhook signature
- Updates `EnrollmentJob` status
- Updates `User.biometricEnrolled` flag if successful
- Returns acknowledgement

## Components

### Biometric Processor (Python)

#### Webhook Service (`app/services/webhook_service.py`)

```python
class WebhookService:
    """
    Webhook Service for calling Identity Core API

    Features:
    - Retry logic with exponential backoff (1s, 2s, 4s)
    - HMAC-SHA256 signature generation
    - Timeout handling (10 seconds default)
    - Error logging
    """

    async def notify_enrollment_completion(
        job_id: str,
        status: str,  # "success" or "failed"
        quality_score: Optional[float],
        liveness_score: Optional[float],
        embedding_id: Optional[int],
        processing_time_ms: Optional[int],
        error_code: Optional[str],
        error_message: Optional[str]
    ) -> bool
```

**Key Features**:
- **Retry Logic**: 3 attempts with exponential backoff (1s, 2s, 4s)
- **Signature**: HMAC-SHA256 signature in `X-Webhook-Signature` header
- **Timeout**: 10-second HTTP timeout
- **Async**: Non-blocking background task

#### Configuration (`app/core/config.py`)

```python
# Webhook Configuration
IDENTITY_CORE_WEBHOOK_URL: str = "http://localhost:8080/api/v1/webhooks/enrollment"
WEBHOOK_SECRET: str = "change-this-webhook-secret-in-production"
WEBHOOK_MAX_RETRIES: int = 3
WEBHOOK_TIMEOUT: int = 10
```

#### Integration (`app/api/enrollment.py`)

```python
# After successful enrollment
webhook_service = get_webhook_service()
background_tasks.add_task(
    webhook_service.notify_enrollment_completion,
    job_id=request.job_id,
    status="success",
    quality_score=quality_score,
    liveness_score=liveness_score,
    embedding_id=embedding_id,
    processing_time_ms=int(processing_time)
)
```

### Identity Core API (Java)

#### Webhook Controller (`WebhookController.java`)

```java
@PostMapping("/enrollment")
public ResponseEntity<EnrollmentWebhookResponse> handleEnrollmentWebhook(
    @Valid @RequestBody EnrollmentWebhookRequest request,
    @RequestHeader(value = "X-Webhook-Signature", required = false) String signature
)
```

**Endpoints**:
- `POST /api/v1/webhooks/enrollment` - Receive enrollment completion
- `GET /api/v1/webhooks/health` - Health check

#### Webhook Service (`WebhookService.java`)

```java
@Service
public class WebhookService {
    /**
     * Verify webhook signature using HMAC-SHA256
     */
    public boolean verifyWebhookSignature(
        EnrollmentWebhookRequest request,
        String signature
    )

    /**
     * Process enrollment completion webhook
     * - Updates EnrollmentJob status
     * - Updates User.biometricEnrolled flag
     */
    @Transactional
    public void processEnrollmentWebhook(EnrollmentWebhookRequest request)
}
```

#### User Entity Update (`User.java`)

```java
// Biometric Enrollment
@Column(name = "biometric_enrolled")
@Builder.Default
private Boolean biometricEnrolled = false;

@Column(name = "biometric_enrollment_date")
private java.time.LocalDateTime biometricEnrollmentDate;
```

## Webhook Payload

### Request (Biometric Processor → Identity Core)

```json
{
  "job_id": "job-20240115-abc123",
  "status": "success",
  "quality_score": 0.92,
  "liveness_score": 0.88,
  "embedding_id": 12345,
  "processing_time_ms": 1850,
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

**For Failed Enrollment**:

```json
{
  "job_id": "job-20240115-xyz789",
  "status": "failed",
  "quality_score": 0.55,
  "liveness_score": null,
  "error_code": "ENROLL-005",
  "error_message": "Poor image quality (score: 0.55): Image too blurry",
  "processing_time_ms": 650,
  "timestamp": "2024-01-15T10:32:10.456Z"
}
```

### Response (Identity Core → Biometric Processor)

**Success**:
```json
{
  "received": true,
  "job_id": "job-20240115-abc123",
  "message": "Enrollment webhook received and processed successfully",
  "timestamp": "2024-01-15T10:30:45.200Z"
}
```

**Error**:
```json
{
  "received": false,
  "job_id": "job-20240115-xyz789",
  "message": "Enrollment job not found: job-20240115-xyz789",
  "timestamp": "2024-01-15T10:32:10.500Z"
}
```

## Security

### HMAC-SHA256 Signature

**Generation (Biometric Processor)**:

```python
import hmac
import hashlib
import json

payload = {"job_id": "...", "status": "success", ...}
payload_json = json.dumps(payload, sort_keys=True)

signature = hmac.new(
    webhook_secret.encode('utf-8'),
    payload_json.encode('utf-8'),
    hashlib.sha256
).hexdigest()

headers = {"X-Webhook-Signature": signature}
```

**Verification (Identity Core)**:

```java
Mac mac = Mac.getInstance("HmacSHA256");
SecretKeySpec secretKey = new SecretKeySpec(
    webhookSecret.getBytes(StandardCharsets.UTF_8),
    "HmacSHA256"
);
mac.init(secretKey);

byte[] hmacBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
String computedSignature = HexFormat.of().formatHex(hmacBytes);

// Constant-time comparison
boolean isValid = MessageDigest.isEqual(
    signature.getBytes(StandardCharsets.UTF_8),
    computedSignature.getBytes(StandardCharsets.UTF_8)
);
```

### Shared Secret

**Configuration**:
- **Biometric Processor**: `WEBHOOK_SECRET` environment variable
- **Identity Core**: `app.webhook.secret` application property

**Production Recommendation**:
- Use strong random secret (min 32 characters)
- Store in secure secret management system (AWS Secrets Manager, HashiCorp Vault)
- Rotate regularly (every 90 days)

Example: `openssl rand -hex 32` → `a5f8d...` (64 chars)

## Retry Logic

### Exponential Backoff

| Attempt | Wait Time | Total Elapsed |
|---------|-----------|---------------|
| 1       | 0s        | 0s            |
| 2       | 1s        | 1s            |
| 3       | 2s        | 3s            |
| 4       | 4s        | 7s            |

**Retry Conditions**:
- HTTP 5xx errors
- Connection errors
- Timeout errors

**No Retry**:
- HTTP 2xx (success)
- HTTP 4xx (client error - bad request, not found, etc.)

## Error Handling

### Biometric Processor

**Webhook Failures**:
- Logged to application logs (Loguru)
- Does **not** block enrollment response
- Enrollment status still updated in local database
- Webhook retry handled in background task

**Example Log**:
```
2024-01-15 10:30:45 | WARNING | Webhook notification failed: job_id=job-123, status_code=503, attempt=1/3
2024-01-15 10:30:46 | WARNING | Retrying webhook in 1 seconds...
2024-01-15 10:30:47 | SUCCESS | Webhook notification successful: job_id=job-123, status=success
```

### Identity Core

**Webhook Processing Errors**:
- Returns HTTP 500 with error message
- Logs error for investigation
- Does **not** update enrollment job if processing fails

**Example Scenarios**:
- **Job not found**: Returns HTTP 404 (no retry)
- **Invalid signature**: Returns HTTP 401 (no retry)
- **Database error**: Returns HTTP 500 (retry)

## Database Updates

### EnrollmentJob Status Transitions

```
PENDING → PROCESSING → SUCCESS
                    ↘
                      FAILED
```

### User Biometric Status

**Success**:
```sql
UPDATE users
SET biometric_enrolled = true,
    biometric_enrollment_date = NOW(),
    status = 'ACTIVE'
WHERE id = ?;
```

**Failure**:
```sql
-- User status remains PENDING_ENROLLMENT
-- No changes to biometric fields
```

## Configuration

### Environment Variables

**Biometric Processor** (`.env` or environment):

```bash
# Webhook Configuration
IDENTITY_CORE_WEBHOOK_URL=http://localhost:8080/api/v1/webhooks/enrollment
WEBHOOK_SECRET=your-secret-key-here
WEBHOOK_MAX_RETRIES=3
WEBHOOK_TIMEOUT=10
```

**Identity Core** (`application.properties` or `application.yml`):

```yaml
app:
  webhook:
    secret: your-secret-key-here
```

**Production**:
```yaml
app:
  webhook:
    secret: ${WEBHOOK_SECRET}  # From environment variable
```

## Testing

### Manual Testing

**1. Start Identity Core API**:
```bash
cd identity-core-api
./mvnw spring-boot:run
```

**2. Start Biometric Processor**:
```bash
cd biometric-processor
uvicorn app.main:app --reload --port 8001
```

**3. Test Webhook Health**:
```bash
curl http://localhost:8080/api/v1/webhooks/health
# Expected: "Webhook endpoint is healthy"
```

**4. Send Test Webhook** (from Biometric Processor):
```python
import asyncio
from app.services.webhook_service import get_webhook_service

async def test():
    webhook = get_webhook_service()
    success = await webhook.notify_enrollment_completion(
        job_id="test-job-001",
        status="success",
        quality_score=0.92,
        liveness_score=0.88,
        embedding_id=12345,
        processing_time_ms=1500
    )
    print(f"Webhook success: {success}")

asyncio.run(test())
```

### Unit Tests

**Biometric Processor** (`tests/test_webhook_service.py`):
```python
@pytest.mark.asyncio
async def test_webhook_signature_generation():
    webhook = WebhookService(webhook_secret="test-secret")
    payload = {"job_id": "test", "status": "success"}
    signature = webhook._generate_signature(payload)
    assert len(signature) == 64  # SHA256 hex
```

**Identity Core** (`WebhookServiceTest.java`):
```java
@Test
public void testVerifyWebhookSignature_Valid() {
    EnrollmentWebhookRequest request = ...;
    String validSignature = generateSignature(request);

    boolean isValid = webhookService.verifyWebhookSignature(
        request, validSignature
    );

    assertTrue(isValid);
}
```

## Monitoring

### Metrics to Track

1. **Webhook Success Rate**: % of successful webhook deliveries
2. **Webhook Latency**: Time from enrollment completion to webhook received
3. **Retry Rate**: % of webhooks requiring retries
4. **Failure Rate**: % of webhooks failing after all retries

### Logging

**Biometric Processor**:
- Webhook initiation
- Retry attempts
- Success/failure with status codes
- Error messages

**Identity Core**:
- Webhook received
- Signature verification result
- Processing success/failure
- Database update confirmation

### Alerts

**Critical**:
- Webhook failure rate > 10% (last 5 minutes)
- All webhooks failing (endpoint down)

**Warning**:
- Webhook latency > 5 seconds (p95)
- Retry rate > 30%

## Troubleshooting

### Common Issues

#### 1. Webhook Connection Refused

**Symptoms**: `Connection error: Connection refused`

**Causes**:
- Identity Core API not running
- Wrong webhook URL

**Solutions**:
- Verify Identity Core is running: `curl http://localhost:8080/actuator/health`
- Check `IDENTITY_CORE_WEBHOOK_URL` configuration

#### 2. Invalid Signature

**Symptoms**: HTTP 401, "Invalid webhook signature"

**Causes**:
- Mismatched webhook secrets
- JSON serialization differences

**Solutions**:
- Verify secrets match in both services
- Check logs for computed vs received signature

#### 3. Webhook Timeout

**Symptoms**: `Webhook notification timeout`

**Causes**:
- Identity Core slow to respond
- Database performance issues

**Solutions**:
- Increase `WEBHOOK_TIMEOUT` (default: 10s)
- Check Identity Core database connection pool
- Review database query performance

#### 4. Job Not Found

**Symptoms**: HTTP 404, "Enrollment job not found"

**Causes**:
- Job ID mismatch
- Job deleted from database
- Wrong tenant

**Solutions**:
- Verify `job_id` matches between systems
- Check database for job existence
- Verify tenant ID consistency

## Production Considerations

### 1. Webhook Secret Management
- Store in AWS Secrets Manager / HashiCorp Vault
- Rotate every 90 days
- Use different secrets for dev/staging/production

### 2. Network Configuration
- Use internal service mesh (e.g., Istio, Linkerd)
- Enable mTLS between services
- Configure firewall rules

### 3. High Availability
- Deploy both services with multiple replicas
- Use load balancer for Identity Core
- Consider message queue for webhook delivery (e.g., RabbitMQ, Kafka)

### 4. Rate Limiting
- Implement rate limiting on webhook endpoint
- Prevent abuse/DOS attacks
- Example: 100 requests/minute per IP

### 5. Monitoring & Observability
- Integrate with APM (Application Performance Monitoring)
- Track webhook metrics in Prometheus
- Create Grafana dashboards
- Set up PagerDuty/OpsGenie alerts

## Future Enhancements

### 1. Webhook Delivery Queue
Replace direct HTTP calls with message queue:
- **Producer**: Biometric Processor publishes to queue
- **Consumer**: Identity Core subscribes to queue
- **Benefits**: Better reliability, retry handling, observability

### 2. Webhook Event Types
Support multiple event types:
- `enrollment.completed`
- `enrollment.failed`
- `verification.completed`
- `user.deleted` (GDPR)

### 3. Webhook Versioning
Support multiple webhook versions:
- `/api/v1/webhooks/enrollment` (current)
- `/api/v2/webhooks/enrollment` (future)

### 4. Webhook Replay
Admin interface to replay failed webhooks:
- View webhook delivery history
- Manually retry failed webhooks
- Audit webhook processing

### 5. Bidirectional Webhooks
Identity Core → Biometric Processor:
- User deletion notifications (GDPR)
- Account status changes (suspend/activate)

## Summary

✅ **Implemented**:
- Webhook endpoint in Identity Core API
- Webhook caller service in Biometric Processor
- HMAC-SHA256 signature verification
- Retry logic with exponential backoff
- Error handling and logging
- Database schema updates

✅ **Production-Ready**:
- Secure signature verification
- Non-blocking background tasks
- Comprehensive error handling
- Configurable settings

📈 **Next Steps**:
- Add webhook delivery metrics
- Create Grafana dashboards
- Implement webhook replay functionality
- Add integration tests
- Consider message queue for high-scale scenarios

---

**Status**: ✅ Complete - Webhook integration ready for production

**Version**: 1.0.0

**Last Updated**: 2025-01-12
