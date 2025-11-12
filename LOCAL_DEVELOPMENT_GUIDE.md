# Local Development Guide - Full Stack

Complete guide to run the entire FIVUCSAS platform locally using IntelliJ and PyCharm before Docker deployment.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Prerequisites Setup](#prerequisites-setup)
4. [Step-by-Step Setup](#step-by-step-setup)
5. [Testing Integration](#testing-integration)
6. [Performance Validation](#performance-validation)
7. [Common Workflows](#common-workflows)
8. [Troubleshooting](#troubleshooting)

---

## Overview

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Your Local Machine                   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐              ┌──────────────┐       │
│  │  IntelliJ    │              │   PyCharm    │       │
│  │              │              │              │       │
│  │ Identity API │◄────────────►│  Biometric   │       │
│  │  (Port 8080) │   HTTP/REST  │  Processor   │       │
│  │              │              │ (Port 8000)  │       │
│  └──────┬───────┘              └──────┬───────┘       │
│         │                             │               │
│         │                             │               │
│  ┌──────▼───────┐              ┌─────▼────────┐      │
│  │ PostgreSQL   │              │  PostgreSQL  │      │
│  │ (identity_db)│              │(biometric_db)│      │
│  │ Port 5432    │              │ Port 5432    │      │
│  └──────────────┘              └──────────────┘      │
│         │                             │               │
│         └─────────┬───────────────────┘               │
│                   │                                   │
│            ┌──────▼──────┐                           │
│            │    Redis     │                           │
│            │  Port 6379   │                           │
│            │ (Cache+Queue)│                           │
│            └──────────────┘                           │
└─────────────────────────────────────────────────────────┘
```

### What You'll Run

1. **PostgreSQL** (2 databases: identity_db, biometric_db)
2. **Redis** (1 instance, 2 databases: 0 for cache, 1 for queue)
3. **Identity Core API** (Spring Boot in IntelliJ)
4. **Biometric Processor** (FastAPI in PyCharm)

---

## Quick Start

### 5-Minute Setup

```bash
# 1. Install prerequisites
brew install postgresql@15 redis openjdk@21 python@3.11  # macOS

# 2. Start databases
brew services start postgresql@15
brew services start redis

# 3. Create databases
psql -U postgres -c "CREATE DATABASE fivucsas_dev"
psql -U postgres -c "CREATE DATABASE biometric_dev"

# 4. Open projects
# - Open identity-core-api in IntelliJ
# - Open biometric-processor in PyCharm

# 5. Run both applications
# - IntelliJ: Click Run → "IdentityCoreAPI (Local)"
# - PyCharm: Click Run → "Biometric Processor (Local)"

# 6. Test
curl http://localhost:8080/actuator/health  # Identity API
curl http://localhost:8000/health           # Biometric Processor
```

---

## Prerequisites Setup

### 1. Install Required Software

**macOS (Homebrew):**
```bash
# Install all at once
brew install postgresql@15 redis openjdk@21 python@3.11 maven

# Start services
brew services start postgresql@15
brew services start redis
```

**Windows:**
- PostgreSQL: https://www.postgresql.org/download/windows/
- Redis: https://redis.io/download (or WSL)
- Java 21: https://adoptium.net/temurin/releases/?version=21
- Python 3.11: https://www.python.org/downloads/

**Linux (Ubuntu/Debian):**
```bash
# PostgreSQL
sudo apt install postgresql-15

# Redis
sudo apt install redis-server

# Java 21
sudo apt install openjdk-21-jdk

# Python 3.11
sudo apt install python3.11 python3.11-venv

# Start services
sudo systemctl start postgresql
sudo systemctl start redis
```

### 2. Verify Installations

```bash
# PostgreSQL
psql --version
# Should show: psql (PostgreSQL) 15.x

pg_isready
# Should show: accepting connections

# Redis
redis-cli --version
# Should show: redis-cli 7.x.x

redis-cli ping
# Should show: PONG

# Java
java -version
# Should show: openjdk version "21.x.x"

# Python
python3.11 --version
# Should show: Python 3.11.x

# Maven
mvn --version
# Should show: Apache Maven 3.8+
```

---

## Step-by-Step Setup

### Step 1: Database Setup (10 minutes)

#### Create PostgreSQL Databases

```bash
# Connect to PostgreSQL
psql -U postgres

# Create databases and users
CREATE DATABASE fivucsas_dev;
CREATE USER fivucsas_user WITH ENCRYPTED PASSWORD 'fivucsas_dev_password';
GRANT ALL PRIVILEGES ON DATABASE fivucsas_dev TO fivucsas_user;

CREATE DATABASE biometric_dev;
CREATE USER biometric_user WITH ENCRYPTED PASSWORD 'biometric_dev_password';
GRANT ALL PRIVILEGES ON DATABASE biometric_dev TO biometric_user;

# Grant schema permissions (PostgreSQL 15+)
\c fivucsas_dev
GRANT ALL ON SCHEMA public TO fivucsas_user;

\c biometric_dev
GRANT ALL ON SCHEMA public TO biometric_user;

# Exit
\q
```

#### Verify Database Connections

```bash
# Test identity database
psql -U fivucsas_user -d fivucsas_dev -h localhost -c "SELECT 1"
# Should return: 1

# Test biometric database
psql -U biometric_user -d biometric_dev -h localhost -c "SELECT 1"
# Should return: 1
```

#### Setup Redis Databases

Redis doesn't need explicit database creation, but let's verify:

```bash
redis-cli

# Test both databases
> SELECT 0  # For cache (Identity API)
> SET test "cache_db"
> GET test

> SELECT 1  # For job queue (Biometric Processor)
> SET test "queue_db"
> GET test

> EXIT
```

---

### Step 2: Identity Core API Setup (IntelliJ) (15 minutes)

Follow the detailed guide: [`identity-core-api/INTELLIJ_SETUP.md`](identity-core-api/INTELLIJ_SETUP.md)

**Quick Summary:**

1. **Open in IntelliJ:**
   ```bash
   cd FIVUCSAS/identity-core-api
   idea .
   ```

2. **Set Java SDK to 21:**
   - File → Project Structure → SDK: Java 21

3. **Create `application-local.yml`:**
   - Copy template from INTELLIJ_SETUP.md
   - Set database URL, Redis URL, connection pools

4. **Run Configuration:**
   - Run → Edit Configurations → Spring Boot
   - Main class: `com.fivucsas.identity.IdentityCoreApplication`
   - VM options: `-Dspring.profiles.active=local,optimized`

5. **Run Application:**
   - Click Run button
   - Wait for "Started IdentityCoreApplication"

6. **Test:**
   ```bash
   curl http://localhost:8080/actuator/health
   # Expected: {"status":"UP"}
   ```

---

### Step 3: Biometric Processor Setup (PyCharm) (15 minutes)

Follow the detailed guide: [`biometric-processor/PYCHARM_SETUP.md`](biometric-processor/PYCHARM_SETUP.md)

**Quick Summary:**

1. **Open in PyCharm:**
   ```bash
   cd FIVUCSAS/biometric-processor
   charm .
   ```

2. **Create Virtual Environment:**
   - File → Settings → Python Interpreter → Add → Virtualenv
   - Base interpreter: Python 3.11

3. **Install Dependencies:**
   ```bash
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Create `.env.local`:**
   - Copy template from PYCHARM_SETUP.md
   - Set DATABASE_URL, REDIS_URL, worker settings

5. **Run Configuration:**
   - Run → Edit Configurations → Python
   - Script: `main.py`
   - Environment: Load from `.env.local`

6. **Run Application:**
   - Click Run button
   - Wait for "Uvicorn running on http://0.0.0.0:8000"

7. **Test:**
   ```bash
   curl http://localhost:8000/health
   # Expected: {"status":"healthy"}
   ```

---

### Step 4: Verify Both Services Running

```bash
# Check Identity API
curl http://localhost:8080/actuator/health | jq
# Expected:
# {
#   "status": "UP",
#   "components": {
#     "db": {"status": "UP"},
#     "redis": {"status": "UP"}
#   }
# }

# Check Biometric Processor
curl http://localhost:8000/health | jq
# Expected:
# {
#   "status": "healthy",
#   "database": "connected",
#   "redis": "connected",
#   "ml_model": "loaded"
# }

# Check databases
psql -U fivucsas_user -d fivucsas_dev -c "SELECT COUNT(*) FROM flyway_schema_history"
psql -U biometric_user -d biometric_dev -c "SELECT 1"

# Check Redis
redis-cli -n 0 KEYS "fivucsas:*"  # Cache keys (may be empty initially)
redis-cli -n 1 LLEN biometric-jobs  # Queue (should be 0)
```

---

## Testing Integration

### Test 1: Basic Health Checks

```bash
# Identity API
curl http://localhost:8080/actuator/health

# Biometric Processor
curl http://localhost:8000/health

# Both should return "UP" / "healthy"
```

### Test 2: Database Connectivity

**Identity API:**
```bash
# Check if migrations ran
psql -U fivucsas_user -d fivucsas_dev -c "
SELECT version, description
FROM flyway_schema_history
ORDER BY installed_rank DESC
LIMIT 5;"

# Should show V8__Performance_optimizations.sql
```

**Biometric Processor:**
```bash
# Check tables exist
psql -U biometric_user -d biometric_dev -c "\dt"

# Should show face_embeddings, etc.
```

### Test 3: Cache Functionality (Priority 2)

**Test Redis Cache:**

```bash
# Make a request that should be cached
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Check Redis for cache keys
redis-cli -n 0 KEYS "fivucsas:*"

# Should see keys like: fivucsas:users:*
```

**Monitor Cache Hit Rate:**

```bash
# In one terminal, monitor Redis
redis-cli -n 0 MONITOR

# In another, make repeated API calls
# Watch for GET operations (cache hits) vs SET (cache misses)
```

### Test 4: Worker Queue (Priority 3)

**Test Job Queue:**

```python
# In PyCharm Python Console
import redis
from rq import Queue

r = redis.Redis(host='localhost', port=6379, db=1)
q = Queue('biometric-jobs', connection=r)

print(f"Queue length: {len(q)}")
print(f"Jobs: {q.jobs}")
```

**Submit Test Job:**

```bash
# Use API to trigger enrollment (which creates a job)
curl -X POST http://localhost:8000/api/biometric/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "tenant_id": "test-tenant",
    "images": ["base64_encoded_image"]
  }'

# Check queue
redis-cli -n 1 LLEN biometric-jobs
```

### Test 5: Connection Pools (Priority 4)

**Check HikariCP Pool (Identity API):**

```bash
# Check metrics endpoint
curl http://localhost:8080/actuator/metrics/hikaricp.connections.active | jq
curl http://localhost:8080/actuator/metrics/hikaricp.connections.max | jq

# Max should be 50 (optimized from 10)
```

**Check Redis Pool:**

```bash
# Watch IntelliJ console for logs
# Should see: "maximumPoolSize................................50"
```

### Test 6: End-to-End Flow

**Full Enrollment → Verification Flow:**

1. **Create User (Identity API):**
```bash
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!",
    "firstName": "Test",
    "lastName": "User",
    "tenantId": "tenant-123"
  }'
```

2. **Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "SecurePass123!"
  }'

# Save the token from response
```

3. **Enroll Face (Biometric Processor):**
```bash
# You'll need a base64-encoded face image
curl -X POST http://localhost:8000/api/biometric/enroll \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID_FROM_STEP1",
    "tenant_id": "tenant-123",
    "images": ["BASE64_IMAGE_DATA"]
  }'
```

4. **Verify Face:**
```bash
curl -X POST http://localhost:8000/api/biometric/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user_id": "USER_ID_FROM_STEP1",
    "tenant_id": "tenant-123",
    "image": "BASE64_IMAGE_DATA"
  }'

# Should return match result with similarity score
```

---

## Performance Validation

### Measure Local Performance

#### Test 1: Token Refresh Latency (Target: < 200ms)

```bash
# Install Apache Bench (if not installed)
brew install httpd  # macOS

# Run 100 requests
ab -n 100 -c 10 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/auth/token/refresh

# Check "Time per request" in output
# Should be < 200ms average
```

#### Test 2: Verification Latency (Target: < 500ms)

```bash
# Time a single verification
time curl -X POST http://localhost:8000/api/biometric/verify \
  -H "Content-Type: application/json" \
  -d '{...verification payload...}'

# Should complete in < 500ms
```

#### Test 3: Cache Hit Rate

```bash
# Get Redis stats before test
redis-cli -n 0 INFO stats | grep keyspace

# Make 100 identical requests (should hit cache)
for i in {1..100}; do
  curl -s http://localhost:8080/api/users/USER_ID > /dev/null
done

# Get Redis stats after test
redis-cli -n 0 INFO stats | grep keyspace

# Calculate hit rate from keyspace_hits / (keyspace_hits + keyspace_misses)
# Target: > 60%
```

#### Test 4: Connection Pool Usage

```bash
# Monitor pool usage during load
curl http://localhost:8080/actuator/metrics/hikaricp.connections.active | jq

# Run load test in another terminal
ab -n 1000 -c 50 http://localhost:8080/api/auth/login

# Check pool usage during test
# Should stay below 40/50 (80% utilization)
```

---

## Common Workflows

### Workflow 1: Make Code Changes and Test

**Identity API (IntelliJ):**
1. Make changes to Java code
2. Build → Build Project (Ctrl+F9)
3. Restart application (Ctrl+F5)
4. Test with curl or Postman
5. Check logs in IntelliJ console

**Biometric Processor (PyCharm):**
1. Make changes to Python code
2. Save file (Ctrl+S)
3. Uvicorn auto-reloads (if `--reload` flag set)
4. Test with curl or Swagger UI
5. Check logs in PyCharm console

### Workflow 2: Debug Issues

**IntelliJ:**
1. Set breakpoint (click left gutter)
2. Run → Debug (Shift+F9)
3. Trigger request that hits breakpoint
4. Use debugger controls:
   - Step Over: F8
   - Step Into: F7
   - Evaluate Expression: Alt+F8

**PyCharm:**
1. Set breakpoint (click left gutter)
2. Run → Debug (Shift+F9)
3. Trigger request
4. Use debugger controls (same as IntelliJ)

### Workflow 3: Test Database Changes

**Apply Migration:**

```bash
# Identity API migrations apply automatically on startup
# Check IntelliJ console for Flyway logs

# Biometric Processor (if using Alembic)
cd biometric-processor
alembic upgrade head
```

**Rollback Migration:**

```bash
# Flyway
psql -U fivucsas_user -d fivucsas_dev
# Manually drop tables/indexes

# Alembic
alembic downgrade -1
```

### Workflow 4: Clear Cache

```bash
# Clear all cache
redis-cli -n 0 FLUSHDB

# Clear specific cache keys
redis-cli -n 0 DEL "fivucsas:users:USER_ID"

# Clear pattern
redis-cli -n 0 --scan --pattern "fivucsas:embeddings:*" | xargs redis-cli -n 0 DEL
```

### Workflow 5: Monitor Logs

**IntelliJ:**
- View logs in Run panel
- Filter logs: Click filter icon, enter pattern
- Copy logs: Right-click → Copy

**PyCharm:**
- View logs in Run panel
- Search logs: Ctrl+F
- Export logs: Right-click → Export

**Database Logs:**
```bash
# PostgreSQL logs
tail -f /usr/local/var/postgres/server.log  # macOS Homebrew

# Or query slow queries
psql -U fivucsas_user -d fivucsas_dev -c "
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;"
```

---

## Troubleshooting

### Issue 1: Both Services Can't Connect to Database

**Symptom:**
```
Connection refused / Connection timeout
```

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# If not:
brew services start postgresql@15  # macOS
sudo systemctl start postgresql     # Linux

# Check if listening on correct port
sudo lsof -i :5432

# Check pg_hba.conf allows local connections
# Location: /usr/local/var/postgres/pg_hba.conf (macOS)
# Should have: host all all 127.0.0.1/32 md5
```

### Issue 2: Redis Connection Issues

**Symptom:**
```
Redis connection refused
```

**Solution:**
```bash
# Check Redis is running
redis-cli ping

# If not:
brew services start redis           # macOS
sudo systemctl start redis          # Linux

# Check Redis config
redis-cli CONFIG GET bind
# Should be: 127.0.0.1 or 0.0.0.0

# Check port
sudo lsof -i :6379
```

### Issue 3: Port Conflicts

**Symptom:**
```
Port 8080 already in use
Port 8000 already in use
```

**Solution:**
```bash
# Find process using port
lsof -ti:8080   # macOS/Linux
lsof -ti:8000

# Kill process
kill -9 <PID>

# Or use different ports
# Identity API: Change server.port in application-local.yml
# Biometric: Change PORT in .env.local
```

### Issue 4: ML Model Not Loading (PyCharm)

**Symptom:**
```
Model file not found
ValueError: Model not loaded
```

**Solution:**
```bash
# Download models (first time - can take 10 minutes)
cd biometric-processor
source venv/bin/activate

python -c "from deepface import DeepFace; DeepFace.build_model('VGG-Face')"

# Check models directory
ls -la models/
# Should see: VGG-Face.h5, haarcascade files

# If still failing, try different model
# In .env.local: MODEL_NAME=Facenet  # Lighter model
```

### Issue 5: Flyway Migration Conflicts

**Symptom:**
```
FlywayException: Validate failed
```

**Solution:**
```bash
# Option 1: Reset database (DEVELOPMENT ONLY!)
psql -U fivucsas_user -d fivucsas_dev
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO fivucsas_user;
\q

# Restart Identity API (migrations will re-run)

# Option 2: Repair Flyway
psql -U fivucsas_user -d fivucsas_dev -c "
DELETE FROM flyway_schema_history WHERE success = false;
"
```

### Issue 6: Cache Not Working

**Symptom:**
Cache hit rate is 0%, no keys in Redis

**Solution:**

**Check cache configuration:**

IntelliJ console should show:
```
INFO: Redis cache manager initialized
INFO: Created cache: embeddings, users, refresh_tokens, tenants
```

If not:
- Verify `spring.cache.type: redis` in application-local.yml
- Check `@EnableCaching` in CacheConfig.java
- Restart application

**Verify Redis database:**
```bash
# Make sure using database 0 for cache
redis-cli -n 0 KEYS "*"

# Check Identity API is connected to right database
# In application-local.yml: spring.data.redis.database: 0
```

### Issue 7: OutOfMemoryError

**Symptom:**
```
java.lang.OutOfMemoryError
```

**Solution:**

**IntelliJ (Identity API):**
- Edit Run Configuration
- VM options: `-Xmx4G -Xms1G`
- Restart application

**PyCharm (ML Models):**
```python
# Use lighter models
# In .env.local:
MODEL_NAME=Facenet  # Instead of VGG-Face
MODEL_BACKEND=opencv  # Instead of mtcnn

# Process smaller images
MAX_IMAGE_SIZE=5242880  # 5MB instead of 10MB
```

---

## Quick Reference

### Service URLs

| Service | URL | Docs |
|---------|-----|------|
| Identity API | http://localhost:8080 | /actuator |
| Biometric Processor | http://localhost:8000 | /docs |
| PostgreSQL (Identity) | localhost:5432/fivucsas_dev | - |
| PostgreSQL (Biometric) | localhost:5432/biometric_dev | - |
| Redis (Cache) | localhost:6379/0 | - |
| Redis (Queue) | localhost:6379/1 | - |

### Quick Commands

```bash
# Start databases
brew services start postgresql@15 redis  # macOS
sudo systemctl start postgresql redis    # Linux

# Check services
pg_isready && redis-cli ping

# Connect to databases
psql -U fivucsas_user -d fivucsas_dev
psql -U biometric_user -d biometric_dev
redis-cli -n 0  # Cache
redis-cli -n 1  # Queue

# Test applications
curl http://localhost:8080/actuator/health
curl http://localhost:8000/health

# View logs
# IntelliJ: Run panel
# PyCharm: Run panel
tail -f biometric-processor/logs/*.log
```

### IDE Shortcuts

**IntelliJ:**
- Run: Shift+F10
- Debug: Shift+F9
- Stop: Ctrl+F2
- Rebuild: Ctrl+Shift+F9
- Find: Ctrl+Shift+F

**PyCharm:**
- Run: Shift+F10
- Debug: Shift+F9
- Stop: Ctrl+F2
- Terminal: Alt+F12
- Find: Ctrl+Shift+F

---

## Next Steps

Once local development is working:

1. ✅ **Verify all optimizations locally**
2. ✅ **Run integration tests** in both IDEs
3. ✅ **Test end-to-end flows** (enrollment, verification)
4. ✅ **Measure local performance** (cache hit rate, latency)
5. ✅ **Fix any issues** found during testing
6. ➡️ **Move to Docker deployment** (docker-compose.optimized.yml)
7. ➡️ **Run K6 load tests** (from load-tests directory)
8. ➡️ **Deploy to staging** (follow STAGING_DEPLOYMENT_GUIDE.md)

---

## Summary

**You now have:**
- ✅ Both services running locally (no Docker needed)
- ✅ Full debugging capabilities in IDEs
- ✅ Fast development iteration (hot reload)
- ✅ All optimizations testable locally
- ✅ Integration between services working

**Benefits of local development:**
- 🚀 Faster iteration (no Docker rebuild)
- 🐛 Better debugging (breakpoints, step-through)
- 💡 IDE features (autocomplete, refactoring)
- 🧪 Easy testing (run individual tests)
- 📊 Performance profiling (IDE profilers)

**When ready for Docker:**
- Follow `STAGING_DEPLOYMENT_GUIDE.md`
- Use `docker-compose.optimized.yml`
- Run K6 load tests
- Deploy to production

---

**Last Updated**: 2025-11-12
**For**: IntelliJ IDEA 2023.2+, PyCharm 2023.2+
