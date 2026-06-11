# Operations

## Where things run

- **One host:** Hetzner CX43 — 8 vCPU / 16 GB / 150 GB / Ubuntu 24.04, Docker + Compose.
- **Edge:** Traefik v3.6 (TLS via Let's Encrypt, routing, rate-limit, admin-IP allowlist).
- **Static sites** (landing, dashboard, demo, links, amispoof) are on Hostinger; the **API,
  hosted login and these docs** run in Docker behind Traefik.
- **CPU-only:** `ALLOW_HEAVY_ML=false` hard-blocks GPU-class models at boot — the whole face
  pipeline is commodity-CPU.

## Deploys (high level)

| Surface | How |
| --- | --- |
| Identity Core API | `docker compose -f docker-compose.prod.yml --env-file .env.prod build --no-cache && up -d` |
| Web dashboard / landing | `npm run build` → `scp` to Hostinger |
| Hosted login (verify) | build → rsync into `verify-widget/html` → Docker rebuild |
| Docs (this book) | VitePress build → nginx image rebuild (`fivucsas-docs` container) |

> **Always** pass `--env-file .env.prod` for prod compose, and use a bare `git push`.

## Rolling back

Container deploys are reversible: tag the live image before a rebuild
(`docker tag <img> <img>:rollback-…`) and, if a deploy misbehaves, re-tag back and
`up -d` — instant, no rebuild. Source changes ship as PRs, so a `git revert` + redeploy is
always available.

## Observability

- **Uptime / health:** `status.fivucsas.com`.
- **Audit:** every security-relevant action → partitioned `audit_logs`.
- **CI/CD:** unit tests on `ubuntu-latest`; integration (Testcontainers) on the self-hosted
  `hetzner-cx43` runner; Hostinger deploys via the deploy workflow.

## Capacity

Heavy rebuilds are disk-aware (multi-layer defences: docker log caps, journald cap, hourly
disk-guard, daily sweep, weekly prune). Check free space before a `--no-cache` rebuild.
