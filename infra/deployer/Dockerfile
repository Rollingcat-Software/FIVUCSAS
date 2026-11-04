# FIVUCSAS pull deployer: docker CLI + compose plugin, git, curl, python3 (stdlib only).
# Pinned base so the build is reproducible; same CLI the 2026-11-02 manual deploy used.
FROM docker:27.5.1-cli

RUN apk add --no-cache git curl python3 \
 && mkdir -p /state /app \
 && chown 1001:983 /state

WORKDIR /app
COPY fivucsas_deployer/ /app/fivucsas_deployer/
COPY tests/ /app/tests/

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/tmp

# Runs as the uid:gid that owns the prod checkouts and the docker socket group
# (deploy=1001, docker=983 on mordecai); compose overrides it if they differ.
USER 1001:983
ENTRYPOINT ["python3", "-m", "fivucsas_deployer"]
