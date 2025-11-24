"""
Unit tests for Face Detection Service

Coverage:
- Face detection success/failure
- Quality validation
- Alignment and cropping
- Edge cases
"""

import pytest
import numpy as np
from unittest.mock import Mock, patch, MagicMock


@pytest.mark.unit
class TestFaceDetectionService:
    """Unit tests for FaceDetectionService"""

    @pytest.fixture
    def face_detector(self):
        """Create face detection service instance"""
        from app.services.face_detection import FaceDetectionService
        return FaceDetectionService()

    def test_detect_face_success(self, face_detector, sample_face_image):
        """Test successful face detection"""
        # Arrange
        image = sample_face_image

        # Act
        result = face_detector.detect_face(image)

        # Assert
        assert result['face_found'] is True
        assert result['confidence'] > 0.7
        assert 'bounding_box' in result
        assert 'landmarks' in result

    def test_detect_face_no_face_found(self, face_detector):
        """Test when no face is detected"""
        # Arrange - blank image
        blank_image = np.zeros((224, 224, 3), dtype=np.uint8)

        # Act
        result = face_detector.detect_face(blank_image)

        # Assert
        assert result['face_found'] is False
        assert 'reason' in result
        assert result['confidence'] == 0.0

    def test_validate_face_quality_success(self, face_detector, sample_face_detection_result):
        """Test quality validation passes for good face"""
        # Act
        result = face_detector.validate_face_quality(sample_face_detection_result)

        # Assert
        assert result['passed'] is True
        assert 'confidence' in result

    def test_validate_face_quality_too_small(self, face_detector):
        """Test quality validation fails for small face"""
        # Arrange
        face_data = {
            'face_found': True,
            'bounding_box': {'x': 10, 'y': 10, 'width': 50, 'height': 50},  # Too small
            'landmarks': {}
        }

        # Act
        result = face_detector.validate_face_quality(face_data)

        # Assert
        assert result['passed'] is False
        assert 'too small' in result['reason'].lower()

    def test_validate_face_quality_not_frontal(self, face_detector):
        """Test quality validation fails for non-frontal face"""
        # Arrange
        face_data = {
            'face_found': True,
            'bounding_box': {'x': 100, 'y': 100, 'width': 200, 'height': 200},
            'landmarks': {
                'left_eye': [100, 100],
                'right_eye': [200, 150]  # Large angle difference
            }
        }

        # Act
        result = face_detector.validate_face_quality(face_data)

        # Assert
        assert result['passed'] is False
        assert 'frontal' in result['reason'].lower() or 'tilt' in result['reason'].lower()

    def test_crop_and_align_face(self, face_detector, sample_face_image, sample_face_detection_result):
        """Test face cropping and alignment"""
        # Act
        aligned_face = face_detector.crop_and_align_face(
            sample_face_image,
            sample_face_detection_result,
            output_size=(224, 224)
        )

        # Assert
        assert aligned_face.shape == (224, 224, 3)
        assert aligned_face.dtype == np.uint8

    def test_detect_face_handles_grayscale(self, face_detector):
        """Test that grayscale images are converted to RGB"""
        # Arrange
        gray_image = np.random.randint(0, 256, (224, 224), dtype=np.uint8)

        # Act
        result = face_detector.detect_face(gray_image)

        # Assert - Should not crash, should handle gracefully
        assert 'face_found' in result

    def test_detect_face_handles_invalid_input(self, face_detector):
        """Test handling of invalid input"""
        # Act & Assert
        with pytest.raises(ValueError):
            face_detector.detect_face(None)

    @pytest.mark.slow
    @pytest.mark.ml
    def test_detect_multiple_faces(self, face_detector):
        """Test detection with multiple faces (should return first/best)"""
        # This would require actual image with multiple faces
        # Placeholder for integration test
        pass


@pytest.mark.integration
class TestFaceDetectionIntegration:
    """Integration tests with actual ML models"""

    @pytest.mark.ml
    def test_detect_real_face_image(self):
        """Test with real face image"""
        # This requires actual test images
        # Placeholder for integration test with real images
        pass

    @pytest.mark.ml
    def test_end_to_end_detection_pipeline(self):
        """Test complete pipeline from image to aligned face"""
        # Placeholder for E2E test
        pass
