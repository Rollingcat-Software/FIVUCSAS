# Changelog - Landing Website

## [2026-04-16] — Team section + scope refinement

### Added
- **All 3 team members** displayed in the "Project Team" section:
  Ahmet Abdullah Gültekin (Project Lead & Full-Stack Engineer),
  Ayşe Gülsüm Eren (Mobile & Biometric Puzzle Developer),
  Ayşenur Arıcı (Computer Vision & ML Research).
- Turkish diacritics restored (Ayşe, Ayşenur, Arıcı, Gültekin, Ağaoğlu).

### Changed
- Replaced the prior solo-lead + 3 generic role cards layout with a single
  3-card grid backed by a `teamMembers` array. Lead card uses the brand
  gradient accent; member cards use the slate-neutral treatment.
- Team scopes set to match actual ownership:
  - **Ahmet**: Architecture · Backend · Frontend · Face · Voice · MRZ · DevOps
  - **Ayşe Gülsüm**: Kotlin Multiplatform · Hand & Finger Tracking · Biometric Puzzles
  - **Ayşenur**: YOLO Card Detector · Liveness · Anti-Spoofing · Model Training

### Removed
- Unused `devRoles` constant (previously populated the replaced grid).
