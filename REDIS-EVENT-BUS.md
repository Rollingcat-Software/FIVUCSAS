# Redis Event Bus Implementation

## Overview

This document describes the Redis-based event bus implementation for async biometric processing in FIVUCSAS. The event bus enables real-time, event-driven communication between the **identity-core-api** (Java/Spring Boot) and **biometric-processor** (Python/FastAPI) microservices.

## Architecture

### Hexagonal Architecture (Ports & Adapters)

The implementation follows Hexagonal Architecture principles:

- **Domain Layer**: Defines `IEventBus` interface (Port)
- **Infrastructure Layer**: Implements `RedisEventBus` (Adapter)
- **Application Layer**: Uses `EventPublisher` service (Facade)

### Event Flow

```
1. User Request → Identity Core API
   ↓
2. API publishes "enrollment.requested" event → Redis
   ↓
3. Biometric Processor subscribes → Processes image
   ↓
4. Processor publishes "enrollment.completed" event → Redis
   ↓
5. API subscribes → Updates user status → Notifies client
```

## Components

### Python (Biometric Processor)

#### 1. Event Types (`event_types.py`)

Defines immutable event structures using dataclasses:

- `EnrollmentEvent` - Face enrollment events
- `VerificationEvent` - Face verification events
- `LivenessCheckEvent` - Liveness detection events
- `FaceSearchEvent` - Face search events
- `QualityAssessmentEvent` - Quality assessment events

**Event Structure:**
```python
@dataclass(frozen=True)
class EnrollmentEvent(BaseEvent):
    face_id: Optional[str]
    image_url: Optional[str]
    quality_score: Optional[float]
    embedding_dimension: Optional[int]
    success: bool
    error_message: Optional[str]
    processing_time_ms: Optional[float]
```

#### 2. Redis Event Bus (`redis_event_bus.py`)

Redis Pub/Sub implementation:

- **Async operations** using `redis.asyncio`
- **Automatic reconnection** handling
- **Retry logic** for failed operations
- **JSON serialization** for events
- **Health checking** capabilities

**Key Methods:**
```python
async def publish(channel: str, event: Dict[str, Any]) -> bool
async def subscribe(channel: str, handler: Callable) -> None
async def unsubscribe(channel: str) -> None
async def health_check() -> bool
```

#### 3. Event Handlers (`event_handlers.py`)

Processes incoming events:

- `BiometricEventHandler` - Main event processor
- `EventRouter` - Routes events to handlers by type

**Handler Methods:**
- `handle_enrollment_requested()`
- `handle_enrollment_completed()`
- `handle_enrollment_failed()`
- `handle_verification_completed()`
- `handle_liveness_check_completed()`

#### 4. Event Publisher Service (`event_publisher.py`)

Facade for publishing events from use cases:

```python
publisher = EventPublisher(event_bus)

await publisher.publish_enrollment_completed(
    user_id="user123",
    face_id="face456",
    quality_score=85.5,
    embedding_dimension=512,
    processing_time_ms=234.5,
    correlation_id="corr-789"
)
```

#### 5. Configuration (`config.py`)

Redis and event bus settings:

```python
REDIS_HOST: str = "localhost"
REDIS_PORT: int = 6379
REDIS_PASSWORD: Optional[str] = None
EVENT_BUS_ENABLED: bool = True
EVENT_BUS_RETRY_ATTEMPTS: int = 3
EVENT_BUS_RETRY_DELAY: float = 1.0
```

### Java (Identity Core API)

#### 1. Redis Event Bus (`RedisEventBus.java`)

Spring Data Redis implementation:

- **Redis Pub/Sub** using `RedisTemplate`
- **Message listener container** for subscriptions
- **JSON serialization** using Jackson
- **Thread-safe** operations

**Key Methods:**
```java
boolean publish(String channel, Map<String, Object> event)
void subscribe(String channel, BiometricEventListener listener)
void unsubscribe(String channel)
boolean isHealthy()
```

#### 2. Biometric Event Listener (`BiometricEventListener.java`)

Handles incoming events from biometric processor:

```java
public void onEvent(Map<String, Object> event) {
    String eventType = (String) event.get("event_type");
    switch (eventType) {
        case "enrollment.completed":
            handleEnrollmentCompleted(event);
            break;
        // ... other cases
    }
}
```

#### 3. Biometric Event Publisher (`BiometricEventPublisher.java`)

Service for publishing events:

```java
@Service
public class BiometricEventPublisher {
    public boolean publishEnrollmentRequested(
        String userId,
        String correlationId
    );

    public boolean publishEnrollmentCompleted(
        String userId,
        String faceId,
        Double qualityScore,
        Integer embeddingDimension,
        Double processingTimeMs,
        String correlationId
    );
}
```

#### 4. Redis Configuration (`RedisMessagingConfig.java`)

Spring configuration for Redis messaging:

```java
@Configuration
public class RedisMessagingConfig {
    @Bean
    public RedisConnectionFactory redisConnectionFactory();

    @Bean
    public RedisTemplate<String, String> redisTemplate();

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer();

    @Bean
    public RedisEventBus redisEventBus();
}
```

#### 5. Application Configuration (`application.yml`)

```yaml
redis:
  host: ${REDIS_HOST:localhost}
  port: ${REDIS_PORT:6379}
  password: ${REDIS_PASSWORD:}
  database: ${REDIS_DB:0}
  event-bus:
    enabled: ${REDIS_EVENT_BUS_ENABLED:true}
```

## Event Channels

| Channel | Purpose | Publishers | Subscribers |
|---------|---------|------------|-------------|
| `biometric.enrollment` | Enrollment events | Both services | Both services |
| `biometric.verification` | Verification events | Both services | Both services |
| `biometric.liveness` | Liveness detection | Biometric Processor | Identity Core API |
| `biometric.quality` | Quality assessment | Biometric Processor | Identity Core API |

## Event Types

### Enrollment Events

- `enrollment.requested` - User initiates enrollment
- `enrollment.started` - Processing begins
- `enrollment.completed` - Successfully enrolled
- `enrollment.failed` - Enrollment error

### Verification Events

- `verification.requested` - User initiates verification
- `verification.started` - Processing begins
- `verification.completed` - Verification result available
- `verification.failed` - Verification error

### Liveness Events

- `liveness.check.requested` - Liveness check requested
- `liveness.check.started` - Check begins
- `liveness.check.completed` - Check result available
- `liveness.check.failed` - Check error

## Usage Examples

### Python: Publishing Events

```python
from app.core.container import get_event_publisher

# Get event publisher
publisher = get_event_publisher()

# Publish enrollment completed
await publisher.publish_enrollment_completed(
    user_id="user123",
    face_id="face456",
    quality_score=85.5,
    embedding_dimension=512,
    processing_time_ms=234.5,
    correlation_id="corr-789"
)
```

### Python: Subscribing to Events

```python
from app.core.container import get_event_bus, get_event_router

# Get event bus and router
event_bus = get_event_bus()
event_router = get_event_router()

# Connect to Redis
await event_bus.connect()

# Subscribe to enrollment channel
await event_bus.subscribe(
    channel="biometric.enrollment",
    handler=event_router.route
)
```

### Java: Publishing Events

```java
@Service
public class EnrollmentService {

    private final BiometricEventPublisher eventPublisher;

    public void enrollUser(String userId) {
        String correlationId = UUID.randomUUID().toString();

        // Publish enrollment requested
        eventPublisher.publishEnrollmentRequested(userId, correlationId);

        // ... enrollment logic ...

        // Publish enrollment completed
        eventPublisher.publishEnrollmentCompleted(
            userId,
            faceId,
            qualityScore,
            embeddingDimension,
            processingTimeMs,
            correlationId
        );
    }
}
```

### Java: Handling Events

Events are automatically routed to `BiometricEventListener`. Custom handling can be added:

```java
@Component
public class CustomEventHandler {

    @Autowired
    private BiometricEventListener listener;

    @PostConstruct
    public void init() {
        // Custom initialization if needed
    }
}
```

## Configuration

### Environment Variables

#### Python (Biometric Processor)

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password
REDIS_DB=0
EVENT_BUS_ENABLED=True
EVENT_BUS_RETRY_ATTEMPTS=3
EVENT_BUS_RETRY_DELAY=1.0
```

#### Java (Identity Core API)

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_dev_password
REDIS_DB=0
REDIS_EVENT_BUS_ENABLED=true
```

### Docker Compose

Redis is configured in `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  container_name: fivucsas-redis
  command: redis-server --appendonly yes --requirepass redis_dev_password
  ports:
    - "6379:6379"
  healthcheck:
    test: ["CMD", "redis-cli", "-a", "redis_dev_password", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
```

## Testing

### Manual Testing with Redis CLI

```bash
# Connect to Redis
docker exec -it fivucsas-redis redis-cli -a redis_dev_password

# Subscribe to enrollment channel
SUBSCRIBE biometric.enrollment

# In another terminal, publish a test event
PUBLISH biometric.enrollment '{"event_type":"enrollment.completed","user_id":"test123"}'
```

### Python Unit Tests

```python
import pytest
from app.infrastructure.messaging.redis_event_bus import RedisEventBus

@pytest.mark.asyncio
async def test_event_publishing():
    event_bus = RedisEventBus("redis://localhost:6379")
    await event_bus.connect()

    event = {
        "event_type": "enrollment.completed",
        "user_id": "test123"
    }

    result = await event_bus.publish("biometric.enrollment", event)
    assert result is True

    await event_bus.disconnect()
```

### Java Integration Tests

```java
@SpringBootTest
@TestPropertySource(properties = {
    "redis.host=localhost",
    "redis.port=6379"
})
class RedisEventBusTest {

    @Autowired
    private RedisEventBus eventBus;

    @Test
    void testPublishEvent() {
        Map<String, Object> event = new HashMap<>();
        event.put("event_type", "enrollment.completed");
        event.put("user_id", "test123");

        boolean result = eventBus.publish("biometric.enrollment", event);
        assertTrue(result);
    }
}
```

## Monitoring

### Health Checks

#### Python
```python
event_bus = get_event_bus()
is_healthy = await event_bus.health_check()
```

#### Java
```java
@Autowired
private RedisEventBus eventBus;

boolean isHealthy = eventBus.isHealthy();
```

### Metrics

- **Events published**: Track via event publisher
- **Events processed**: Track via event handler
- **Failed events**: Log and monitor errors
- **Processing time**: Include in event metadata

## Error Handling

### Retry Logic

Both implementations include retry logic for transient failures:

- **Python**: Configurable retry attempts and delay
- **Java**: Spring retry mechanism

### Failed Event Handling

Failed events are:
1. Logged with full context
2. Sent to error monitoring (if configured)
3. Optionally stored for manual retry

### Circuit Breaking

Consider implementing circuit breakers for:
- Redis connection failures
- High error rates
- Slow event processing

## Security Considerations

1. **Redis Authentication**: Always use password in production
2. **TLS/SSL**: Enable for production deployments
3. **Event Validation**: Validate event structure and content
4. **Rate Limiting**: Prevent event flooding
5. **Access Control**: Limit Redis access to application services only

## Performance Optimization

1. **Connection Pooling**: Both implementations use connection pools
2. **Async Operations**: Non-blocking event processing
3. **Batch Publishing**: Group related events when possible
4. **Message Size**: Keep events under 1KB when possible
5. **Channel Strategy**: Use specific channels instead of wildcards

## Troubleshooting

### Common Issues

#### Events Not Being Received

1. Check Redis connection: `redis-cli -a password ping`
2. Verify channel names match between publisher and subscriber
3. Check event bus is enabled in configuration
4. Review logs for connection errors

#### High Memory Usage

1. Monitor Redis memory: `redis-cli -a password INFO memory`
2. Consider using Redis Streams instead of Pub/Sub for persistence
3. Implement event expiration policies

#### Performance Issues

1. Monitor event processing time
2. Check Redis network latency
3. Review handler complexity
4. Consider horizontal scaling

## Future Enhancements

1. **Redis Streams**: For persistent event log
2. **Dead Letter Queue**: For failed events
3. **Event Sourcing**: Complete event history
4. **CQRS Pattern**: Separate read/write models
5. **Saga Pattern**: Distributed transactions
6. **Event Replay**: Reprocess historical events

## References

- [Redis Pub/Sub Documentation](https://redis.io/docs/manual/pubsub/)
- [Spring Data Redis](https://spring.io/projects/spring-data-redis)
- [redis-py Documentation](https://redis-py.readthedocs.io/)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html)

## Support

For issues or questions:
- Check logs: `docker logs fivucsas-redis`
- Review configuration files
- Consult team documentation
- Contact: FIVUCSAS Team - Marmara University
