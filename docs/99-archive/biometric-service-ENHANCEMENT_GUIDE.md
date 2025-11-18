# Biometric Service API Documentation Enhancement Guide

The biometric service (FastAPI) already auto-generates documentation. This guide shows how to enhance it with better descriptions.

## Current State

The biometric service already provides:
- **Interactive Docs:** http://localhost:8001/docs (FastAPI automatic)
- **ReDoc:** http://localhost:8001/redoc
- **OpenAPI JSON:** http://localhost:8001/openapi.json

## Enhancement: Better Descriptions

**File:** `biometric-processor/app/main.py`

Enhance the FastAPI app configuration:

```python
from fastapi import FastAPI

app = FastAPI(
    title="FIVUCSAS Biometric Processor",
    description="""
# Face Recognition and Liveness Detection Service

Microservice for biometric processing using deep learning face recognition.

## Features

* **Face Embedding Extraction** - Extract 512-dimensional face embeddings using VGG-Face model
* **Face Similarity Verification** - Compare face embeddings using cosine similarity
* **Liveness Detection** - Biometric Puzzle algorithm (planned)
* **Quality Checks** - Automatic face quality assessment

## Models

* **DeepFace** with VGG-Face backend
* **512-dimensional** face embeddings
* **Cosine similarity** threshold: 0.30 (lower is better match)

## Performance

* Enrollment: ~2-3 seconds per image
* Verification: ~1-2 seconds per comparison
* Supports JPG, PNG image formats
* Maximum file size: 10MB

## Error Handling

All endpoints return standard HTTP status codes:
* 200: Success
* 400: Invalid image or no face detected
* 413: File too large
* 500: Internal server error

## Usage Example

```python
import requests

# Enroll face
with open('face.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8001/api/v1/face/enroll',
        files={'image': f}
    )
embedding = response.json()['embedding']

# Verify face
with open('verify.jpg', 'rb') as f:
    response = requests.post(
        'http://localhost:8001/api/v1/face/verify',
        json={
            'stored_embedding': embedding,
            'current_image': 'base64_encoded_image'
        }
    )
is_match = response.json()['verified']
```
    """,
    version="1.0.0",
    contact={
        "name": "FIVUCSAS Team",
        "email": "contact@fivucsas.com",
        "url": "https://github.com/Rollingcat-Software/FIVUCSAS",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
)
```

## Enhance Endpoint Documentation

**File:** `biometric-processor/app/api/endpoints/face.py`

```python
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.schemas import EnrollResponse, VerifyRequest, VerifyResponse

router = APIRouter()

@router.post(
    "/enroll",
    response_model=EnrollResponse,
    summary="Enroll face biometric",
    description="""
Extracts a 512-dimensional face embedding from the provided image using VGG-Face model.

## Process

1. Upload face image (JPG/PNG, max 10MB)
2. Detect face using OpenCV cascade classifier
3. Extract face embedding using DeepFace (VGG-Face model)
4. Return 512-dimensional embedding vector

## Requirements

* **Image Quality**: Clear, frontal face photo
* **Lighting**: Good, even lighting (no shadows)
* **Face Coverage**: No glasses, masks, or obstructions for best results
* **Single Face**: Only one face should be visible in the image
* **Resolution**: Minimum 200x200 pixels recommended

## Returns

* `embedding`: 512-dimensional float array
* `embedding_id`: Unique identifier for this embedding
* `model`: Model used for extraction (VGG-Face)
* `confidence`: Quality score (0.0-1.0, higher is better)

## Use Cases

* Initial user enrollment
* Re-enrollment after multiple failed verifications
* Updating biometric template

## Error Scenarios

* **400**: No face detected, multiple faces, or poor image quality
* **413**: File size exceeds 10MB limit
* **500**: Model loading error or processing failure
    """,
    responses={
        200: {
            "description": "Face embedding extracted successfully",
            "content": {
                "application/json": {
                    "example": {
                        "embedding": [0.123, -0.456, ...],
                        "embedding_id": "emb_abc123",
                        "model": "VGG-Face",
                        "confidence": 0.95
                    }
                }
            }
        },
        400: {"description": "Invalid image, no face detected, or poor quality"},
        413: {"description": "Image file too large (max 10MB)"},
        500: {"description": "Internal processing error"},
    },
    tags=["Face Recognition"]
)
async def enroll_face(
    image: UploadFile = File(
        ...,
        description="Face image file (JPG/PNG format, max 10MB)"
    )
):
    # Implementation
    pass


@router.post(
    "/verify",
    response_model=VerifyResponse,
    summary="Verify face biometric",
    description="""
Verifies a face by comparing against a stored face embedding using cosine similarity.

## Process

1. Extract embedding from verification image
2. Compare with stored enrollment embedding
3. Calculate cosine distance (0.0 = identical, 1.0 = completely different)
4. Apply threshold (0.30) to determine match

## Algorithm

Uses **cosine similarity** for comparison:
* Distance = 1 - cosine_similarity(emb1, emb2)
* Match if distance < 0.30 (configurable threshold)

## Returns

* `verified`: Boolean indicating if faces match
* `confidence`: Similarity score (0.0-1.0, higher is better)
* `distance`: Cosine distance (0.0-1.0, lower is better)
* `threshold`: Current verification threshold

## Interpretation

* **distance < 0.20**: Very high confidence match
* **distance 0.20-0.30**: Good match (verified)
* **distance 0.30-0.40**: Uncertain (not verified, may need re-enrollment)
* **distance > 0.40**: No match

## Use Cases

* Access control systems
* Kiosk authentication
* Mobile app login
* Attendance tracking

## Error Scenarios

* **400**: No face detected in verification image
* **404**: User not found or not enrolled
* **500**: Comparison error
    """,
    responses={
        200: {
            "description": "Verification completed (check 'verified' field for result)",
            "content": {
                "application/json": {
                    "example": {
                        "verified": True,
                        "confidence": 0.87,
                        "distance": 0.13,
                        "threshold": 0.30,
                        "timestamp": "2025-11-17T10:30:00Z"
                    }
                }
            }
        },
        400: {"description": "Invalid image or no face detected"},
        404: {"description": "User not found or not enrolled"},
        500: {"description": "Verification processing error"},
    },
    tags=["Face Recognition"]
)
async def verify_face(request: VerifyRequest):
    # Implementation
    pass
```

## Test Enhanced Documentation

```bash
cd biometric-processor
./venv/Scripts/activate
uvicorn app.main:app --reload --port 8001
```

**Access:**
- FastAPI Docs: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

**Verification:**
- [ ] Enhanced descriptions appear
- [ ] Examples are helpful
- [ ] Error scenarios documented
- [ ] Use cases clear

## Benefits

✅ **Already auto-generated** - FastAPI handles this automatically
✅ **Interactive testing** - Try endpoints directly from docs
✅ **Multiple views** - FastAPI Docs (Swagger-like) and ReDoc
✅ **Automatic validation** - Pydantic models ensure accuracy

---

**Estimated Time:** 30-60 minutes
**Maintenance:** Minimal (update when endpoints change)
**Value:** High (clear API documentation for integration)
