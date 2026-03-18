# FIVUCSAS Client-Side ML Migration Report

**Date**: 2026-03-18
**Author**: AI Research Assistant
**Status**: Research Complete

---

## Executive Summary

This report analyzes which biometric processing operations in the FIVUCSAS platform can be moved from the server-side biometric-processor (Python/FastAPI, CPU-bound) to the client-side (browser). The goal is to reduce server load, improve latency, enhance privacy, and enable offline-capable biometric operations.

**Key finding**: 5 of 7 current server-side operations can be partially or fully moved to the browser using ONNX Runtime Web, TensorFlow.js, and MediaPipe. The remaining operations (final verification decisions, embedding storage) MUST stay server-side for security.

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Face Embedding in Browser](#2-face-embedding-in-browser)
3. [Card Detection in Browser](#3-card-detection-in-browser)
4. [Liveness Detection in Browser](#4-liveness-detection-in-browser)
5. [Voice Processing in Browser](#5-voice-processing-in-browser)
6. [Quality Assessment in Browser](#6-quality-assessment-in-browser)
7. [Performance Optimization](#7-performance-optimization)
8. [Security Considerations](#8-security-considerations)
9. [Implementation Priority](#9-implementation-priority)
10. [Architecture Diagram](#10-proposed-architecture)

---

## 1. Current Architecture

### Server-Side Operations (biometric-processor, CPU)

| Operation | Model/Library | Latency | CPU Load |
|-----------|--------------|---------|----------|
| Face detection | OpenCV/MediaPipe | 100-300ms | Medium |
| Face embedding | DeepFace/Facenet512 | 1-2s | High |
| Face quality assessment | OpenCV (Laplacian, brightness) | 50-100ms | Low |
| Liveness detection | Texture analysis + MediaPipe | 200-500ms | Medium |
| Card type detection | YOLOv8n | Fails on CPU | Very High |
| Voice embedding | Resemblyzer (GE2E) | 490-585ms | Medium |
| Voice preprocessing | pydub/ffmpeg (WebM to WAV) | 100-300ms | Low |

### Already Client-Side

| Operation | Library | Status |
|-----------|---------|--------|
| Face detection | @mediapipe/tasks-vision | Done (web-app) |

---

## 2. Face Embedding in Browser

### Current Server-Side Implementation
- **Model**: DeepFace with Facenet512 backend
- **Output**: 512-dimensional float32 embedding
- **Latency**: 1-2 seconds on CPU
- **File**: `biometric-processor/app/infrastructure/ml/extractors/deepface_extractor.py`

### Proposed Client-Side Approach

#### Option A: ONNX Runtime Web + MobileFaceNet (RECOMMENDED)

**MobileFaceNet** is the best candidate for browser-based face embedding:
- **Model size**: ~5MB (ONNX format), ~2MB quantized (INT8)
- **Embedding dimension**: 128-dim or 256-dim
- **Input**: 112x112 RGB face crop
- **Inference time**: 30-80ms (WebGL), 15-40ms (WebGPU), 100-200ms (WASM)
- **Accuracy**: 99.28% on LFW (comparable to server-side for verification)

```
npm install onnxruntime-web
```

**ONNX Runtime Web** supports three backends:
- **WebGPU** (fastest, Chrome 113+): GPU-accelerated, near-native performance
- **WebGL** (widest support): GPU-accelerated, most browsers
- **WASM** (universal fallback): CPU-based, all browsers

**Implementation approach**:
1. Export MobileFaceNet to ONNX: `torch.onnx.export(model, dummy_input, "mobilefacenet.onnx")`
2. Optionally quantize to INT8: `python -m onnxruntime.quantization.quantize ...`
3. Load in browser via `ort.InferenceSession.create('mobilefacenet.onnx')`
4. Preprocess face crop (resize 112x112, normalize) from MediaPipe detection
5. Run inference, get 128/256-dim embedding vector
6. Send embedding (not image) to server for storage/matching

**Model sources**:
- InsightFace model zoo: pre-trained MobileFaceNet ONNX models
- ONNX Model Zoo: face verification models
- HuggingFace: search "mobilefacenet onnx"

#### Option B: TensorFlow.js + FaceMesh Embedding

**@vladmandic/human** library provides an all-in-one solution:
- **Face description model**: Built-in face embedding extraction
- **Model size**: ~8MB total for face detection + description
- **Embedding dimension**: 1024-dim (high accuracy)
- **Inference time**: 50-150ms per face
- **Backends**: WebGPU, WebGL, WASM, CPU
- **Includes**: Age, gender, emotion prediction as bonus

```
npm install @vladmandic/human
```

#### Option C: Custom ArcFace ONNX

- **Model**: ArcFace-R50 or ArcFace-R18 exported to ONNX
- **Size**: R18 = ~90MB, R50 = ~170MB (too large for browser without quantization)
- **R18 INT8 quantized**: ~25MB (feasible but borderline)
- **Embedding**: 512-dim (matches current Facenet512)
- **Not recommended** due to model size

#### Compatibility Note

If migrating from Facenet512 (512-dim) to MobileFaceNet (128-dim), existing server-side embeddings cannot be directly compared. Options:
1. **Re-enroll all users** with new model (clean break)
2. **Run both models in parallel** during transition
3. **Use 512-dim browser model** (ArcFace-R18, larger but compatible dimension)

### Recommendation

Use **MobileFaceNet via ONNX Runtime Web** (Option A):
- Best size/accuracy/speed tradeoff
- 5MB model, 30-80ms inference
- Well-tested in production by InsightFace community
- Send only the embedding vector to server (not the face image) -- better privacy

---

## 3. Card Detection in Browser

### Current Server-Side Implementation
- **Model**: YOLOv8n (custom trained for Turkish ID cards)
- **Status**: FAILS on CPU (requires GPU)
- **File**: `biometric-processor/yolov8n.pt`

### Proposed Client-Side Approach

#### Option A: YOLO ONNX in Browser (RECOMMENDED)

YOLOv8n can be exported to ONNX and run in browser:

```bash
# Export YOLOv8n to ONNX (on development machine with GPU)
yolo export model=yolov8n.pt format=onnx imgsz=640
```

- **Model size**: ~13MB (ONNX FP32), ~4MB (INT8 quantized)
- **Input**: 640x640 RGB image
- **Inference time**: 50-150ms (WebGPU), 100-300ms (WebGL), 500ms+ (WASM)
- **Detection classes**: Custom classes for Turkish ID card types

**Implementation**:
1. Export the custom-trained `yolov8n.pt` to ONNX format
2. Quantize to INT8 for smaller size
3. Load with ONNX Runtime Web
4. Run detection on camera frames
5. Apply NMS (Non-Maximum Suppression) in JavaScript
6. Return detected card type and bounding box

#### Option B: MediaPipe Object Detection

- **Model**: MediaPipe Object Detector with custom model
- **Limitation**: Would need to retrain on MediaPipe's format (TFLite)
- **Advantage**: Already using MediaPipe for face detection
- **Not recommended** for custom card detection (retraining effort)

#### Option C: TensorFlow.js COCO-SSD + Fine-tuning

- **Model**: Pre-trained COCO-SSD, fine-tuned for card detection
- **Size**: ~6MB
- **Limitation**: Requires retraining in TF format
- **Not recommended** (custom YOLO already trained)

### Recommendation

**Export existing YOLOv8n to ONNX** (Option A). This solves two problems:
1. Card detection currently fails on CPU server
2. Browser GPU (WebGPU/WebGL) is better suited for this task
3. No retraining needed -- same model, different runtime

---

## 4. Liveness Detection in Browser

### Current Server-Side Implementation
- **Passive**: TextureLivenessDetector (Laplacian texture, color histogram, frequency analysis)
- **Active**: ActiveLivenessDetector (eye aspect ratio, mouth aspect ratio via MediaPipe)
- **Combined**: CombinedLivenessDetector (weighted 40% texture + 60% active)
- **Puzzle**: Returns score:0 (not implemented)
- **Files**: `biometric-processor/app/infrastructure/ml/liveness/`

### Proposed Client-Side Approach

#### Option A: MediaPipe Face Mesh Blendshapes (RECOMMENDED for Active)

MediaPipe Face Landmarker with blendshapes can detect:
- **Blink detection**: `eyeBlinkLeft`, `eyeBlinkRight` blendshape coefficients
- **Smile detection**: `mouthSmileLeft`, `mouthSmileRight`
- **Head rotation**: Roll, pitch, yaw from face transformation matrix
- **Mouth open**: `jawOpen` blendshape

Already partially available via `@mediapipe/tasks-vision` (already in web-app dependencies).

- **Model size**: Included in existing MediaPipe face landmarker (~5MB)
- **Inference time**: 10-30ms per frame (included in face detection pass)
- **Accuracy**: Excellent for active challenges (blink, smile, head turn)

#### Option B: vladmandic/human Anti-Spoofing

The `@vladmandic/human` library includes:
- **Anti-spoofing model**: Detects printed photos and screen replay attacks
- **Liveness score**: 0-1 confidence
- **Model size**: ~2MB additional
- **Inference time**: 20-50ms

#### Option C: Canvas-Based Texture Analysis (RECOMMENDED for Passive)

Port the existing Python texture analysis to JavaScript:
- **Blur detection**: Apply Laplacian kernel on canvas ImageData
- **Color analysis**: Histogram analysis on canvas pixels
- **Frequency analysis**: FFT on face region (computationally expensive but feasible)
- **No ML model needed**: Pure image processing
- **Implementation**: ~200 lines of JavaScript

```typescript
// Laplacian variance for blur detection
function detectBlur(imageData: ImageData): number {
  const gray = toGrayscale(imageData);
  const laplacian = applyLaplacianKernel(gray);
  return variance(laplacian);
}
```

#### Option D: Challenge-Response Liveness (RECOMMENDED for Puzzles)

Instead of ML-based liveness, use interactive challenges:
- "Turn your head left" -- verify via MediaPipe head pose
- "Blink twice" -- verify via blendshape coefficients
- "Smile" -- verify via mouth blendshapes
- "Follow the dot" -- verify via gaze tracking

This is more robust than passive analysis and runs entirely client-side.

### Recommendation

**Combine Options A + C + D**:
1. Use MediaPipe blendshapes for active liveness (blink, smile, head turn)
2. Port texture analysis to canvas for passive checks
3. Implement challenge-response puzzles using MediaPipe head pose/gaze
4. Send liveness score + challenge results to server for final decision

---

## 5. Voice Processing in Browser

### Current Server-Side Implementation
- **Model**: Resemblyzer (GE2E, pretrained on LibriSpeech + VoxCeleb)
- **Output**: 256-dimensional speaker embedding
- **Preprocessing**: WebM to WAV conversion via pydub/ffmpeg, VAD
- **Latency**: 490-585ms total
- **File**: `biometric-processor/app/infrastructure/ml/voice/speaker_embedder.py`

### Proposed Client-Side Approach

#### Audio Preprocessing in Browser (EASY WIN)

The browser can handle audio preprocessing natively:
- **MediaRecorder API**: Record audio directly as WAV (avoid WebM encoding)
- **AudioContext + AudioWorklet**: Real-time audio processing
- **Web Audio API**: Resampling to 16kHz, mono conversion
- **VAD**: WebRTC VAD or simple energy-based detection

```typescript
// Record as WAV directly
const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/wav' });

// Or process with AudioContext
const audioCtx = new AudioContext({ sampleRate: 16000 });
const source = audioCtx.createMediaStreamSource(stream);
```

This eliminates the server-side WebM-to-WAV conversion (saves 100-300ms).

#### Voice Embedding in Browser

##### Option A: ECAPA-TDNN ONNX (RECOMMENDED)

ECAPA-TDNN is a modern speaker verification model:
- **Model size**: ~25MB (ONNX), ~8MB (INT8 quantized)
- **Embedding**: 192-dim or 256-dim
- **Inference time**: 100-300ms (WebGL), 50-150ms (WebGPU)
- **Accuracy**: Superior to Resemblyzer (state-of-the-art on VoxCeleb)
- **ONNX export**: Available from SpeechBrain or pyannote-audio

##### Option B: Resemblyzer ONNX Export

The Resemblyzer GE2E encoder can be exported to ONNX:
- **Model size**: ~50MB (too large for browser)
- **Architecture**: 3-layer LSTM (not well-suited for ONNX Web optimization)
- **Not recommended** due to size and LSTM performance on WebGL

##### Option C: WebAssembly Audio Processing Only

- Keep embedding extraction server-side
- Do only preprocessing (WAV conversion, VAD, normalization) in browser
- Send clean 16kHz WAV to server
- **Saves**: 100-300ms preprocessing time on server
- **Easiest to implement**

### Recommendation

**Phase 1**: Implement **Option C** (browser audio preprocessing) -- easy win, saves 100-300ms.
**Phase 2**: Implement **Option A** (ECAPA-TDNN ONNX) -- full client-side voice embedding.

---

## 6. Quality Assessment in Browser

### Current Server-Side Implementation
- **Blur**: Laplacian variance (OpenCV)
- **Lighting**: Mean brightness of grayscale image
- **Face size**: Min dimension check from face crop
- **Weights**: 40% blur + 30% lighting + 30% size
- **File**: `biometric-processor/app/infrastructure/ml/quality/quality_assessor.py`

### Proposed Client-Side Approach (FULLY FEASIBLE)

All quality metrics can be computed client-side using Canvas API:

#### Blur Detection (Canvas + JavaScript)

```typescript
function detectBlur(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const gray = toGrayscale(imageData);

  // Laplacian kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
  const laplacian = convolve2D(gray, canvas.width, canvas.height,
    [0, 1, 0, 1, -4, 1, 0, 1, 0]);

  return variance(laplacian); // Higher = sharper
}
```

#### Lighting Assessment

```typescript
function assessLighting(imageData: ImageData): number {
  let sum = 0;
  for (let i = 0; i < imageData.data.length; i += 4) {
    // Grayscale approximation
    sum += 0.299 * imageData.data[i] + 0.587 * imageData.data[i+1] + 0.114 * imageData.data[i+2];
  }
  return sum / (imageData.data.length / 4); // Mean brightness
}
```

#### Face Size Check

Already available from MediaPipe face detection bounding box:
```typescript
const faceSize = Math.min(
  detection.boundingBox.width,
  detection.boundingBox.height
);
```

### Implementation

- **No ML model needed**: Pure image processing on Canvas ImageData
- **Latency**: <5ms per frame (negligible)
- **Accuracy**: Identical to server-side (same algorithms)
- **Lines of code**: ~150 TypeScript

### Recommendation

**Move entirely to client-side**. This is the easiest win:
- Same algorithms, same thresholds
- Instant feedback to user (no network round-trip)
- Can run on every frame for real-time quality indicators
- Show user "too dark", "too blurry", "move closer" overlays

---

## 7. Performance Optimization

### Backend Comparison (2025-2026)

| Backend | Speed | Browser Support | GPU Required | Best For |
|---------|-------|----------------|-------------|----------|
| WebGPU | Fastest (1x) | Chrome 113+, Edge 113+ | Yes | Large models, batch |
| WebGL | Fast (2-3x slower) | All modern browsers | Yes | Wide compatibility |
| WASM (SIMD) | Medium (5-10x slower) | All browsers | No | CPU fallback |
| WASM (no SIMD) | Slow (10-20x slower) | Older browsers | No | Legacy support |

### Model Quantization

| Precision | Size Reduction | Speed Gain | Accuracy Loss |
|-----------|---------------|------------|---------------|
| FP32 (default) | 1x | 1x | 0% |
| FP16 | 0.5x | 1.5-2x | <0.1% |
| INT8 | 0.25x | 2-4x | 0.5-1% |
| INT4 (experimental) | 0.125x | 4-8x | 2-5% |

**Recommendation**: Use **INT8 quantization** for all browser models. The accuracy loss is negligible for biometric verification, and the size/speed gains are substantial.

### Progressive Model Loading

```typescript
// Load models in priority order
async function initModels() {
  // 1. Quality assessment (no model needed, instant)
  initQualityAssessor();

  // 2. Face detection (already loaded via MediaPipe, ~5MB)
  // Already done

  // 3. Face embedding (~5MB MobileFaceNet)
  const embeddingSession = await ort.InferenceSession.create(
    '/models/mobilefacenet_int8.onnx',
    { executionProviders: ['webgpu', 'webgl', 'wasm'] }
  );

  // 4. Card detection (~4MB YOLO INT8) - load on demand
  // Loaded only when card scan page is visited

  // 5. Voice embedding (~8MB ECAPA-TDNN INT8) - load on demand
  // Loaded only when voice enrollment is initiated
}
```

### Web Workers for Non-Blocking Inference

```typescript
// ml-worker.ts
self.onmessage = async (e) => {
  const { type, imageData } = e.data;

  switch (type) {
    case 'face-embedding':
      const embedding = await extractEmbedding(imageData);
      self.postMessage({ type: 'embedding-result', embedding });
      break;
    case 'quality-check':
      const quality = assessQuality(imageData);
      self.postMessage({ type: 'quality-result', quality });
      break;
  }
};
```

### SharedArrayBuffer for Parallel Processing

If `Cross-Origin-Isolation` headers are set:
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Then `SharedArrayBuffer` enables:
- Zero-copy data sharing between main thread and workers
- Parallel processing of multiple frames
- ~30% performance improvement for batch operations

### Best Practices

1. **Lazy load models**: Only load when the specific feature is needed
2. **Cache models**: Use IndexedDB or Cache API to avoid re-downloading
3. **Fallback chain**: WebGPU -> WebGL -> WASM (automatic via ONNX Runtime Web)
4. **Warmup inference**: Run a dummy inference after loading to JIT-compile shaders
5. **Frame skipping**: Process every 2nd or 3rd frame for real-time video
6. **OffscreenCanvas**: Use in Web Workers for GPU-accelerated preprocessing
7. **Model splitting**: Split large models into smaller parts for progressive loading

---

## 8. Security Considerations

### MUST Stay Server-Side

| Operation | Reason |
|-----------|--------|
| Embedding storage & matching | Embeddings are biometric data -- must be protected |
| Final verification decision | Client can be tampered with -- server makes trust decisions |
| Enrollment approval | Server validates quality + liveness before storing |
| Cosine similarity threshold | Client should not control match thresholds |
| Audit logging | Tamper-proof audit trail on server |
| Rate limiting | Prevent brute-force attacks |
| Anti-replay protection | Ensure embeddings are fresh (timestamp + nonce) |

### Can Move to Client-Side

| Operation | Security Risk | Mitigation |
|-----------|--------------|------------|
| Face embedding extraction | Low -- embedding sent to server | Sign embedding with session token |
| Quality assessment | None -- informational only | Server re-validates if needed |
| Liveness detection | Medium -- client can fake | Server does secondary check |
| Card detection | Low -- just identifies card type | Server validates extracted data |
| Voice preprocessing | None -- audio format conversion | N/A |

### Proposed Security Architecture

```
Client (Browser)                          Server (biometric-processor)
-----------------                         ----------------------------
1. Capture face frame
2. Run MediaPipe face detection
3. Assess quality (blur/light/size)
4. Run liveness challenge
5. Extract face embedding (ONNX)
6. Sign: {embedding, liveness_score,
   quality_score, timestamp, nonce}

   ------- HTTPS POST ------->           7. Validate session token
                                          8. Verify timestamp freshness (<30s)
                                          9. Verify nonce uniqueness
                                          10. (Optional) Re-validate quality
                                          11. Store/match embedding
                                          12. Return match result
```

### Key Principle

**The client computes, the server decides.** Client-side ML is for UX improvement (faster feedback, less bandwidth), not for security decisions. All security-critical decisions remain server-side.

---

## 9. Implementation Priority

### Phase 1: Quick Wins (1-2 weeks)

| Task | Effort | Impact | Risk |
|------|--------|--------|------|
| Quality assessment in browser | 2 days | High | None |
| Voice audio preprocessing in browser | 2 days | Medium | None |
| Real-time quality feedback UI | 3 days | High | None |

**Total model download**: 0 bytes (no ML models needed)

### Phase 2: Core Migration (2-3 weeks)

| Task | Effort | Impact | Risk |
|------|--------|--------|------|
| Face embedding via MobileFaceNet ONNX | 5 days | Very High | Medium |
| Liveness via MediaPipe blendshapes | 3 days | High | Low |
| Challenge-response liveness puzzles | 3 days | High | Low |
| Server-side verification endpoint update | 3 days | High | Low |

**Total model download**: ~5MB (MobileFaceNet INT8)

### Phase 3: Advanced Features (2-3 weeks)

| Task | Effort | Impact | Risk |
|------|--------|--------|------|
| Card detection via YOLO ONNX | 5 days | Very High | Medium |
| Voice embedding via ECAPA-TDNN ONNX | 5 days | High | Medium |
| WebGPU optimization | 3 days | Medium | Low |
| Model caching + progressive loading | 2 days | Medium | None |

**Total model download**: ~12MB (YOLO INT8 + ECAPA-TDNN INT8)

### Phase 4: Polish (1 week)

| Task | Effort | Impact | Risk |
|------|--------|--------|------|
| Web Worker parallelization | 2 days | Medium | Low |
| SharedArrayBuffer optimization | 1 day | Low | Medium |
| Fallback chain testing | 2 days | Medium | None |
| Cross-browser compatibility | 2 days | High | Low |

---

## 10. Proposed Architecture

```
+------------------------------------------------------------------+
|                        BROWSER (Client)                          |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  | MediaPipe        |  | ONNX Runtime Web |  | Canvas API     |  |
|  | Face Detection   |  | (WebGPU/WebGL/   |  | Quality Check  |  |
|  | Face Landmarks   |  |  WASM)           |  | Blur Detection |  |
|  | Blendshapes      |  |                  |  | Light Check    |  |
|  | (5MB, loaded)    |  | MobileFaceNet    |  | Size Check     |  |
|  +--------+---------+  | (5MB INT8)       |  | (<1KB code)    |  |
|           |             |                  |  +-------+--------+  |
|           |             | YOLOv8n-card     |          |           |
|           |             | (4MB INT8)       |          |           |
|           |             |                  |          |           |
|           |             | ECAPA-TDNN       |          |           |
|           |             | (8MB INT8)       |          |           |
|           |             +--------+---------+          |           |
|           |                      |                    |           |
|  +--------v----------------------v--------------------v--------+  |
|  |                    ML Pipeline Orchestrator                 |  |
|  |  1. Quality gate (must pass before proceeding)              |  |
|  |  2. Liveness challenge (blendshapes + head pose)            |  |
|  |  3. Embedding extraction (face or voice)                    |  |
|  |  4. Card detection (on demand)                              |  |
|  +------------------------------+-----------------------------+  |
|                                 |                                |
|                    Signed payload: {                              |
|                      embedding: Float32Array,                    |
|                      quality_score: number,                      |
|                      liveness_score: number,                     |
|                      liveness_challenges: string[],              |
|                      timestamp: ISO8601,                         |
|                      nonce: string                               |
|                    }                                             |
+-------------------------------+---------------------------------+
                                |
                          HTTPS POST
                          (~2KB payload
                           vs ~500KB image)
                                |
+-------------------------------v---------------------------------+
|                        SERVER (biometric-processor)              |
|                                                                  |
|  +------------------+  +------------------+  +----------------+  |
|  | Auth Validation   |  | Embedding Store  |  | Audit Logger   |  |
|  | - Session token   |  | - pgvector       |  | - All events   |  |
|  | - Timestamp check |  | - Cosine search  |  | - Tamper-proof |  |
|  | - Nonce verify    |  | - HNSW index     |  +----------------+  |
|  | - Rate limit      |  +--------+---------+                     |
|  +--------+---------+           |                                |
|           |                     |                                |
|  +--------v---------------------v-----------------------------+  |
|  |              Verification Decision Engine                  |  |
|  |  - Compare embedding against enrolled                      |  |
|  |  - Apply threshold (e.g., cosine > 0.65)                   |  |
|  |  - Validate liveness score > minimum                       |  |
|  |  - Return: MATCH / NO_MATCH / RETRY                        |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
```

### Data Flow Comparison

| Metric | Current (Server-Side) | Proposed (Client-Side) |
|--------|----------------------|----------------------|
| Payload size | ~500KB (JPEG image) | ~2KB (embedding + metadata) |
| Server CPU time | 2-4s per request | <50ms per request |
| Total latency | 3-5s (upload + process + response) | 0.5-1s (process locally + send embedding) |
| Privacy | Face image sent to server | Only embedding sent (non-reversible) |
| Offline capable | No | Partial (detection + quality) |
| Server cost | High (CPU-intensive ML) | Low (only matching + storage) |

---

## Appendix A: NPM Packages Summary

| Package | Version | Size | Purpose |
|---------|---------|------|---------|
| `onnxruntime-web` | 1.20.x | ~8MB | ONNX model inference in browser |
| `@mediapipe/tasks-vision` | 0.10.x | ~5MB | Face detection, landmarks, blendshapes |
| `@vladmandic/human` | 3.3.x | ~15MB | All-in-one face analysis (alternative) |

### Model Files to Host

| Model | Format | FP32 Size | INT8 Size | Purpose |
|-------|--------|-----------|-----------|---------|
| MobileFaceNet | ONNX | ~5MB | ~2MB | Face embedding (128-dim) |
| YOLOv8n-card | ONNX | ~13MB | ~4MB | Card type detection |
| ECAPA-TDNN | ONNX | ~25MB | ~8MB | Voice embedding (256-dim) |
| **Total** | | **~43MB** | **~14MB** | |

---

## Appendix B: Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| WebGPU | 113+ | Behind flag | 18.2+ | 113+ |
| WebGL 2.0 | 56+ | 51+ | 15+ | 79+ |
| WASM SIMD | 91+ | 89+ | 16.4+ | 91+ |
| Web Workers | All | All | All | All |
| SharedArrayBuffer | 92+ | 79+ | 15.2+ | 92+ |
| MediaRecorder | 47+ | 29+ | 14.1+ | 79+ |
| AudioContext | 35+ | 25+ | 14.1+ | 79+ |

---

## Appendix C: Migration Checklist

- [ ] **Phase 1.1**: Implement `QualityAssessor.ts` with Laplacian blur detection
- [ ] **Phase 1.2**: Implement `LightingAssessor.ts` with mean brightness
- [ ] **Phase 1.3**: Implement `AudioPreprocessor.ts` with Web Audio API (16kHz mono WAV)
- [ ] **Phase 1.4**: Add real-time quality overlay to face capture UI
- [ ] **Phase 2.1**: Export MobileFaceNet to ONNX and quantize to INT8
- [ ] **Phase 2.2**: Implement `FaceEmbedder.ts` with ONNX Runtime Web
- [ ] **Phase 2.3**: Implement `LivenessDetector.ts` with MediaPipe blendshapes
- [ ] **Phase 2.4**: Implement `ChallengeManager.ts` for liveness puzzles
- [ ] **Phase 2.5**: Update server API to accept embeddings instead of images
- [ ] **Phase 3.1**: Export YOLOv8n-card to ONNX and quantize
- [ ] **Phase 3.2**: Implement `CardDetector.ts` with ONNX Runtime Web
- [ ] **Phase 3.3**: Export ECAPA-TDNN to ONNX and quantize
- [ ] **Phase 3.4**: Implement `VoiceEmbedder.ts` with ONNX Runtime Web
- [ ] **Phase 3.5**: Add model caching via IndexedDB
- [ ] **Phase 4.1**: Move inference to Web Workers
- [ ] **Phase 4.2**: Add WebGPU detection and fallback chain
- [ ] **Phase 4.3**: Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] **Phase 4.4**: Performance benchmarking and optimization

---

## Appendix D: Key Takeaways

1. **Quality assessment is the easiest win** -- pure JS, no models, instant feedback
2. **Face embedding is the highest-impact migration** -- eliminates 1-2s server latency and ~500KB uploads
3. **Card detection MUST move to client** -- it currently fails on CPU server
4. **Voice preprocessing is a quick win** -- Web Audio API handles WAV conversion natively
5. **Security decisions stay server-side** -- client computes, server decides
6. **Total client-side model payload: ~14MB (INT8)** -- acceptable for a biometric platform
7. **WebGPU is the future** -- 5-10x faster than WebGL for ML, but WebGL is the safe fallback
8. **INT8 quantization is essential** -- 4x smaller models with negligible accuracy loss
