# FIVUCSAS Monitoring Stack

Production-ready Prometheus and Grafana monitoring for FIVUCSAS platform.

## Quick Start

### 1. Start Main Application

```bash
# From project root
docker-compose up -d
```

### 2. Start Monitoring Stack

```bash
# From project root
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d

# Or from project root
docker-compose -f monitoring/docker-compose.monitoring.yml up -d
```

### 3. Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://localhost:3000 | admin / admin |
| **Prometheus** | http://localhost:9090 | - |
| **Alertmanager** | http://localhost:9093 | - |

### 4. View Pre-configured Dashboards

In Grafana, navigate to **Dashboards** → **Browse** → **FIVUCSAS** folder:

1. **Overview Dashboard** - System health and performance
2. **Identity Core API** - Authentication metrics
3. **Biometric Processor** - ML processing metrics
4. **Infrastructure** - CPU, memory, disk, database

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MONITORING STACK                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌───────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │  Grafana  │◄─────┤  Prometheus  │◄─────┤  Exporters  │ │
│  │   :3000   │      │     :9090    │      │             │ │
│  └───────────┘      └──────────────┘      └─────────────┘ │
│                                                              │
│  Scrapes metrics from:                                      │
│  • identity-core-api:8080/actuator/prometheus               │
│  • biometric-processor:8001/metrics                         │
│  • postgres-exporter:9187 (database metrics)                │
│  • redis-exporter:9121 (cache metrics)                      │
│  • node-exporter:9100 (system metrics)                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Services

### Prometheus (Port 9090)
- Metrics collection and storage
- 30 day retention
- Scrape interval: 10-15s
- Alert evaluation

### Grafana (Port 3000)
- Data visualization
- Pre-configured dashboards
- Automatic datasource provisioning
- Custom alert notifications

### Alertmanager (Port 9093)
- Alert routing and grouping
- Notification channels (Slack, Email, PagerDuty)
- Alert silencing and inhibition

### Exporters
- **PostgreSQL Exporter (9187)**: Database metrics
- **Redis Exporter (9121)**: Cache metrics
- **Node Exporter (9100)**: System metrics (CPU, memory, disk)

## Configuration

### Environment Variables

Create `.env` file in monitoring directory:

```bash
# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=change_me_in_production

# Database
DB_USERNAME=postgres
DB_PASSWORD=postgres_dev_password
DB_NAME=identity_core_db

# Redis
REDIS_PASSWORD=redis_dev_password

# Prometheus
PROMETHEUS_RETENTION=30d
```

### Custom Alerts

Edit `alert_rules.yml` to add custom alerts:

```yaml
- alert: CustomAlert
  expr: your_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Alert description"
```

Reload Prometheus configuration:
```bash
curl -X POST http://localhost:9090/-/reload
```

### Notification Channels

Edit `alertmanager.yml` for Slack, Email, or PagerDuty notifications.

**Slack Example:**
```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK'
        channel: '#alerts'
```

## Key Metrics

### Identity Core API (Spring Boot)
- `http_server_requests_seconds_*` - HTTP request metrics
- `hikaricp_connections_*` - Database connection pool
- `jvm_memory_*` - JVM memory usage
- `jvm_gc_pause_*` - Garbage collection

### Biometric Processor (FastAPI)
- `http_requests_total` - Total requests
- `http_request_duration_seconds_*` - Request duration
- `http_requests_inprogress` - Active requests

### PostgreSQL
- `pg_stat_database_numbackends` - Active connections
- `pg_stat_database_xact_commit` - Transactions
- `pg_database_size_bytes` - Database size

### Redis
- `redis_memory_used_bytes` - Memory usage
- `redis_keyspace_hits_total` - Cache hits
- `redis_keyspace_misses_total` - Cache misses
- `redis_connected_clients` - Connected clients

### System (Node Exporter)
- `node_cpu_seconds_total` - CPU usage
- `node_memory_*` - Memory usage
- `node_filesystem_*` - Disk usage
- `node_network_*` - Network traffic

## Example Queries (PromQL)

### Request Rate
```promql
rate(http_server_requests_seconds_count[5m])
```

### Average Response Time
```promql
rate(http_server_requests_seconds_sum[5m]) / rate(http_server_requests_seconds_count[5m])
```

### Error Rate
```promql
sum(rate(http_server_requests_seconds_count{status=~"5.."}[5m])) / sum(rate(http_server_requests_seconds_count[5m]))
```

### Cache Hit Rate
```promql
rate(redis_keyspace_hits_total[5m]) / (rate(redis_keyspace_hits_total[5m]) + rate(redis_keyspace_misses_total[5m]))
```

### Database Connection Pool Utilization
```promql
hikaricp_connections_active / hikaricp_connections_max
```

## Troubleshooting

### Prometheus Not Scraping
```bash
# Check targets
http://localhost:9090/targets

# Check service is running
docker-compose ps

# Test metrics endpoint
curl http://localhost:8080/actuator/prometheus
curl http://localhost:8001/metrics
```

### Grafana Dashboard Not Loading
```bash
# Restart Grafana
docker-compose -f docker-compose.monitoring.yml restart grafana

# Check logs
docker logs fivucsas-grafana

# Verify datasource
# In Grafana: Configuration → Data Sources → Prometheus → Save & Test
```

### No Metrics from Application

**Identity Core API:**
```bash
# Verify actuator is enabled
curl http://localhost:8080/actuator/health

# Check dependencies in build.gradle:
# - spring-boot-starter-actuator
# - micrometer-registry-prometheus

# Rebuild if needed
docker-compose build identity-core-api
```

**Biometric Processor:**
```bash
# Verify metrics endpoint
curl http://localhost:8001/metrics

# Check requirements.txt:
# - prometheus-fastapi-instrumentator>=6.1.0

# Rebuild if needed
docker-compose build biometric-processor
```

## Maintenance

### Backup Dashboards
```bash
# Export all dashboards
for dash in $(curl -s http://admin:admin@localhost:3000/api/search | jq -r '.[] | .uid'); do
  curl -s http://admin:admin@localhost:3000/api/dashboards/uid/$dash | jq . > ./backup/$dash.json
done
```

### Update Services
```bash
# Pull latest images
docker-compose -f docker-compose.monitoring.yml pull

# Restart services
docker-compose -f docker-compose.monitoring.yml up -d
```

### Clean Old Data
```bash
# Check Prometheus data size
du -sh /var/lib/docker/volumes/prometheus-data

# Adjust retention in docker-compose.monitoring.yml:
# --storage.tsdb.retention.time=15d
```

## Production Deployment

### Security Checklist
- [ ] Change Grafana admin password
- [ ] Enable TLS/HTTPS for Grafana
- [ ] Restrict metrics endpoints (authentication)
- [ ] Use secrets management (not env vars)
- [ ] Enable firewall rules
- [ ] Set up backup schedule
- [ ] Configure alert notifications
- [ ] Review retention policies

### High Availability
- [ ] Deploy Prometheus with remote storage
- [ ] Set up Grafana with database backend
- [ ] Configure Alertmanager clustering
- [ ] Use load balancer for Grafana
- [ ] Implement disaster recovery plan

## Additional Documentation

- **MONITORING.md** (project root) - Complete monitoring guide
- **MONITORING_GUIDE.md** (this directory) - Detailed monitoring guide with performance metrics
- **alert_rules.yml** - Alert rule definitions
- **prometheus.yml** - Prometheus configuration
- **grafana/** - Dashboard and datasource provisioning

## Support

For issues:
1. Check application logs: `docker-compose logs [service-name]`
2. Verify metrics endpoints are accessible
3. Check Prometheus targets: http://localhost:9090/targets
4. Review alert rules: http://localhost:9090/alerts
5. Consult documentation above

---

**Version:** 1.0.0
**Last Updated:** 2025-12-04
**Maintained By:** FIVUCSAS Team
