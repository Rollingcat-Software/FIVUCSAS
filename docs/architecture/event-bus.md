# Redis Event Bus Documentation

## Overview

Redis Event Bus implementation for event-driven communication between **Biometric Processor** and **Identity Core API** using publish/subscribe pattern.

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Redis Event Bus                              │
│                      (Pub/Sub + Audit Storage)                        │
└───────────────────────────────────────────────────────────────────────┘
           ▲                                        ▲
           │ PUBLISH                                │ SUBSCRIBE
           │                                        │
┌──────────┴──────────┐                  ┌─────────┴──────────┐
│ Biometric Processor │                  │  Identity Core API │
│  (Publisher)        │                  │  (Subscriber)      │
│                     │                  │                    │
│  - Enrollment Events│                  │  - Event Handlers  │
│  - Verification     │                  │  - Job Updates     │
│  - User Events      │                  │  - Audit Logs      │
└─────────────────────┘                  └────────────────────┘
```

## Benefits

### 1. **Decoupling**
- Services communicate through events, not direct HTTP calls
- Reduces dependency between services
- Easier to add new services that listen to events

### 2. **Scalability**
- Multiple subscribers can process same events
- Horizontal scaling of event processors
- Non-blocking asynchronous processing

### 3. **Reliability**
- Events stored in audit log (sorted sets with timestamp)
- Replay capability for failed processing
- Webhook + event bus redundancy

### 4. **Observability**
- Centralized audit trail
- Event history for debugging
- Performance monitoring

### 5. **Future Features**
- Analytics dashboards (real-time metrics)
- Notifications (email, SMS, push)
- Multi-service integration (payments, CRM, etc.)

## Event Types

### Enrollment Events

#### 1. `biometric.enrollment.started`
**Published when**: Enrollment processing begins
**Channel**: `fivucsas:events:enrollment`
**Payload**:
```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "event_type": "biometric.enrollment.started",
  "timestamp": "2024-01-15T10:30:45.123Z",
  "tenant_id": 1,
  "user_id": 123,
  "correlation_id": "job-20240115-abc123",
  "source_service": "biometric-processor",
  "version": "1.0",
  "data": {
    "job_id": "job-20240115-abc123",
    "face_image_url": "https://s3.amazonaws.com/bucket/image.jpg"
  }
}
```

#### 2. `biometric.enrollment.completed`
**Published when**: Enrollment completes successfully
**Channel**: `fivucsas:events:enrollment`
**Payload**:
```json
{
  "event_id": "660f9511-f39c-52e5-b827-557766551111",
  "event_type": "biometric.enrollment.completed",
  "timestamp": "2024-01-15T10:30:47.456Z",
  "tenant_id": 1,
  "user_id": 123,
  "correlation_id": "job-20240115-abc123",
  "source_service": "biometric-processor",
  "version": "1.0",
  "data": {
    "job_id": "job-20240115-abc123",
    "embedding_id": 12345,
    "quality_score": 0.92,
    "liveness_score": 0.88,
    "detection_confidence": 0.95,
    "processing_time_ms": 1850,
    "model_name": "VGG-Face",
    "embedding_dimension": 2622
  }
}
```

#### 3. `biometric.enrollment.failed`
**Published when**: Enrollment processing fails
**Channel**: `fivucsas:events:enrollment`
**Payload**:
```json
{
  "event_id": "770fa622-g40d-63f6-c938-668877662222",
  "event_type": "biometric.enrollment.failed",
  "timestamp": "2024-01-15T10:30:46.789Z",
  "tenant_id": 1,
  "user_id": 123,
  "correlation_id": "job-20240115-xyz789",
  "source_service": "biometric-processor",
  "version": "1.0",
  "data": {
    "job_id": "job-20240115-xyz789",
    "error_code": "ENROLL-005",
    "error_message": "Poor image quality (score: 0.55): Image too blurry",
    "quality_score": 0.55,
    "liveness_score": null,
    "processing_time_ms": 650
  }
}
```

### Verification Events

#### 4. `biometric.verification.completed`
**Published when**: Identity verification completes
**Channel**: `fivucsas:events:verification`
**Payload**:
```json
{
  "event_id": "880gb733-h51e-74g7-d049-779988773333",
  "event_type": "biometric.verification.completed",
  "timestamp": "2024-01-15T10:35:22.123Z",
  "tenant_id": 1,
  "user_id": 123,
  "correlation_id": "verify-20240115-def456",
  "source_service": "biometric-processor",
  "version": "1.0",
  "data": {
    "verification_id": "verify-20240115-def456",
    "verified": true,
    "similarity_score": 0.92,
    "decision": "ACCEPT",
    "processing_time_ms": 450
  }
}
```

### User Events

#### 6. `biometric.user.deleted`
**Published when**: User data is deleted (GDPR compliance)
**Channel**: `fivucsas:events:user`
**Payload**:
```json
{
  "event_id": "990hc844-i62f-85h8-e15a-880099884444",
  "event_type": "biometric.user.deleted",
  "timestamp": "2024-01-15T11:00:00.000Z",
  "tenant_id": 1,
  "user_id": 123,
  "correlation_id": null,
  "source_service": "identity-core-api",
  "version": "1.0",
  "data": {
    "reason": "GDPR data deletion request",
    "embeddings_deleted_count": 5,
    "deleted_by": "admin@example.com"
  }
}
```

## Channels

### Channel Structure

| Channel | Event Types | Purpose |
|---------|-------------|---------|
| `fivucsas:events:enrollment` | enrollment.* | Enrollment lifecycle events |
| `fivucsas:events:verification` | verification.* | Verification events |
| `fivucsas:events:user` | user.* | User management events |
| `fivucsas:events:audit` | (all) | General audit log |

## Implementation Details

### Biometric Processor (Python/FastAPI)

#### Event Publisher (`app/events/publisher.py`)

```python
class EventPublisher:
    def publish(self, event: BaseEvent, channel: Optional[EventChannel] = None) -> bool:
        """
        Publish event to Redis channel

        - Serializes event to JSON
        - Publishes to appropriate channel
        - Stores in audit log (sorted set with timestamp)
        - Returns True if successful
        """

    def get_audit_events(self, event_type: str, limit: int = 100) -> list[dict]:
        """Retrieve audit events from Redis sorted sets"""
```

#### Event Schemas (`app/events/schemas.py`)

```python
class EnrollmentCompletedEvent(BaseEvent):
    event_type: EventType = EventType.ENROLLMENT_COMPLETED

    class EnrollmentCompletedData(BaseModel):
        job_id: str
        embedding_id: int
        quality_score: float
        liveness_score: float
        # ... additional fields
```

#### Integration (`app/api/enrollment.py`)

```python
# Publish enrollment started event
event_publisher = get_event_publisher()
started_event = EnrollmentStartedEvent(
    tenant_id=request.tenant_id,
    user_id=request.user_id,
    correlation_id=request.job_id,
    data={"job_id": request.job_id, "face_image_url": request.face_image_url}
)
event_publisher.publish(started_event)

# ... ML processing ...

# Publish enrollment completed event
completed_event = EnrollmentCompletedEvent(
    tenant_id=request.tenant_id,
    user_id=request.user_id,
    correlation_id=request.job_id,
    data={
        "job_id": request.job_id,
        "embedding_id": embedding_id,
        "quality_score": quality_score,
        # ... additional data
    }
)
event_publisher.publish(completed_event)
```

### Identity Core API (Java/Spring Boot)

#### Redis Configuration (`RedisConfig.java`)

```java
@Configuration
public class RedisConfig {
    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        RedisStandaloneConfiguration config = new RedisStandaloneConfiguration();
        config.setHostName(redisHost);
        config.setPort(redisPort);
        // ...
        return new LettuceConnectionFactory(config);
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
        RedisConnectionFactory connectionFactory
    ) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }
}
```

#### Event Subscriber (`EventSubscriber.java`)

```java
@Component
public class EventSubscriber implements MessageListener {

    @PostConstruct
    public void subscribe() {
        listenerContainer.addMessageListener(
            this,
            new ChannelTopic("fivucsas:events:enrollment")
        );
        // Subscribe to other channels...
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        BaseEvent event = objectMapper.readValue(body, BaseEvent.class);
        eventHandlerService.handleEvent(event);
    }
}
```

#### Event Handler (`EventHandlerService.java`)

```java
@Service
public class EventHandlerService {

    public void handleEvent(BaseEvent event) {
        EventType eventType = EventType.fromValue(event.getEventType());

        switch (eventType) {
            case ENROLLMENT_COMPLETED:
                handleEnrollmentCompleted(event);
                break;
            // ... other cases
        }
    }

    @Transactional
    public void handleEnrollmentCompleted(BaseEvent event) {
        // Update enrollment job status
        // Update user biometric status
        // Log audit trail
    }
}
```

## Configuration

### Biometric Processor (`.env`)

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password
REDIS_DB=0
```

### Identity Core API (`application.yml`)

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: ${REDIS_PASSWORD}
      database: 0
```

## Audit Storage

### Sorted Sets for Event History

Events are stored in Redis sorted sets with timestamps as scores:

```
Key: fivucsas:audit:biometric.enrollment.completed
Score: ISO8601 timestamp
Value: JSON event payload
```

### Retrieval

```python
# Python
event_publisher.get_audit_events(
    event_type="biometric.enrollment.completed",
    start_time="2024-01-15T00:00:00Z",
    end_time="2024-01-15T23:59:59Z",
    limit=100
)
```

### Retention

- Audit logs expire after 30 days automatically
- Can be configured via `EXPIRE` command
- For long-term storage, export to database or data warehouse

## Monitoring

### Metrics to Track

1. **Events Published**: Count by type
2. **Events Received**: Count by type
3. **Processing Latency**: Time from publish to processed
4. **Failed Events**: Count and reasons
5. **Channel Subscribers**: Number of active listeners

### Logging

**Biometric Processor**:
```
2024-01-15 10:30:45 | INFO | Event published: type=biometric.enrollment.started, channel=fivucsas:events:enrollment, event_id=abc-123, subscribers=2
```

**Identity Core**:
```
2024-01-15 10:30:45 | INFO | Received message from channel: fivucsas:events:enrollment
2024-01-15 10:30:45 | INFO | Processing event: type=biometric.enrollment.started, id=abc-123, correlation_id=job-001
2024-01-15 10:30:45 | INFO | Enrollment started: job_id=job-001
```

## Comparison: Event Bus vs Webhooks

| Aspect | Event Bus (Redis) | Webhooks (HTTP) |
|--------|-------------------|-----------------|
| **Coupling** | Loose (pub/sub) | Tight (point-to-point) |
| **Scalability** | High (multiple subscribers) | Medium (1:1) |
| **Reliability** | Event persistence + replay | Retry logic required |
| **Latency** | Very low (<5ms) | Higher (HTTP overhead) |
| **Audit Trail** | Built-in (sorted sets) | Must implement separately |
| **Complexity** | Requires Redis infrastructure | Simpler (just HTTP) |
| **Best For** | Internal microservices | External integrations |

## Best Practices

### 1. **Event Naming**
- Use reverse DNS notation: `service.entity.action`
- Examples: `biometric.enrollment.completed`, `payment.transaction.failed`

### 2. **Event Versioning**
- Include version in event schema
- Support multiple versions during migration
- Deprecate old versions gracefully

### 3. **Idempotency**
- Events may be delivered multiple times
- Handlers must be idempotent
- Use `event_id` or `correlation_id` for deduplication

### 4. **Error Handling**
- Don't throw exceptions in event handlers
- Log errors and continue processing
- Use dead letter queue for failed events

### 5. **Performance**
- Keep event payloads small (<10KB)
- Use batch publishing for high volumes
- Monitor Redis memory usage

## Troubleshooting

### Issue 1: Events Not Being Received

**Symptoms**: Publisher publishes, but subscriber doesn't receive

**Diagnosis**:
```bash
# Check Redis connection
redis-cli -h localhost -p 6379 ping

# Monitor pub/sub channels
redis-cli PUBSUB CHANNELS fivucsas:events:*

# Check subscribers
redis-cli PUBSUB NUMSUB fivucsas:events:enrollment
```

**Solutions**:
- Verify Redis is running
- Check subscriber is started
- Verify channel names match

### Issue 2: Events Being Processed Multiple Times

**Symptoms**: Same event handled more than once

**Diagnosis**:
- Check logs for duplicate `event_id`
- Verify idempotency implementation

**Solutions**:
- Implement idempotency check using `event_id`
- Store processed event IDs in Redis Set
- Set expiration on processed IDs (24 hours)

### Issue 3: High Memory Usage

**Symptoms**: Redis memory increasing

**Diagnosis**:
```bash
# Check memory usage
redis-cli INFO memory

# Check audit log sizes
redis-cli ZCARD fivucsas:audit:biometric.enrollment.completed
```

**Solutions**:
- Reduce audit log retention (default: 30 days)
- Implement log rotation
- Export old events to database

## Production Considerations

### 1. **High Availability**
- Deploy Redis in cluster mode
- Use Redis Sentinel for automatic failover
- Configure multiple Redis instances

### 2. **Security**
- Enable Redis AUTH (password)
- Use TLS for Redis connections
- Restrict Redis access via firewall

### 3. **Scaling**
- Use Redis Cluster for horizontal scaling
- Implement message partitioning by tenant_id
- Monitor and tune connection pool sizes

### 4. **Disaster Recovery**
- Enable Redis persistence (RDB + AOF)
- Regular backups of audit logs
- Document event replay procedures

## Future Enhancements

### 1. **Event Replay System**
Admin interface to replay events:
- Filter by event type, date range, tenant
- Replay failed events
- Bulk replay for data corrections

### 2. **Dead Letter Queue**
- Store failed events in separate queue
- Retry with exponential backoff
- Alert on persistent failures

### 3. **Event Transformation**
- Transform events between versions
- Route events to external systems
- Enrich events with additional data

### 4. **Real-Time Analytics**
- Stream events to analytics platform
- Real-time dashboards (Grafana)
- Anomaly detection

### 5. **Multi-Region Support**
- Replicate events across regions
- Handle network partitions
- Conflict resolution

## Summary

✅ **Implemented**:
- Event publisher in Biometric Processor
- Event subscriber in Identity Core API
- Event schemas and type definitions
- Audit logging with 30-day retention
- Integration with enrollment workflow

✅ **Benefits**:
- Decoupled microservices architecture
- Built-in audit trail
- Scalable event-driven communication
- Foundation for future features

📈 **Next Steps**:
- Add verification events
- Implement event replay
- Add Prometheus metrics
- Create Grafana dashboards
- Load testing

---

**Status**: ✅ Production-ready Redis Event Bus

**Version**: 1.0.0

**Last Updated**: 2025-01-12
