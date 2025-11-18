# Monitoring & Observability

Comprehensive monitoring and observability infrastructure for the FIVUCSAS platform using Prometheus, Grafana, and Alertmanager.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Metrics Catalog](#metrics-catalog)
- [Dashboards](#dashboards)
- [Alert Rules](#alert-rules)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

The FIVUCSAS monitoring stack provides:

- **Real-time metrics** from all microservices
- **Custom business metrics** for enrollment, verification, and authentication
- **Infrastructure monitoring** (CPU, memory, disk, network)
- **Database monitoring** (PostgreSQL connections, query rates, cache hit ratios)
- **Redis monitoring** (memory usage, commands/sec, pub/sub channels)
- **ML pipeline performance** (face detection, embedding extraction, quality assessment)
- **Pre-configured Grafana dashboards** for visualization
- **Automated alerting** for critical issues

### Technology Stack

- **Prometheus** (v2.48.0) - Metrics collection and storage
- **Grafana** (v10.2.2) - Visualization and dashboards
- **Alertmanager** (v0.26.0) - Alert routing and notifications
- **Exporters**:
  - PostgreSQL Exporter (v0.15.0)
  - Redis Exporter (v1.55.0)
  - Node Exporter (v1.7.0)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Monitoring Stack                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐   scrapes    ┌──────────────┐                │
│  │              │ ──────────>   │              │                │
│  │  Services    │               │  Prometheus  │                │
│  │              │ <────────────  │              │                │
│  └──────────────┘   metrics     └──────┬───────┘                │
│                                         │                         │
│  ┌──────────────┐                      │                         │
│  │              │                      │ alerts                  │
│  │  Exporters   │ ───────────────────>│                         │
│  │              │                      │                         │
│  └──────────────┘                      v                         │
│                                  ┌──────────────┐                │
│  ┌──────────────┐                │              │                │
│  │              │ <──────────── │ Alertmanager │                │
│  │   Grafana    │   queries     │              │                │
│  │              │                └──────────────┘                │
│  └──────────────┘                      │                         │
│                                         │ notifications           │
│                                         v                         │
│                                  ┌──────────────┐                │
│                                  │ Slack/Email  │                │
│                                  │  PagerDuty   │                │
│                                  └──────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Services** expose `/metrics` endpoints (Prometheus format)
2. **Prometheus** scrapes metrics every 10-15 seconds
3. **Alert rules** are evaluated every 15 seconds
4. **Alertmanager** handles alert routing and notifications
5. **Grafana** queries Prometheus for visualization
6. **Exporters** provide infrastructure and database metrics

---

## Metrics Catalog

### Biometric Processor Metrics

#### Enrollment Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `biometric_enrollment_requests_total` | Counter | `tenant_id`, `status` | Total enrollment requests |
| `biometric_enrollment_duration_seconds` | Histogram | `tenant_id`, `status` | Enrollment processing time |
| `biometric_enrollment_quality_score` | Histogram | `tenant_id` | Face image quality scores (0-1) |
| `biometric_enrollment_liveness_score` | Histogram | `tenant_id` | Liveness detection scores (0-1) |
| `biometric_enrollment_errors_total` | Counter | `tenant_id`, `error_code` | Enrollment errors by type |

**Buckets for duration_seconds**: 0.5s, 1s, 2s, 5s, 10s, 30s, 60s
**Buckets for quality/liveness scores**: 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0

#### Verification Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `biometric_verification_requests_total` | Counter | `tenant_id`, `verified` | Total verification requests |
| `biometric_verification_duration_seconds` | Histogram | `tenant_id` | Verification processing time |
| `biometric_verification_similarity_score` | Histogram | `tenant_id`, `decision` | Face similarity scores |

#### ML Pipeline Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `biometric_face_detection_duration_seconds` | Histogram | Face detection latency |
| `biometric_embedding_extraction_duration_seconds` | Histogram | Embedding extraction latency |
| `biometric_quality_assessment_duration_seconds` | Histogram | Quality assessment latency |
| `biometric_liveness_detection_duration_seconds` | Histogram | Liveness detection latency |

#### Database Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `biometric_database_query_duration_seconds` | Histogram | `operation` | Database query latency |
| `biometric_database_connections_active` | Gauge | - | Active database connections |
| `biometric_pgvector_search_duration_seconds` | Histogram | `tenant_id` | pgvector similarity search time |
| `biometric_embeddings_stored_total` | Counter | `tenant_id` | Total embeddings stored |

#### Event Bus Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `biometric_events_published_total` | Counter | `event_type`, `success` | Events published to Redis |
| `biometric_events_publish_duration_seconds` | Histogram | `event_type` | Event publishing latency |

#### Webhook Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `biometric_webhook_calls_total` | Counter | `status`, `attempt` | Webhook calls to Identity Core |
| `biometric_webhook_duration_seconds` | Histogram | `status` | Webhook request duration |
| `biometric_webhook_retries_total` | Counter | `final_status` | Webhook retry attempts |

#### System Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `biometric_active_requests` | Gauge | `endpoint` | Active HTTP requests |
| `biometric_application_info` | Info | `app_name`, `version` | Application metadata |

### Identity Core API Metrics

#### Authentication Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `identity_auth_login_attempts_total` | Counter | - | Total login attempts |
| `identity_auth_login_failures_total` | Counter | `reason` | Failed login attempts |
| `identity_auth_lockouts_total` | Counter | - | Account lockouts |
| `identity_login_duration` | Timer | - | Login processing time |

#### User Management Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `identity_user_registrations_total` | Counter | `status` | User registrations |

#### Enrollment Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `identity_enrollment_jobs_total` | Counter | - | Enrollment jobs created |
| `identity_enrollment_biometric_success_total` | Counter | - | Successful biometric enrollments |
| `identity_enrollment_biometric_failure_total` | Counter | - | Failed biometric enrollments |
| `identity_enrollment_processing_duration` | Timer | - | Enrollment job processing time |

#### Webhook Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `identity_webhook_received_total` | Counter | - | Webhooks received from Biometric Processor |
| `identity_webhook_errors_total` | Counter | - | Webhook processing errors |
| `identity_webhook_processing_duration` | Timer | - | Webhook processing time |

#### Event Metrics

| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `identity_events_received_total` | Counter | `event_type` | Events received from Redis |
| `identity_events_processing_errors_total` | Counter | - | Event processing errors |
| `identity_event_processing_duration` | Timer | - | Event processing time |

---

## Dashboards

### 1. Biometric Processor Dashboard

**URL**: `http://localhost:3000/d/biometric-processor`

**Panels**:
- Enrollment Request Rate (by status)
- Enrollment Error Rate (%)
- Enrollment Duration (p50, p95, p99)
- Quality Score Distribution
- Liveness Score Distribution
- ML Pipeline Timings (face detection, quality, liveness, embedding)
- Database Connections
- Webhook Success Rate
- Event Publishing Rate
- Embeddings Stored
- Active Requests
- Errors by Type (table)

### 2. Identity Core Dashboard

**URL**: `http://localhost:3000/d/identity-core`

**Panels**:
- Login Attempts (total vs failed)
- Failed Login Rate (%)
- Account Lockouts
- User Registrations
- Biometric Enrollment Jobs (success vs failed)
- Enrollment Job Success Rate
- Webhook Processing (received vs errors)
- Webhook Processing Time (p95, p99)
- Events Received from Redis (by type)
- Event Processing Errors
- Login Duration (p95)
- Enrollment Processing Duration (p95)
- Event Processing Duration (p95)

### 3. Infrastructure Dashboard

**URL**: `http://localhost:3000/d/infrastructure`

**Panels**:
- Service Status (UP/DOWN indicators)
- CPU Usage by Instance
- Memory Usage by Instance
- Disk Usage
- Network I/O (RX/TX)
- PostgreSQL Connections (Biometric DB)
- PostgreSQL Connections (Identity DB)
- Redis Memory Usage
- Redis Connected Clients
- Redis Commands/sec
- Redis Pub/Sub Channels
- PostgreSQL Query Rate
- PostgreSQL Cache Hit Ratio

### 4. Overview Dashboard

**URL**: `http://localhost:3000/d/fivucsas-overview`

**Sections**:
- Platform Health (services up, total enrollments, verifications, logins, CPU usage)
- Biometric Performance (enrollment success rate, avg time, avg quality score)
- Authentication & Security (login success rate, account lockouts)
- Integration Health (webhook success rate, event publishing success rate)
- Request Volume (enrollments and logins over time)

---

## Alert Rules

### Biometric Processor Alerts

| Alert | Severity | Condition | Duration | Description |
|-------|----------|-----------|----------|-------------|
| `HighEnrollmentErrorRate` | Warning | Error rate > 10% | 5 min | Enrollment error rate exceeds threshold |
| `SlowEnrollmentProcessing` | Warning | p95 > 5s | 10 min | Enrollment processing is slow |
| `LowQualityScores` | Info | Median < 0.7 | 15 min | Image quality is degraded |
| `DatabaseConnectionsHigh` | Critical | Active > 45 | 5 min | Database connection pool near exhaustion |
| `WebhookFailureRate` | Warning | Failure rate > 20% | 5 min | High webhook failure rate |

### Identity Core Alerts

| Alert | Severity | Condition | Duration | Description |
|-------|----------|-----------|----------|-------------|
| `HighFailedLoginRate` | Warning | Failure rate > 30% | 10 min | Possible brute force attack |
| `HighAccountLockouts` | Warning | Rate > 5/sec | 5 min | Unusual number of lockouts |
| `EventProcessingFailures` | Critical | Rate > 1/sec | 5 min | Events failing to process |

### Infrastructure Alerts

| Alert | Severity | Condition | Duration | Description |
|-------|----------|-----------|----------|-------------|
| `ServiceDown` | Critical | up == 0 | 1 min | Service is unavailable |
| `HighCPUUsage` | Warning | CPU > 80% | 10 min | High CPU usage |
| `HighMemoryUsage` | Critical | Available < 10% | 5 min | Low available memory |
| `RedisDown` | Critical | redis_up == 0 | 1 min | Redis is unavailable |
| `PostgreSQLDown` | Critical | pg_up == 0 | 1 min | PostgreSQL is unavailable |
| `DiskSpaceLow` | Warning | Available < 10% | 5 min | Low disk space |

---

## Quick Start

### Prerequisites

- Docker and Docker Compose
- FIVUCSAS services running
- Network: `fivucsas-network` created

### 1. Start Monitoring Stack

```bash
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

### 2. Access Dashboards

- **Grafana**: http://localhost:3000 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093

### 3. Verify Metrics Collection

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Check specific metrics
curl http://localhost:9090/api/v1/query?query=up

# Test Biometric Processor metrics endpoint
curl http://localhost:8001/metrics

# Test Identity Core metrics endpoint
curl http://localhost:8080/actuator/prometheus
```

### 4. Explore Dashboards

1. Login to Grafana (http://localhost:3000)
2. Navigate to **Dashboards** → **FIVUCSAS**
3. Open any dashboard to view real-time metrics

---

## Configuration

### Prometheus Scrape Intervals

Edit `monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s      # Default scrape interval
  evaluation_interval: 15s   # Alert rule evaluation

scrape_configs:
  - job_name: 'biometric-processor'
    scrape_interval: 10s     # Override for this job
    scrape_timeout: 5s
```

### Alert Rule Thresholds

Edit `monitoring/alert_rules.yml`:

```yaml
- alert: HighEnrollmentErrorRate
  expr: |
    (rate(biometric_enrollment_errors_total[5m]) /
     rate(biometric_enrollment_requests_total[5m])) > 0.1  # Change threshold
  for: 5m  # Change duration
```

### Alertmanager Notifications

Edit `monitoring/alertmanager.yml`:

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'YOUR_SLACK_WEBHOOK_URL'  # Configure Slack
        channel: '#fivucsas-alerts'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'  # Configure PagerDuty
```

### Grafana Settings

Environment variables in `docker-compose.monitoring.yml`:

```yaml
environment:
  - GF_SECURITY_ADMIN_USER=admin          # Change admin username
  - GF_SECURITY_ADMIN_PASSWORD=admin      # Change admin password
  - GF_USERS_ALLOW_SIGN_UP=false         # Disable sign-ups
  - GF_INSTALL_PLUGINS=grafana-piechart-panel  # Additional plugins
```

---

## Troubleshooting

### Metrics Not Showing in Grafana

**Problem**: Dashboards show "No Data"

**Solutions**:
1. Check Prometheus is scraping targets:
   ```bash
   curl http://localhost:9090/api/v1/targets
   ```
   All targets should show state "UP"

2. Verify services are exposing metrics:
   ```bash
   curl http://localhost:8001/metrics  # Biometric Processor
   curl http://localhost:8080/actuator/prometheus  # Identity Core
   ```

3. Check Grafana datasource:
   - Go to Configuration → Data Sources
   - Click "Prometheus"
   - Click "Save & Test" (should show green checkmark)

### High Cardinality Issues

**Problem**: Prometheus consuming too much memory

**Solution**: Reduce label cardinality

```python
# Bad - high cardinality (user_id can be millions)
enrollment_requests.labels(tenant_id=tenant_id, user_id=user_id).inc()

# Good - low cardinality (only tenant_id)
enrollment_requests.labels(tenant_id=tenant_id).inc()
```

### Alerts Not Firing

**Problem**: Expected alerts not triggering

**Solutions**:
1. Check alert rule syntax in Prometheus UI:
   - Go to http://localhost:9090/alerts
   - Verify rule is loaded and state is correct

2. Test alert expression manually:
   ```
   (rate(biometric_enrollment_errors_total[5m]) /
    rate(biometric_enrollment_requests_total[5m])) > 0.1
   ```

3. Check Alertmanager configuration:
   ```bash
   curl http://localhost:9093/api/v1/status
   ```

### Missing Database Metrics

**Problem**: PostgreSQL/Redis metrics not available

**Solutions**:
1. Check exporter is running:
   ```bash
   docker ps | grep exporter
   ```

2. Verify database connection:
   ```bash
   docker logs fivucsas-postgres-exporter-biometric
   docker logs fivucsas-redis-exporter
   ```

3. Check exporter metrics endpoint:
   ```bash
   curl http://localhost:9187/metrics  # PostgreSQL
   curl http://localhost:9121/metrics  # Redis
   ```

### Dashboard Import Fails

**Problem**: Cannot import dashboard JSON

**Solution**: Use Grafana provisioning instead of manual import
- Dashboards in `monitoring/grafana/dashboards/` are auto-loaded
- Restart Grafana if dashboards don't appear:
  ```bash
  docker restart fivucsas-grafana
  ```

---

## Best Practices

### 1. Label Usage

**Use labels for filtering and aggregation**:
```python
# Good - allows filtering by tenant and status
enrollment_requests.labels(tenant_id=tenant_id, status='success').inc()

# Bad - creates separate metrics
enrollment_requests_success.inc()
enrollment_requests_failed.inc()
```

**Keep cardinality low**:
- ✅ `tenant_id` (low cardinality, e.g., 10-1000 tenants)
- ✅ `status` (very low cardinality, e.g., success/failed)
- ❌ `user_id` (high cardinality, millions of users)
- ❌ `job_id` (very high cardinality, unique per request)

### 2. Histogram Buckets

**Choose buckets based on expected latencies**:

```python
# Enrollment typically 1-10 seconds
enrollment_duration_seconds = Histogram(
    'biometric_enrollment_duration_seconds',
    'Enrollment processing time',
    buckets=(0.5, 1.0, 2.0, 5.0, 10.0, 30.0, 60.0)
)

# Face detection typically sub-second
face_detection_duration_seconds = Histogram(
    'biometric_face_detection_duration_seconds',
    'Face detection time',
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0)
)
```

### 3. Counter vs Gauge

**Counter** - monotonically increasing value (use `rate()` or `increase()`):
```python
enrollment_requests_total.inc()  # Counter
```

**Gauge** - value can go up or down:
```python
database_connections_active.set(45)  # Gauge
```

### 4. Alert Fatigue Prevention

**Set appropriate thresholds and durations**:
- Don't alert on transient spikes (use `for: 5m` or longer)
- Set thresholds based on SLOs (e.g., 95% success rate)
- Use severity levels (critical, warning, info)
- Group related alerts (e.g., all database alerts together)

### 5. Dashboard Organization

**Create role-specific dashboards**:
- **Ops Dashboard**: Infrastructure health, service status
- **Dev Dashboard**: Request rates, error rates, latency
- **Business Dashboard**: Enrollments, verifications, user registrations
- **ML Dashboard**: Model performance, quality scores, liveness scores

---

## Metrics Retention

- **Prometheus**: 30 days (configurable via `--storage.tsdb.retention.time`)
- **Grafana**: No data storage (queries Prometheus)
- **Audit Events** (Redis): 30 days (managed by EventPublisher)

To change Prometheus retention:
```bash
# Edit docker-compose.monitoring.yml
command:
  - '--storage.tsdb.retention.time=90d'  # 90 days
```

---

## Security Considerations

1. **Restrict Access**: Use firewalls to limit access to monitoring ports
   ```bash
   # Only allow internal network
   iptables -A INPUT -p tcp --dport 9090 -s 10.0.0.0/8 -j ACCEPT
   iptables -A INPUT -p tcp --dport 9090 -j DROP
   ```

2. **Enable Authentication**:
   - Grafana: Already enabled (admin/admin by default)
   - Prometheus: Use reverse proxy with authentication
   - Alertmanager: Use reverse proxy with authentication

3. **HTTPS**: Use TLS for production deployments
   ```yaml
   # Add to Grafana environment
   - GF_SERVER_PROTOCOL=https
   - GF_SERVER_CERT_FILE=/etc/grafana/ssl/cert.pem
   - GF_SERVER_CERT_KEY=/etc/grafana/ssl/key.pem
   ```

4. **Secrets Management**:
   - Don't commit credentials to git
   - Use environment variables or secrets management (e.g., HashiCorp Vault)

---

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Alertmanager Documentation](https://prometheus.io/docs/alerting/latest/alertmanager/)
- [PostgreSQL Exporter](https://github.com/prometheus-community/postgres_exporter)
- [Redis Exporter](https://github.com/oliver006/redis_exporter)
- [Node Exporter](https://github.com/prometheus/node_exporter)
