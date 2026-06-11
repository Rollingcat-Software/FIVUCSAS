# Biometrics & Liveness

The biometric decision is made **on the server** — the browser is untrusted. The full face
pipeline runs **CPU-only** on one commodity host, sub-second end-to-end.

## Face pipeline

```mermaid
flowchart LR
    A[/"Frame"/] --> D["Detect + align<br/>(MediaPipe 468 client · MTCNN server)"]
    D --> E["Embed<br/>FaceNet-512 (512-D)"]
    E --> V{"1:1 verify<br/>cosine ≥ threshold (0.45)"}
    E --> S{"1:N search<br/>pgvector cosine < 0.6"}
    V --> R[["accept / reject"]]
    S --> R
```

- Model/dimension must match: `Facenet512 → EMBEDDING_DIMENSION=512`. Changing the model
  invalidates all embeddings (re-enrollment required).
- Adaptive threshold for embeddings older than ~2 years (`VERIFICATION_THRESHOLD_AGED_*`).

## Voice

Resemblyzer 256-D centroid per user; verify by cosine **similarity ≥ 0.65**, search by
pgvector cosine **distance < 0.6** (these are two different operators — not a typo).

## NFC document (ICAO 9303)

The Android client (Kotlin Multiplatform, BouncyCastle) runs a custom reader: **BAC**, reads
**DG1 / DG2** (MRZ + chip photo), and verifies the signed document hash (**passive
authentication**). The chain is **fail-closed** — any check failing rejects.

## Hybrid liveness

Two mechanisms. **Passive** = single-frame MiniFASNet on `/verify` and `/liveness`.
**Active** = challenge/response that issues a short-lived signed liveness token on success.

### The Biometric Puzzle (active liveness)

At each verification the server draws **3–5 random actions from a 23-action library**
(14 face + 9 hand) with a per-attempt nonce; the client performs them while landmarks are
scored frame-by-frame under a strict temporal contract.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant C as Client (MediaPipe)
    participant A as Identity API
    participant P as Puzzle engine
    C->>A: begin challenge
    A->>P: GeneratePuzzle
    P-->>A: 3–5 of 23 actions + nonce + thresholds
    A-->>C: puzzle
    loop each action, in order, within TTL
        U->>C: perform (blink / smile / turn / gesture)
        C->>A: scored frames + timestamps
    end
    A->>P: VerifyPuzzle (anti-replay)
    alt all satisfied in order, in time
        P-->>A: PASS → signed liveness token (HS256, +300s)
    else
        P-->>A: FAIL → rejected
    end
```

Pre-recorded video, deepfake injection and replay all fail because the action set is
unpredictable and timestamped per attempt.

## Spoof-detector

A standalone session-based passive PAD (13 analyzers — texture, Moiré, screen-replay,
micro-tremor, rPPG, temporal, landmark-variance, and more) fuses per-frame scores into a
**peak-sensitive** session verdict (blends mean P(real) with the worst sliding window), so a
brief spoof flash can't be averaged away. Live demo: **amispoof.fivucsas.com**.

See the <a href="/diagrams.html" target="_blank" rel="noreferrer">Diagram Gallery</a> for enrollment, voice, NFC and spoof-verdict diagrams.
