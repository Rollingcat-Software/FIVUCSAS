# Changelog - Landing Website

## [2026-04-22] — v2 redesign (Opus refresh)

Zero functional change. Same build (`npm run build` → `dist/`), same
deploy target (Hostinger rsync to `fivucsas.com`), same `.htaccess` and
security headers. Team data, tech stack, service definitions, JSON-LD
blocks, OG tags, sitemap, robots — all preserved.

### Rewritten
- `src/App.tsx` — ground-up React rewrite with a custom inline SVG
  icon system, ten-methods auth grid, hosted-first architecture stack
  visual (Clients → Traefik → Services → Storage), trust-signals row
  (OIDC + RS256 default + AES-GCM-256 + KVKK / GDPR + partitioned audit
  logs + MFA rate-limits), refined service + stack + team sections.
  Command-line mock showing `FivucsasAuth.loginRedirect(...)`.
- `src/index.css` — new design-token layer: dark canvas with aurora
  gradient + optional noise overlay + gradient text helpers + custom
  scrollbar + reduced-motion respected.
- `tailwind.config.js` — extended palette (primary violet ramp, accent
  iris, cyan, trust emerald), Space Grotesk display font, JetBrains Mono
  accent, shadow tokens, keyframe animations (`pulse-slow`, `float`,
  `scan`, `shimmer`).
- `index.html` — expanded JSON-LD block (SoftwareApplication featureList
  covers all 10 auth methods), Space Grotesk + JetBrains Mono preconnect,
  proper color-scheme dark.

### Internationalization
- Working EN / TR toggle via `localStorage` + `navigator.language`
  first-load detection.
- All new copy has proper Turkish diacritics (ç, ğ, ı, ö, ş, ü).
  106 `tr:` strings audited for accuracy.

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
