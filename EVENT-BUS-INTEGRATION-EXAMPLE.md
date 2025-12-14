# Event Bus Integration Example

This document provides practical examples of integrating the Redis event bus into your biometric processing workflows.

## Python Integration Example

### Enrolling a User with Event Publishing

```python
# File: app/application/use_cases/enroll_face.py

import logging
import time
from typing import Optional

import cv2
import numpy as np

from app.application.services.event_publisher import EventPublisher
from app.domain.entities.face_embedding import FaceEmbedding
from app.domain.exceptions.face_errors import PoorImageQualityError
from app.domain.interfaces.embedding_extractor import IEmbeddingExtractor
from app.domain.interfaces.embedding_repository import IEmbeddingRepository
from app.domain.interfaces.face_detector import IFaceDetector
from app.domain.interfaces.quality_assessor import IQualityAssessor

logger = logging.getLogger(__name__)


class EnrollFaceUseCase:
    """Enhanced enrollment use case with event publishing."""

    def __init__(
        self,
        detector: IFaceDetector,
        extractor: IEmbeddingExtractor,
        quality_assessor: IQualityAssessor,
        repository: IEmbeddingRepository,
        event_publisher: Optional[EventPublisher] = None,
    ) -> None:
        self._detector = detector
        self._extractor = extractor
        self._quality_assessor = quality_assessor
        self._repository = repository
        self._event_publisher = event_publisher

    async def execute(
        self,
        user_id: str,
        image_path: str,
        tenant_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> FaceEmbedding:
        """Execute face enrollment with event publishing."""

        start_time = time.time()

        try:
            # Publish enrollment started event
            if self._event_publisher:
                await self._event_publisher.publish_enrollment_started(
                    user_id=user_id,
                    correlation_id=correlation_id,
                    metadata={"tenant_id": tenant_id}
                )

            logger.info(f"Starting face enrollment for user_id={user_id}")

            # Load image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Failed to load image: {image_path}")

            # Detect face
            detection = await self._detector.detect(image)
            face_region = detection.get_face_region(image)

            # Assess quality
            quality = await self._quality_assessor.assess(face_region)

            if not quality.is_acceptable:
                raise PoorImageQualityError(
                    quality_score=quality.score,
                    min_threshold=self._quality_assessor.get_minimum_acceptable_score(),
                )

            # Extract embedding
            embedding_vector = await self._extractor.extract(face_region)

            # Save to repository
            await self._repository.save(
                user_id=user_id,
                embedding=embedding_vector,
                quality_score=quality.score,
                tenant_id=tenant_id,
            )

            # Create result entity
            face_embedding = FaceEmbedding.create_new(
                user_id=user_id,
                vector=embedding_vector,
                quality_score=quality.score,
                tenant_id=tenant_id,
            )

            # Calculate processing time
            processing_time_ms = (time.time() - start_time) * 1000

            # Publish enrollment completed event
            if self._event_publisher:
                await self._event_publisher.publish_enrollment_completed(
                    user_id=user_id,
                    face_id=face_embedding.id,
                    quality_score=quality.score,
                    embedding_dimension=len(embedding_vector),
                    processing_time_ms=processing_time_ms,
                    correlation_id=correlation_id,
                    metadata={"tenant_id": tenant_id}
                )

            logger.info(
                f"Enrollment completed: user_id={user_id}, "
                f"quality={quality.score:.1f}, time={processing_time_ms:.1f}ms"
            )

            return face_embedding

        except Exception as e:
            # Calculate processing time even on failure
            processing_time_ms = (time.time() - start_time) * 1000

            # Publish enrollment failed event
            if self._event_publisher:
                await self._event_publisher.publish_enrollment_failed(
                    user_id=user_id,
                    error_message=str(e),
                    correlation_id=correlation_id,
                    metadata={
                        "tenant_id": tenant_id,
                        "processing_time_ms": processing_time_ms
                    }
                )

            logger.error(f"Enrollment failed: user_id={user_id}, error={str(e)}")
            raise
```

### Updating Container to Inject Event Publisher

```python
# File: app/core/container.py

from app.application.services.event_publisher import EventPublisher

def get_enroll_face_use_case() -> EnrollFaceUseCase:
    """Get enroll face use case with event publisher."""
    return EnrollFaceUseCase(
        detector=get_face_detector(),
        extractor=get_embedding_extractor(),
        quality_assessor=get_quality_assessor(),
        repository=get_embedding_repository(),
        event_publisher=get_event_publisher(),  # Added event publisher
    )
```

### API Endpoint with Event Publishing

```python
# File: app/api/v1/endpoints/biometric.py

from fastapi import APIRouter, Depends, HTTPException
from uuid import uuid4

from app.core.container import get_enroll_face_use_case
from app.application.use_cases.enroll_face import EnrollFaceUseCase

router = APIRouter()


@router.post("/enroll")
async def enroll_face(
    user_id: str,
    image_path: str,
    use_case: EnrollFaceUseCase = Depends(get_enroll_face_use_case),
):
    """Enroll a user's face with event publishing."""

    # Generate correlation ID for tracking
    correlation_id = str(uuid4())

    try:
        result = await use_case.execute(
            user_id=user_id,
            image_path=image_path,
            correlation_id=correlation_id,
        )

        return {
            "success": True,
            "face_id": result.id,
            "quality_score": result.quality_score,
            "correlation_id": correlation_id,
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Subscribing to Events

```python
# File: app/main.py (startup event)

from fastapi import FastAPI
from app.core.container import get_event_bus, get_event_router

app = FastAPI()


@app.on_event("startup")
async def startup_event():
    """Initialize event bus subscriptions on startup."""

    # Get event bus and router
    event_bus = get_event_bus()
    event_router = get_event_router()

    # Connect to Redis
    await event_bus.connect()

    # Subscribe to channels
    await event_bus.subscribe("biometric.enrollment", event_router.route)
    await event_bus.subscribe("biometric.verification", event_router.route)
    await event_bus.subscribe("biometric.liveness", event_router.route)

    logger.info("Event bus subscriptions initialized")


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup event bus on shutdown."""

    event_bus = get_event_bus()
    await event_bus.disconnect()

    logger.info("Event bus disconnected")
```

## Java Integration Example

### Publishing Events from Service

```java
// File: src/main/java/com/fivucsas/identity/application/service/EnrollBiometricService.java

package com.fivucsas.identity.application.service;

import com.fivucsas.identity.infrastructure.messaging.BiometricEventPublisher;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class EnrollBiometricService {

    private static final Logger logger = LoggerFactory.getLogger(EnrollBiometricService.class);

    private final BiometricEventPublisher eventPublisher;

    public EnrollBiometricService(BiometricEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public EnrollmentResult enrollUser(String userId, String imagePath) {
        // Generate correlation ID for tracking
        String correlationId = UUID.randomUUID().toString();

        try {
            // Publish enrollment requested event
            eventPublisher.publishEnrollmentRequested(userId, correlationId);

            logger.info("Enrollment requested: user_id={}, correlation_id={}",
                    userId, correlationId);

            // Here you would call the biometric processor API
            // or wait for the processor to pick up the event and process it

            // For demo purposes, we'll simulate the flow
            // In reality, the processor publishes the completed event

            return EnrollmentResult.builder()
                    .userId(userId)
                    .correlationId(correlationId)
                    .status("PENDING")
                    .build();

        } catch (Exception e) {
            logger.error("Enrollment request failed: user_id={}, error={}",
                    userId, e.getMessage());

            // Publish failure event
            eventPublisher.publishEnrollmentFailed(
                    userId,
                    e.getMessage(),
                    correlationId
            );

            throw new BiometricException("Enrollment failed", e);
        }
    }
}
```

### Handling Events in Listener

```java
// File: src/main/java/com/fivucsas/identity/infrastructure/messaging/BiometricEventListener.java

private void handleEnrollmentCompleted(Map<String, Object> event) {
    String userId = (String) event.get("user_id");
    String faceId = (String) event.get("face_id");
    Double qualityScore = (Double) event.get("quality_score");

    logger.info(
            "Processing enrollment completion: user_id={}, face_id={}, quality={}",
            userId,
            faceId,
            qualityScore
    );

    try {
        // Update user status in database
        userRepository.updateEnrollmentStatus(
                userId,
                EnrollmentStatus.COMPLETED,
                faceId
        );

        // Send notification to user
        notificationService.sendEnrollmentSuccess(userId);

        // Update analytics
        analyticsService.recordEnrollment(userId, qualityScore);

        logger.info("Enrollment completed successfully: user_id={}", userId);

    } catch (Exception e) {
        logger.error(
                "Error processing enrollment completion: user_id={}, error={}",
                userId,
                e.getMessage(),
                e
        );
    }
}
```

### REST Controller with Event Publishing

```java
// File: src/main/java/com/fivucsas/identity/presentation/controller/BiometricController.java

package com.fivucsas.identity.presentation.controller;

import com.fivucsas.identity.application.service.EnrollBiometricService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/biometric")
public class BiometricController {

    private final EnrollBiometricService enrollService;

    public BiometricController(EnrollBiometricService enrollService) {
        this.enrollService = enrollService;
    }

    @PostMapping("/enroll")
    public ResponseEntity<EnrollmentResponse> enrollUser(
            @RequestBody EnrollmentRequest request) {

        EnrollmentResult result = enrollService.enrollUser(
                request.getUserId(),
                request.getImagePath()
        );

        return ResponseEntity.ok(
                EnrollmentResponse.builder()
                        .success(true)
                        .correlationId(result.getCorrelationId())
                        .status(result.getStatus())
                        .message("Enrollment request submitted")
                        .build()
        );
    }
}
```

## Testing the Event Flow

### End-to-End Test

1. **Start Services**:
```bash
docker-compose up -d redis postgres
cd biometric-processor && uvicorn app.main:app --reload
cd identity-core-api && ./mvnw spring-boot:run
```

2. **Submit Enrollment Request**:
```bash
curl -X POST http://localhost:8080/api/v1/biometric/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "imagePath": "/path/to/image.jpg"
  }'
```

3. **Monitor Redis**:
```bash
docker exec -it fivucsas-redis redis-cli -a redis_dev_password
SUBSCRIBE biometric.enrollment
```

4. **Watch Logs**:
```bash
# Python logs
docker logs -f fivucsas-biometric-processor

# Java logs
docker logs -f fivucsas-identity-core-api
```

### Expected Event Flow

1. Identity Core API publishes:
   - `enrollment.requested` → `biometric.enrollment`

2. Biometric Processor:
   - Receives `enrollment.requested`
   - Processes image
   - Publishes `enrollment.completed` → `biometric.enrollment`

3. Identity Core API:
   - Receives `enrollment.completed`
   - Updates user status
   - Sends notification

## Debugging Tips

### Check Redis Connection

```python
# Python
from redis import Redis
r = Redis(host='localhost', port=6379, password='redis_dev_password')
print(r.ping())
```

```java
// Java - check logs for connection errors
@Autowired
private RedisEventBus eventBus;

boolean healthy = eventBus.isHealthy();
System.out.println("Redis healthy: " + healthy);
```

### Monitor Events

Use Redis Monitor to see all commands:
```bash
docker exec -it fivucsas-redis redis-cli -a redis_dev_password MONITOR
```

### Test Event Publishing

```python
# Python - direct publish test
import asyncio
from app.core.container import get_event_bus

async def test():
    bus = get_event_bus()
    await bus.connect()

    event = {
        "event_type": "test.event",
        "message": "Hello from Python"
    }

    result = await bus.publish("test.channel", event)
    print(f"Published: {result}")

    await bus.disconnect()

asyncio.run(test())
```

```java
// Java - direct publish test
@Test
void testEventPublishing() {
    Map<String, Object> event = new HashMap<>();
    event.put("event_type", "test.event");
    event.put("message", "Hello from Java");

    boolean result = eventBus.publish("test.channel", event);
    assertTrue(result);
}
```

## Performance Considerations

### Async Processing

Both implementations use async operations to prevent blocking:

- **Python**: `asyncio` with `redis.asyncio`
- **Java**: Spring's async execution

### Connection Pooling

Configured connection pools prevent connection exhaustion:

- **Python**: `max_connections=10` (configurable)
- **Java**: Lettuce connection pool

### Error Handling

Always wrap event publishing in try-catch to prevent cascading failures:

```python
try:
    await event_publisher.publish_event(...)
except Exception as e:
    logger.error(f"Failed to publish event: {e}")
    # Continue processing - don't fail the main operation
```

## Best Practices

1. **Correlation IDs**: Always use correlation IDs to trace related events
2. **Error Events**: Publish failure events for observability
3. **Idempotency**: Design event handlers to be idempotent
4. **Timeouts**: Set appropriate timeouts for event processing
5. **Monitoring**: Track event counts, processing times, and errors
6. **Testing**: Test event flows in integration tests
7. **Documentation**: Document event schemas and flows

## Conclusion

The Redis event bus provides a robust, scalable solution for async biometric processing. By following the patterns shown in this example, you can build reliable, event-driven microservices that communicate efficiently and handle failures gracefully.
