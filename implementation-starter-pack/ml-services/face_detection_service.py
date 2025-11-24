"""
Face Detection Service using MediaPipe

This is a production-ready implementation ready to copy into your
biometric-processor/app/services/ directory.

Features:
- Face detection with MediaPipe
- Landmark extraction
- Quality validation
- Face alignment
"""

import cv2
import mediapipe as mp
import numpy as np
from typing import Dict, Tuple, Optional
import logging

logger = logging.getLogger(__name__)


class FaceDetectionService:
    """Face detection using MediaPipe Face Detection + Face Mesh"""

    def __init__(self):
        """Initialize MediaPipe Face Detection and Mesh"""
        self.mp_face_detection = mp.solutions.face_detection
        self.mp_face_mesh = mp.solutions.face_mesh

        # Initialize face detection (model=1 for full range up to 5m)
        self.face_detection = self.mp_face_detection.FaceDetection(
            model_selection=1,
            min_detection_confidence=0.7
        )

        # Initialize face mesh for detailed landmarks
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.7
        )

        logger.info("Face detection service initialized successfully")

    def detect_face(self, image: np.ndarray) -> Dict:
        """
        Detect face in image and extract bounding box + landmarks

        Args:
            image: Input image as numpy array (RGB format)

        Returns:
            Dictionary with detection results:
            {
                'face_found': bool,
                'confidence': float,
                'bounding_box': {'x', 'y', 'width', 'height'},
                'landmarks': {'left_eye', 'right_eye', ...},
                'face_region': np.ndarray (cropped face)
            }
        """
        if image is None:
            raise ValueError("Image cannot be None")

        try:
            # Convert to RGB if needed
            if len(image.shape) == 2:  # Grayscale
                image = cv2.cvtColor(image, cv2.COLOR_GRAY2RGB)
            elif image.shape[2] == 4:  # RGBA
                image = cv2.cvtColor(image, cv2.COLOR_RGBA2RGB)

            height, width, _ = image.shape

            # Run face detection
            detection_results = self.face_detection.process(image)

            if not detection_results.detections:
                return {
                    'face_found': False,
                    'reason': 'No face detected in image',
                    'confidence': 0.0
                }

            # Get first detection (highest confidence)
            detection = detection_results.detections[0]
            confidence = detection.score[0]

            # Extract bounding box (relative coordinates → absolute pixels)
            bbox = detection.location_data.relative_bounding_box
            x = int(bbox.xmin * width)
            y = int(bbox.ymin * height)
            w = int(bbox.width * width)
            h = int(bbox.height * height)

            # Ensure bounding box is within image bounds
            x = max(0, x)
            y = max(0, y)
            w = min(w, width - x)
            h = min(h, height - y)

            # Run face mesh for detailed landmarks
            landmarks_dict = {}
            mesh_results = self.face_mesh.process(image)

            if mesh_results.multi_face_landmarks:
                face_landmarks = mesh_results.multi_face_landmarks[0]

                # MediaPipe Face Mesh landmark indices (468 points)
                key_points = {
                    'left_eye': 33,      # Left eye center
                    'right_eye': 263,    # Right eye center
                    'nose_tip': 1,       # Nose tip
                    'mouth_left': 61,    # Left mouth corner
                    'mouth_right': 291,  # Right mouth corner
                    'left_ear': 234,     # Left ear
                    'right_ear': 454,    # Right ear
                    'chin': 152          # Chin
                }

                for name, idx in key_points.items():
                    landmark = face_landmarks.landmark[idx]
                    landmarks_dict[name] = [
                        int(landmark.x * width),
                        int(landmark.y * height)
                    ]

            # Crop face region
            face_region = image[y:y+h, x:x+w].copy()

            return {
                'face_found': True,
                'confidence': float(confidence),
                'bounding_box': {
                    'x': x,
                    'y': y,
                    'width': w,
                    'height': h
                },
                'landmarks': landmarks_dict,
                'face_region': face_region
            }

        except Exception as e:
            logger.error(f"Face detection error: {str(e)}", exc_info=True)
            return {
                'face_found': False,
                'reason': f'Detection error: {str(e)}',
                'confidence': 0.0
            }

    def validate_face_quality(self, face_data: Dict) -> Dict:
        """
        Validate detected face meets quality requirements

        Args:
            face_data: Output from detect_face()

        Returns:
            {
                'passed': bool,
                'reason': str (if failed),
                'confidence': float
            }
        """
        if not face_data.get('face_found', False):
            return {
                'passed': False,
                'reason': 'No face detected'
            }

        bbox = face_data['bounding_box']
        landmarks = face_data.get('landmarks', {})

        # Check 1: Minimum face size (80x80 pixels)
        if bbox['width'] < 80 or bbox['height'] < 80:
            return {
                'passed': False,
                'reason': f"Face too small ({bbox['width']}x{bbox['height']}), minimum 80x80 pixels required"
            }

        # Check 2: Face not too large (max 90% of image)
        # Prevents overly zoomed images
        image_width = bbox.get('image_width', bbox['width'])
        if bbox['width'] > 0.9 * image_width:
            return {
                'passed': False,
                'reason': 'Face too close to camera or overly zoomed'
            }

        # Check 3: Frontal pose (eye alignment check)
        if 'left_eye' in landmarks and 'right_eye' in landmarks:
            left_eye = np.array(landmarks['left_eye'])
            right_eye = np.array(landmarks['right_eye'])

            # Calculate eye alignment angle
            eye_vector = right_eye - left_eye
            angle = np.abs(np.degrees(np.arctan2(eye_vector[1], eye_vector[0])))

            # Allow up to 15 degrees tilt
            if angle > 15:
                return {
                    'passed': False,
                    'reason': f'Face not frontal (head tilt: {angle:.1f}°), maximum 15° allowed'
                }

        # Check 4: Both eyes visible
        if 'left_eye' not in landmarks or 'right_eye' not in landmarks:
            return {
                'passed': False,
                'reason': 'Both eyes must be clearly visible'
            }

        # All checks passed
        return {
            'passed': True,
            'confidence': face_data['confidence']
        }

    def crop_and_align_face(
        self,
        image: np.ndarray,
        face_data: Dict,
        output_size: Tuple[int, int] = (224, 224)
    ) -> np.ndarray:
        """
        Crop and align face for embedding extraction

        Alignment based on eye positions for consistent orientation.

        Args:
            image: Original image
            face_data: Output from detect_face()
            output_size: Desired output dimensions (width, height)

        Returns:
            Aligned and resized face image
        """
        if not face_data.get('face_found', False):
            raise ValueError("No face found in provided face_data")

        landmarks = face_data.get('landmarks', {})

        # If no landmarks, just crop and resize bounding box
        if 'left_eye' not in landmarks or 'right_eye' not in landmarks:
            bbox = face_data['bounding_box']
            face_crop = image[
                bbox['y']:bbox['y']+bbox['height'],
                bbox['x']:bbox['x']+bbox['width']
            ]
            return cv2.resize(face_crop, output_size, interpolation=cv2.INTER_CUBIC)

        # Align face based on eyes
        left_eye = np.array(landmarks['left_eye'], dtype=np.float32)
        right_eye = np.array(landmarks['right_eye'], dtype=np.float32)

        # Calculate angle between eyes
        eye_vector = right_eye - left_eye
        angle = np.degrees(np.arctan2(eye_vector[1], eye_vector[0]))

        # Calculate center point between eyes
        eye_center = ((left_eye + right_eye) / 2).astype(int)

        # Get rotation matrix
        rotation_matrix = cv2.getRotationMatrix2D(
            tuple(eye_center),
            angle,
            scale=1.0
        )

        # Rotate image to align eyes horizontally
        rotated = cv2.warpAffine(
            image,
            rotation_matrix,
            (image.shape[1], image.shape[0]),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_CONSTANT,
            borderValue=(0, 0, 0)
        )

        # Crop face region from rotated image
        bbox = face_data['bounding_box']
        face_crop = rotated[
            bbox['y']:bbox['y']+bbox['height'],
            bbox['x']:bbox['x']+bbox['width']
        ]

        # Resize to output size
        aligned_face = cv2.resize(
            face_crop,
            output_size,
            interpolation=cv2.INTER_CUBIC
        )

        return aligned_face

    def __del__(self):
        """Cleanup MediaPipe resources"""
        try:
            if hasattr(self, 'face_detection'):
                self.face_detection.close()
            if hasattr(self, 'face_mesh'):
                self.face_mesh.close()
        except:
            pass


# =============================================================================
# Usage Example
# =============================================================================

if __name__ == "__main__":
    # Example usage
    detector = FaceDetectionService()

    # Load test image
    image = cv2.imread('test_face.jpg')
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)

    # Detect face
    result = detector.detect_face(image_rgb)
    print(f"Face found: {result['face_found']}")
    print(f"Confidence: {result.get('confidence', 0):.2f}")

    if result['face_found']:
        # Validate quality
        quality = detector.validate_face_quality(result)
        print(f"Quality passed: {quality['passed']}")

        if quality['passed']:
            # Align face
            aligned = detector.crop_and_align_face(image_rgb, result)
            print(f"Aligned face shape: {aligned.shape}")

            # Save aligned face
            aligned_bgr = cv2.cvtColor(aligned, cv2.COLOR_RGB2BGR)
            cv2.imwrite('aligned_face.jpg', aligned_bgr)
