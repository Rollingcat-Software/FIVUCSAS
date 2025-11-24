"""
pytest configuration and fixtures for biometric-processor tests

This file provides common fixtures used across all tests.
"""

import pytest
import numpy as np
from typing import Generator
import sys
import os

# Add app to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))


# ============================================================================
# Test Data Fixtures
# ============================================================================

@pytest.fixture
def sample_embedding() -> np.ndarray:
    """Generate sample 2622-dimensional embedding (VGG-Face)"""
    np.random.seed(42)  # Reproducible
    return np.random.rand(2622).astype(np.float32)


@pytest.fixture
def sample_face_image() -> np.ndarray:
    """Generate sample face image (224x224x3 RGB)"""
    np.random.seed(42)
    return np.random.randint(0, 256, (224, 224, 3), dtype=np.uint8)


@pytest.fixture
def sample_face_detection_result() -> dict:
    """Sample successful face detection result"""
    return {
        'face_found': True,
        'confidence': 0.95,
        'bounding_box': {
            'x': 100,
            'y': 100,
            'width': 200,
            'height': 200
        },
        'landmarks': {
            'left_eye': [150, 150],
            'right_eye': [250, 150],
            'nose': [200, 200],
            'mouth_left': [170, 250],
            'mouth_right': [230, 250]
        }
    }


@pytest.fixture
def sample_quality_result() -> dict:
    """Sample quality assessment result"""
    return {
        'overall_quality': 0.85,
        'blur_score': 0.90,
        'lighting_score': 0.80,
        'resolution_score': 0.85,
        'frontal_pose': True,
        'passed': True
    }


@pytest.fixture
def sample_liveness_result() -> dict:
    """Sample liveness detection result"""
    return {
        'liveness_score': 0.92,
        'blink_detected': True,
        'motion_detected': True,
        'texture_analysis_score': 0.90,
        'passed': True,
        'spoof_probability': 0.05
    }


# ============================================================================
# Request/Response Fixtures
# ============================================================================

@pytest.fixture
def enrollment_request() -> dict:
    """Sample enrollment request"""
    return {
        'user_id': 12345,
        'tenant_id': 1,
        'face_image_url': 'https://storage.example.com/faces/test_face.jpg',
        'enrollment_type': 'initial',
        'callback_url': 'http://identity-core-api:8080/api/v1/enrollment/webhook/job123'
    }


@pytest.fixture
def verification_request() -> dict:
    """Sample verification request"""
    return {
        'user_id': 12345,
        'tenant_id': 1,
        'face_image_url': 'https://storage.example.com/faces/verify_face.jpg'
    }


# ============================================================================
# Database Fixtures (with Testcontainers)
# ============================================================================

@pytest.fixture(scope="session")
def postgres_container():
    """Start PostgreSQL container for testing"""
    from testcontainers.postgres import PostgresContainer

    with PostgresContainer("postgres:16", driver="psycopg2") as postgres:
        yield postgres


@pytest.fixture(scope="session")
def redis_container():
    """Start Redis container for testing"""
    from testcontainers.redis import RedisContainer

    with RedisContainer("redis:7-alpine") as redis:
        yield redis


@pytest.fixture
def database_url(postgres_container) -> str:
    """Get database URL from container"""
    return postgres_container.get_connection_url()


@pytest.fixture
def redis_url(redis_container) -> str:
    """Get Redis URL from container"""
    host = redis_container.get_container_host_ip()
    port = redis_container.get_exposed_port(6379)
    return f"redis://{host}:{port}"


# ============================================================================
# Mock Service Fixtures
# ============================================================================

@pytest.fixture
def mock_face_detector(mocker):
    """Mock face detection service"""
    mock = mocker.patch('app.services.face_detection.FaceDetectionService')
    mock.return_value.detect_face.return_value = {
        'face_found': True,
        'confidence': 0.95,
        'bounding_box': {'x': 100, 'y': 100, 'width': 200, 'height': 200},
        'landmarks': {
            'left_eye': [150, 150],
            'right_eye': [250, 150]
        }
    }
    return mock


@pytest.fixture
def mock_embedding_extractor(mocker, sample_embedding):
    """Mock embedding extraction service"""
    mock = mocker.patch('app.services.embedding.EmbeddingExtractionService')
    mock.return_value.extract_embedding.return_value = {
        'success': True,
        'embedding': sample_embedding.tolist(),
        'dimension': 2622,
        'model': 'VGG-Face'
    }
    return mock


# ============================================================================
# FastAPI Test Client
# ============================================================================

@pytest.fixture
def client():
    """FastAPI test client"""
    from fastapi.testclient import TestClient
    from app.main import app

    return TestClient(app)


# ============================================================================
# Async Fixtures
# ============================================================================

@pytest.fixture
async def async_client():
    """Async HTTP client for testing"""
    import httpx

    async with httpx.AsyncClient() as client:
        yield client


# ============================================================================
# Cleanup
# ============================================================================

@pytest.fixture(autouse=True)
def cleanup_after_test():
    """Cleanup after each test"""
    yield
    # Add any cleanup logic here
    pass


# ============================================================================
# Pytest Hooks
# ============================================================================

def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "e2e: End-to-end tests")
    config.addinivalue_line("markers", "slow: Slow tests")
    config.addinivalue_line("markers", "ml: ML model tests")
