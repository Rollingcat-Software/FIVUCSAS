# Traefik Config (Vendored Reference)

The **live** Traefik configuration runs from `/opt/projects/infra/traefik/`
on the mordecai host (moved from Hetzner on 2026-09-17). That directory belongs to the `/opt/projects/` local
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

# 2a. Validate the Compose file itself (interpolation, service shape).
#     NOTE: this does NOT validate Traefik's own traefik.yml/dynamic.yml.
docker compose -f /opt/projects/infra/traefik/docker-compose.yml \
  --env-file /opt/projects/infra/traefik/.env config

# 2b. Validate Traefik's YAML (syntax + semantics) before restarting.
#     Traefik has no offline "lint" subcommand, so do a one-shot dry-run:
#     boot a throwaway container against the live config and watch for
#     "configuration error" lines. It exits non-zero on a fatal parse error.
docker run --rm \
  -v /opt/projects/infra/traefik/config/traefik.yml:/etc/traefik/traefik.yml:ro \
  -v /opt/projects/infra/traefik/config/dynamic.yml:/etc/traefik/dynamic.yml:ro \
  traefik:v3 traefik --configfile=/etc/traefik/traefik.yml 2>&1 \
  | grep -iE "error|invalid" || echo "no config errors detected"

# 3. Apply
#    dynamic.yml changes: zero-restart, picked up via inotify (`watch: true`)
#    traefik.yml changes: require container restart
docker compose -f /opt/projects/infra/traefik/docker-compose.yml \
  --env-file /opt/projects/infra/traefik/.env restart traefik

# 4. Verify access log writes peer IP, not client-supplied XFF.
#    NOTE: traefik.yml sets `accessLog.filePath: /var/log/traefik/access.log`,
#    so access logs go to that FILE inside the container, not stdout —
#    `docker logs traefik` shows only Traefik's own runtime/error log.
#    Read the access log from the file instead:
docker exec traefik tail -20 /var/log/traefik/access.log
#    (Traefik's startup/error log is still on stdout: `docker logs traefik`.)
```

## Permissions-Policy ownership (2026-10-09)

The `websecure` entrypoint applies `secure-headers@file` and `rate-limit@file`
to every router on the host, including non-FIVUCSAS sites. Entrypoint
middlewares wrap router middlewares, so a header they set overwrites whatever a
site's router or upstream sends. `secure-headers` therefore sets no
`Permissions-Policy`: each app serves its own.

FIVUCSAS camera, microphone and WebAuthn grants (delegated to the
`verify.fivucsas.com` iframe) live in `fivucsas-device-permissions`, attached by
the `fivucsas-*-permissions` file routers. Those shadow the docker-label routers
of `verify`, `app`, `demo` and `amispoof` (same `Host` rule, priority 1000, same
`@docker` service), so the change is a hot reload and no app compose file
changes. A new FIVUCSAS host that needs the camera gets a router of the same
shape. Check with:

```bash
curl -sI https://verify.fivucsas.com/ | grep -i permissions-policy   # FIVUCSAS grants
curl -sI https://fahrieren.com/      | grep -i permissions-policy   # the site's own policy
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
