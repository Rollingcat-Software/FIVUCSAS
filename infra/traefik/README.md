# Traefik Config (Vendored Reference)

The **live** Traefik configuration runs from `/opt/projects/infra/traefik/`
on the Hetzner host. That directory belongs to the `/opt/projects/` local
git repo (no remote) and is the source-of-truth Traefik mounts at runtime
(see `docker-compose.yml`, volumes `./config/traefik.yml` and
`./config/dynamic.yml`).

This `infra/traefik/` directory inside the FIVUCSAS repo is a **vendored
copy** so reviewers can diff Traefik changes alongside the rest of the
codebase. It is NOT mounted by Traefik directly.

## Sync workflow

After merging a change to this directory:

```bash
# 1. Sync vendored copy -> live config
sudo cp /opt/projects/fivucsas/infra/traefik/config/traefik.yml \
        /opt/projects/infra/traefik/config/traefik.yml
sudo cp /opt/projects/fivucsas/infra/traefik/config/dynamic.yml \
        /opt/projects/infra/traefik/config/dynamic.yml

# 2. Validate (Traefik watches dynamic.yml live; traefik.yml requires restart)
docker compose -f /opt/projects/infra/traefik/docker-compose.yml \
  --env-file /opt/projects/infra/traefik/.env config

# 3. Apply
#    dynamic.yml changes: zero-restart, picked up via inotify (`watch: true`)
#    traefik.yml changes: require container restart
docker compose -f /opt/projects/infra/traefik/docker-compose.yml \
  --env-file /opt/projects/infra/traefik/.env restart traefik

# 4. Verify access log writes peer IP, not client-supplied XFF
docker logs traefik 2>&1 | tail -20
```

## XFF / Rate-Limit Hardening (2026-05-12)

`entryPoints.{web,websecure}.forwardedHeaders.trustedIPs: []` ensures
Traefik strips any client-supplied `X-Forwarded-For` and overwrites it
with the connection peer IP. This is required because the backend
`RateLimitInterceptor.getClientIP` (identity-core-api) consumes
`XFF.split(",")[0]` without validating origin. Empty trustedIPs makes
the backend safe regardless of its parsing choice.

If a CDN or upstream proxy is ever inserted in front of Traefik, add
its egress CIDRs to `trustedIPs`. The internal `proxy` Docker bridge
(`172.20.0.0/24`) is deliberately NOT listed — external clients never
connect from that range; only container-to-Traefik traffic does, and
those callers do not set `X-Forwarded-For`.
