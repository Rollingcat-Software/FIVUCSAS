Review all Dockerfiles, docker-compose files, and Traefik configuration in $ARGUMENTS.

Check for:
- Base image pinning (use digest, not just tag)
- Multi-stage builds to minimize image size
- Running as non-root user
- Health checks defined
- Resource limits (memory, CPU) in compose
- Secret exposure in build args or environment
- Unnecessary port exposure
- .dockerignore completeness
- Layer ordering for cache efficiency
- Unnecessary packages installed
- PID limits configured

Report each finding with file path, severity, and fix.
