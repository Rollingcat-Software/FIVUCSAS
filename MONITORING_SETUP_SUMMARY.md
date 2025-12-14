# FIVUCSAS Monitoring Setup - Implementation Summary

## Overview

This document summarizes the Prometheus and Grafana monitoring configuration implemented for the FIVUCSAS platform.

**Date:** 2025-12-04
**Status:** Production-ready
**Version:** 1.0.0

## What Was Configured

### 1. Docker Compose Configuration

**File:** `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\monitoring\docker-compose.monitoring.yml`

**Updates:**
- Fixed PostgreSQL exporter configuration for single database setup
- Updated Redis exporter with correct password
- Configured all services to use the `fivucsas-network`
- Set up persistent volumes for data retention

**Services Configured:**
- **Prometheus** (v2.48.0) - Port 9090
- **Grafana** (v10.2.2) - Port 3000
- **Alertmanager** (v0.26.0) - Port 9093
- **PostgreSQL Exporter** (v0.15.0) - Port 9187
- **Redis Exporter** (v1.55.0) - Port 9121
- **Node Exporter** (v1.7.0) - Port 9100

### 2. Prometheus Configuration

**Files:**
- `monitoring/prometheus.yml` (main compose config)
- `monitoring/prometheus/prometheus.yml` (detailed config)

**Updates:**
- Updated scrape targets for current infrastructure
- Set scrape interval to 10s for APIs, 15s for infrastructure
- Configured proper service names (identity-core-api, biometric-processor)
- Updated target ports (8080 for Java, 8001 for FastAPI)
- Enabled alert rules loading
- Set 30-day retention policy

**Scrape Targets:**
1. Identity Core API: `identity-core-api:8080/actuator/prometheus`
2. Biometric Processor: `biometric-processor:8001/metrics`
3. PostgreSQL: `postgres-exporter:9187`
4. Redis: `redis-exporter:9121`
5. Node Exporter: `node-exporter:9100`
6. Prometheus self: `localhost:9090`

### 3. Identity Core API - Metrics Configuration

**File:** `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api\build.gradle`

**Added Dependencies:**
```gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'io.micrometer:micrometer-registry-prometheus'
```

**File:** `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\identity-core-api\src\main\resources\application.yml`

**Added Configuration:**
```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus,metrics
      base-path: /actuator
  endpoint:
    health:
      show-details: when-authorized
    prometheus:
      enabled: true
    metrics:
      enabled: true
  metrics:
    export:
      prometheus:
        enabled: true
    tags:
      application: ${spring.application.name}
      environment: ${SPRING_PROFILES_ACTIVE:dev}
```

**Metrics Endpoint:** `http://localhost:8080/actuator/prometheus`

**Available Metrics:**
- HTTP request duration, count, status codes
- JVM memory usage, GC statistics
- Database connection pool (HikariCP)
- Thread counts, CPU usage
- Custom application metrics

### 4. Biometric Processor - Metrics Configuration

**File:** `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor\requirements.txt`

**Added Dependency:**
```
prometheus-fastapi-instrumentator>=6.1.0
```

**File:** `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\biometric-processor\app\main.py`

**Added Configuration:**
```python
from prometheus_fastapi_instrumentator import Instrumentator

instrumentator = Instrumentator(
    should_group_status_codes=True,
    should_ignore_untemplated=True,
    should_respect_env_var=True,
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics", "/health", "/"],
    env_var_name="ENABLE_METRICS",
    inprogress_name="http_requests_inprogress",
    inprogress_labels=True,
)

instrumentator.instrument(app).expose(app, include_in_schema=False)
```

**Metrics Endpoint:** `http://localhost:8001/metrics`

**Available Metrics:**
- HTTP request count, duration histograms
- In-progress requests
- Request/response sizes
- Custom biometric processing metrics

### 5. Grafana Configuration

**Datasource:** `monitoring/grafana/provisioning/datasources/prometheus.yml`
- Automatically provisioned on startup
- Connected to Prometheus at `http://prometheus:9090`
- Set as default datasource

**Dashboards:** `monitoring/grafana/provisioning/dashboards/`
All dashboards are pre-configured and automatically loaded:

1. **overview.json** - FIVUCSAS Overview Dashboard
   - System health indicators
   - Request rates across services
   - Error rates and response times
   - Resource utilization

2. **identity-core.json** - Identity Core API Dashboard
   - Authentication metrics
   - JWT token operations
   - Database connection pool
   - JVM memory and GC
   - Cache hit rates

3. **biometric-processor.json** - Biometric Processing Dashboard
   - Enrollment/verification rates
   - Processing time distribution
   - Quality score metrics
   - ML model performance
   - Liveness detection results

4. **infrastructure.json** - Infrastructure Dashboard
   - CPU, memory, disk usage
   - Network traffic
   - PostgreSQL query performance
   - Redis operations and memory

### 6. Alert Rules

**File:** `monitoring/alert_rules.yml`

**Configured Alerts:**

**Biometric Processor:**
- High enrollment error rate (>10% for 5m)
- Slow enrollment processing (p95 >5s for 10m)
- Low quality scores (median <0.7 for 15m)
- Database connections high (>45/50)
- High webhook failure rate (>20%)

**Identity Core:**
- High failed login rate (>30% for 10m)
- High account lockouts (>5/sec)
- Event processing failures

**Infrastructure:**
- Service down (>1 minute)
- High CPU usage (>80% for 10m)
- High memory usage (<10% available)
- Disk space low (<10%)
- Redis/PostgreSQL down

### 7. Documentation

**Created/Updated Files:**

1. **MONITORING.md** (project root)
   - Comprehensive monitoring guide
   - Architecture overview
   - Available metrics catalog
   - Alert configuration
   - Troubleshooting guide
   - Security best practices

2. **monitoring/README.md**
   - Quick start guide
   - Service descriptions
   - Configuration instructions
   - Example PromQL queries
   - Maintenance procedures

3. **monitoring/MONITORING_GUIDE.md** (existing, updated)
   - Performance validation guide
   - Dashboard usage
   - Key metrics explanation

4. **monitoring/verify-setup.sh** and **verify-setup.ps1**
   - Automated verification scripts
   - Check service status
   - Validate metrics endpoints
   - Verify configuration files

### 8. Main Docker Compose Update

**File:** `C:\Users\ahabg\OneDrive\Belgeler\GitHub\FIVUCSAS\docker-compose.yml`

**Updates:**
- Removed commented monitoring services (now in separate file)
- Added clear instructions for enabling monitoring
- Cleaned up volume definitions
- Added documentation reference

## Quick Start Guide

### Step 1: Start Main Application

```bash
# From project root
docker-compose up -d
```

### Step 2: Start Monitoring Stack

```bash
# Option 1: From monitoring directory
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Option 2: From project root
docker-compose -f monitoring/docker-compose.monitoring.yml up -d
```

### Step 3: Verify Setup

**Linux/Mac:**
```bash
cd monitoring
chmod +x verify-setup.sh
./verify-setup.sh
```

**Windows:**
```powershell
cd monitoring
.\verify-setup.ps1
```

### Step 4: Access Dashboards

- **Grafana:** http://localhost:3000
  - Username: `admin`
  - Password: `admin` (change on first login)

- **Prometheus:** http://localhost:9090
  - Check targets: http://localhost:9090/targets
  - Query metrics directly

- **Alertmanager:** http://localhost:9093
  - View and manage alerts

### Step 5: View Pre-configured Dashboards

In Grafana:
1. Navigate to **Dashboards** → **Browse**
2. Open **FIVUCSAS** folder
3. Select any dashboard:
   - Overview (system health)
   - Identity Core (auth metrics)
   - Biometric Processor (ML metrics)
   - Infrastructure (system resources)

## Metrics Endpoints

### Direct Access (for testing)

```bash
# Identity Core API (Spring Boot Actuator)
curl http://localhost:8080/actuator/health
curl http://localhost:8080/actuator/prometheus

# Biometric Processor (FastAPI)
curl http://localhost:8001/health
curl http://localhost:8001/metrics

# PostgreSQL Exporter
curl http://localhost:9187/metrics

# Redis Exporter
curl http://localhost:9121/metrics

# Node Exporter (system metrics)
curl http://localhost:9100/metrics
```

## Key Features

### 1. Production-Ready Configuration
- Secure by default
- Persistent data storage
- Configurable retention policies
- Resource-optimized scrape intervals

### 2. Comprehensive Metrics
- Application performance (latency, throughput, errors)
- Business metrics (enrollments, verifications, authentications)
- Infrastructure health (CPU, memory, disk, network)
- Database performance (connections, queries, transactions)
- Cache efficiency (hit rates, memory usage)

### 3. Pre-configured Dashboards
- No manual setup required
- Professional layouts
- Relevant visualizations
- Drill-down capabilities

### 4. Intelligent Alerting
- Critical alerts for service outages
- Performance degradation warnings
- Resource exhaustion notifications
- Business metric anomalies

### 5. Developer-Friendly
- Easy to extend with custom metrics
- Well-documented PromQL queries
- Clear troubleshooting guides
- Automated verification scripts

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      FIVUCSAS APPLICATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │  identity-core-api   │         │ biometric-processor  │     │
│  │      (Java)          │         │      (Python)        │     │
│  │                      │         │                      │     │
│  │  /actuator/          │         │     /metrics         │     │
│  │  prometheus          │         │                      │     │
│  └──────────┬───────────┘         └──────────┬───────────┘     │
│             │                                 │                  │
│             │                                 │                  │
└─────────────┼─────────────────────────────────┼─────────────────┘
              │                                 │
              │                                 │
              │        Scrapes metrics          │
              │                                 │
              ▼                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MONITORING STACK                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │                 Prometheus (Port 9090)                │      │
│  │                                                        │      │
│  │  • Scrapes all services every 10-15s                 │      │
│  │  • Stores time-series data (30 day retention)        │      │
│  │  • Evaluates alert rules                             │      │
│  │  • Provides PromQL query engine                      │      │
│  └─────────────┬──────────────────────────┬──────────────┘      │
│                │                          │                      │
│                │ Queries                  │ Alerts               │
│                ▼                          ▼                      │
│  ┌──────────────────────┐   ┌──────────────────────────┐       │
│  │   Grafana (3000)     │   │  Alertmanager (9093)     │       │
│  │                      │   │                          │       │
│  │  • Visualizations    │   │  • Alert routing         │       │
│  │  • 4 Pre-configured  │   │  • Notifications         │       │
│  │    dashboards        │   │  • Slack/Email/PagerDuty │       │
│  └──────────────────────┘   └──────────────────────────┘       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────┐       │
│  │              Exporters (Metrics Collection)          │       │
│  │                                                       │       │
│  │  • PostgreSQL Exporter (9187) - DB metrics          │       │
│  │  • Redis Exporter (9121) - Cache metrics            │       │
│  │  • Node Exporter (9100) - System metrics            │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Configuration

### Recommended .env File

Create `monitoring/.env`:

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=SecurePassword123!

# Database
DB_USERNAME=postgres
DB_PASSWORD=postgres_dev_password
DB_NAME=identity_core_db

# Redis
REDIS_PASSWORD=redis_dev_password

# Prometheus
PROMETHEUS_RETENTION=30d
```

## Security Considerations

### Implemented
- Grafana admin password configurable via environment variable
- Metrics endpoints exposed only within Docker network
- No wildcard CORS in applications
- Separate monitoring network possible

### Recommended for Production
1. Change default Grafana password immediately
2. Enable HTTPS/TLS for Grafana
3. Restrict metrics endpoint access with authentication
4. Use secrets management (Vault, AWS Secrets Manager)
5. Enable network isolation
6. Implement firewall rules
7. Regular security audits

## Troubleshooting

### Metrics Not Appearing

**Identity Core API:**
1. Check if service is running: `docker ps`
2. Test endpoint: `curl http://localhost:8080/actuator/prometheus`
3. Verify dependencies in `build.gradle`
4. Rebuild: `docker-compose build identity-core-api`

**Biometric Processor:**
1. Check if service is running: `docker ps`
2. Test endpoint: `curl http://localhost:8001/metrics`
3. Verify dependency in `requirements.txt`
4. Rebuild: `docker-compose build biometric-processor`

### Prometheus Not Scraping

1. Check targets: http://localhost:9090/targets
2. Verify network connectivity:
   ```bash
   docker exec fivucsas-prometheus curl http://identity-core-api:8080/actuator/prometheus
   ```
3. Check Prometheus logs: `docker logs fivucsas-prometheus`

### Grafana Dashboards Not Loading

1. Verify datasource: Configuration → Data Sources → Prometheus → Save & Test
2. Check logs: `docker logs fivucsas-grafana`
3. Restart Grafana: `docker-compose -f docker-compose.monitoring.yml restart grafana`

## Next Steps

### 1. Customize Alerts
- Edit `monitoring/alert_rules.yml`
- Add service-specific alerts
- Configure notification channels in `alertmanager.yml`

### 2. Add Custom Metrics
- Implement business-specific metrics in application code
- Create custom Grafana panels
- Set up recording rules for complex queries

### 3. Performance Tuning
- Adjust scrape intervals based on needs
- Configure retention policies
- Optimize dashboard queries

### 4. Integration
- Connect to external monitoring (Datadog, New Relic)
- Set up log aggregation (ELK, Loki)
- Implement distributed tracing (Jaeger, Zipkin)

## Maintenance

### Regular Tasks

**Daily:**
- Check Grafana dashboards for anomalies
- Review active alerts

**Weekly:**
- Verify all targets are up
- Check Prometheus storage usage
- Review alert effectiveness

**Monthly:**
- Backup Grafana dashboards
- Update monitoring stack images
- Review and optimize dashboard queries
- Clean up old metrics data

### Backup Procedures

```bash
# Backup Grafana dashboards
cd monitoring
for dash in $(curl -s http://admin:admin@localhost:3000/api/search | jq -r '.[] | .uid'); do
  curl -s http://admin:admin@localhost:3000/api/dashboards/uid/$dash | jq . > ./backup/$dash.json
done

# Backup Prometheus data
docker run --rm -v prometheus-data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/prometheus-data.tar.gz -C /data .
```

## Support and Resources

### Documentation
- **MONITORING.md** - Complete monitoring guide
- **monitoring/README.md** - Quick start and operations
- **monitoring/MONITORING_GUIDE.md** - Performance validation

### External Resources
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
- [Micrometer Prometheus](https://micrometer.io/docs/registry/prometheus)
- [FastAPI Prometheus Instrumentator](https://github.com/trallnag/prometheus-fastapi-instrumentator)

### Contact
For issues or questions:
- Review troubleshooting guide above
- Check logs: `docker-compose logs [service-name]`
- Run verification script: `./verify-setup.ps1` or `./verify-setup.sh`
- Contact FIVUCSAS DevOps team

---

**Implementation Date:** 2025-12-04
**Implemented By:** Claude Code (AI Assistant)
**Project:** FIVUCSAS - Face and Identity Verification Using Cloud-based SaaS
**Organization:** Marmara University
