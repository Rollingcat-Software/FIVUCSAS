# Analysis 2026-05-02 — User domain bifurcation + JWT_SECRET rotation

Two operator decisions raised in conversation. Both have a "correct" professional answer that is neither of the binary options the QUALITY_REVIEW + SECURITY_REVIEW presented.

---

## 1. Bifurcated `User` domain (P0-Q2)

### What's actually in the codebase

Two files, both alive in prod:

| File | Lines | Role | Imports |
|---|---|---|---|
| `domain/model/user/User.java` | 610 | Pure domain model — value objects, rich behaviour, no JPA / no Spring. | 6 sites. |
| `entity/User.java` | 817 | JPA persistence model — `@Entity`, `@FilterDef`, lifecycle hooks. | 123 sites. |

A real bridge already exists:
- `domain/repository/UserDomainRepository` (port)
- `infrastructure/adapter/UserDomainRepositoryAdapter` (adapter, real code)
- `infrastructure/persistence/mapper/UserMapper` (entity ↔ domain conversion)

So the pure-domain is **not dead** — it's reached via `UserDomainRepository` from 6 services (notably `GetCurrentUserService`). It's also **not dominant** — 95 % of the codebase still touches `entity/User` directly.

The QUALITY_REVIEW described this as "aspirational, NOT used in prod". That framing was inaccurate.

### Why both options the review offered are wrong

- **Delete the pure-domain file.** Throws away ~610 LOC of carefully-designed domain logic + the adapter chain that already works. After deletion, the codebase becomes anemic-only with no path back to a clean hexagonal structure.
- **"Annotate as design doc and stop migrating."** Treats the domain as a museum piece. Future work has no incentive to converge.

### Recommended: gradual hexagonal migration with an enforced lint

1. Add a one-line note at the top of `domain/model/user/User.java`:
   ```java
   /**
    * Hexagonal target model. New application/service code MUST use this
    * via UserDomainRepository. entity/User remains the live persistence
    * adapter until the migration is complete (see ARCHITECTURE.md).
    */
   ```

2. Add an ArchUnit test that **forbids new** `import com.fivucsas.identity.entity.User` outside three packages:
   - `infrastructure.persistence.*` (repos + mappers)
   - `entity.*` (the entity itself)
   - `repository.*` (Spring Data interfaces)
   
   Existing 123 sites get a `@Deprecated`-style allowlist; new sites are rejected. Ratchet down the allowlist over time.

3. Migrate the next 5 services in priority order: `AuthenticateUserService`, `RegisterUserService`, `UpdateUserService`, `ListUsersService`, `DeactivateUserService`. Each migration is one PR, gated by the ArchUnit test.

This is professional Hexagonal Architecture practice for a half-implemented split: don't pretend it's done, don't roll it back, ratchet forward with a CI guardrail.

### Effort

- Annotation + ArchUnit test: ~2 hours.
- Per-service migration: ~30 minutes each (mapper exists; mostly type-substitution).
- Total to drain the 123-site allowlist: ~1.5 sprints across normal feature work, no Big Refactor.

### What I will not do without approval

- Rewrite either file.
- Delete the pure-domain file.
- Migrate services in this session.

I will (with approval) ship the annotation + ArchUnit guard as a single small PR. That alone unblocks the architectural conversation without forcing a refactor.

---

## 2. JWT_SECRET rotation (P0-SEC-3)

### Forensic finding

| Variable | Value | First seen |
|---|---|---|
| Leaked secret (in `.env.gcp` blob `f8ee668`, March 2026) | `0fxTk5RdD+0iIRiU27/kjka5+ADeyk30eu3CyIykKB+yU6LSJB9h/L6tpHdaXnCFw//hekRUxJJwQD+WlfOlrw==` | 2026-03-08 |
| Current live identity-core-api (`/opt/projects/fivucsas/identity-core-api/.env.prod`) | `tu9IMTc1n58izfedLweZLTjRjWH14Xp84v+ITOC74bP/o+/4fc+HIJiO8B1vZvjDE8d0TBZNwaTqg/HgzHOqEQ==` | currently in service |

**The leaked GCP value is NOT the live Hetzner value.** The leak in git history is dead bytes — never authenticated a Hetzner token.

User confirmed: "We do not use gcp anymore. We use hetzner."

### Why the SECURITY_REVIEW recommendation was over-cautious

The SECURITY_REVIEW recommended a hard rotation with full session revoke as if the leaked value were live. Hard rotation logs out every user immediately — material UX cost. Defensible only if the leaked value is or was the live signing key.

It isn't, and there's no evidence it ever was on Hetzner.

### Recommended: defence-in-depth rotation using the existing `kid`-based key registry

The codebase already supports multi-key JWT verification via `kid` (PR #58 wired alg/kid binding + iss/aud requirements). Use it:

1. Generate a new HS512 secret (already done — held offline, not yet active).
2. Add it as the **new** active signing key with a fresh `kid` (e.g. `2026-05-02-a`). Keep the old key in the verification set with `kid=current-prod`.
3. Restart api. New tokens carry the new `kid`. Existing tokens still verify against the old key.
4. Soak ≥ 30 days (longer than max refresh-token lifetime).
5. Drop old key from verification set in a follow-up release.

No user logout. No incident. Audit-log records "key rotation: kid=2026-05-02-a became active".

### What I will not do without approval

- Touch the live JWT_SECRET on Hetzner.
- Force-push the history rewrite to scrub `.env.gcp` from git.

I will (with approval) ship a small PR that:
- Adds the second key entry to the api's key registry config.
- Documents the soak period.
- Adds a smoke test confirming both kids verify in transit.

### Optional: history rewrite

Cosmetic only — the leaked value never authenticated anything in current prod. If the user wants a clean public history, `git filter-repo --path .env.gcp --invert-paths && git push --force-with-lease` is the operator action. **Coordinate first**: any local clone diverges irreversibly. I will not run this without explicit approval.

---

## Summary — what changes if you approve

| Decision | Action | Effort | Risk |
|---|---|---|---|
| User-domain (a) | One PR: annotation + ArchUnit guard | 2 h | none — no behavioural change |
| JWT rotation (kid-based) | One PR: add second key + soak doc | 3 h | none — both keys verify in parallel |
| `.env.gcp` history rewrite | Operator: filter-repo + force-push | 30 min | local clones diverge — coordinate first |

Both code-side actions are safe to run alongside the operator container rebuild. Ask me to ship them and I will.
