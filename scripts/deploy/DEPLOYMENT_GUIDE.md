# FIVUCSAS Multi-Deployment Guide

This guide covers deploying all 4 components of FIVUCSAS.

## Quick Reference

| Component | Target | URL |
|-----------|--------|-----|
| Identity Core API | Hetzner VPS | http://116.203.222.213:8080 |
| Web Dashboard | Hostinger | https://app.fivucsas.com |
| Landing Website | Hostinger | https://fivucsas.com |
| Biometric API | Your Laptop via Cloudflare | https://bio.fivucsas.com |

---

## Track A: Identity-Core-API (Hetzner VPS)

### Prerequisites
- SSH access: `ssh -i ~/.ssh/hetzner_ed25519 root@116.203.222.213`
- Maven installed locally
- Docker & Docker Compose on Hetzner VPS

### Deployment Steps

**Option 1: Using the deployment script**
```powershell
# From FIVUCSAS root
.\scripts\deploy\deploy-identity-core-hetzner.ps1
```

**Option 2: Manual deployment**
```bash
# 1. Build JAR
cd identity-core-api
mvn clean package -DskipTests

# 2. Copy to Hetzner VPS
scp -i ~/.ssh/hetzner_ed25519 target/identity-core-api-1.0.0-MVP.jar root@116.203.222.213:/opt/identity-core-api/app.jar
scp -i ~/.ssh/hetzner_ed25519 docker-compose.yml root@116.203.222.213:/opt/identity-core-api/
scp -i ~/.ssh/hetzner_ed25519 .env.hetzner root@116.203.222.213:/opt/identity-core-api/.env
scp -i ~/.ssh/hetzner_ed25519 Dockerfile root@116.203.222.213:/opt/identity-core-api/

# 3. Deploy on Hetzner VPS
ssh -i ~/.ssh/hetzner_ed25519 root@116.203.222.213 "cd /opt/identity-core-api && docker compose down && docker compose up -d --build"

# 4. Verify
curl http://116.203.222.213:8080/actuator/health
```

### Verify
- Health: http://116.203.222.213:8080/actuator/health
- Swagger: http://116.203.222.213:8080/swagger-ui.html

---

## Track B: Web Dashboard (Hostinger)

### Build Output
The web-app is already built. Files are in `web-app/dist/`.

### Upload to Hostinger

1. **Login to Hostinger**
   - Go to https://hpanel.hostinger.com
   - Navigate to Files → File Manager

2. **Navigate to subdomain directory**
   - Find the directory for `app.fivucsas.com`
   - Usually under `domains/app.fivucsas.com/public_html/`

3. **Upload files**
   - Delete existing files (if any)
   - Upload entire contents of `web-app/dist/`:
     - `index.html`
     - `assets/` folder
     - `.htaccess`

4. **Verify `.htaccess` exists**
   Ensure the following file is at the root:
   ```apache
   <IfModule mod_rewrite.c>
     RewriteEngine On
     RewriteBase /
     RewriteRule ^index\.html$ - [L]
     RewriteCond %{REQUEST_FILENAME} !-f
     RewriteCond %{REQUEST_FILENAME} !-d
     RewriteRule . /index.html [L]
   </IfModule>
   ```

### Verify
- https://app.fivucsas.com should show login page

---

## Track C: Landing Website (Hostinger)

### Build Output
The landing website is already built. Files are in `landing-website/dist/`.

### Upload to Hostinger

1. **Login to Hostinger**
   - Go to https://hpanel.hostinger.com
   - Navigate to Files → File Manager

2. **Navigate to main domain directory**
   - Find the directory for `fivucsas.com`
   - Usually under `domains/fivucsas.com/public_html/`

3. **Upload files**
   - Delete existing files (if any)
   - Upload entire contents of `landing-website/dist/`:
     - `index.html`
     - `assets/` folder
     - `favicon.svg`
     - `.htaccess`

### Verify
- https://fivucsas.com should show landing page

---

## Track D: Biometric API (Your Laptop + Cloudflare)

### Prerequisites
- Windows 11 with WSL2 (you have v2.5.9.0 ✓)
- NVIDIA GPU with drivers (you have GTX 1650 ✓)
- Cloudflare account with `fivucsas.com` domain

### Step 1: WSL2 Setup

Open WSL2 Ubuntu:
```powershell
wsl -d Ubuntu
```

In WSL2, run the setup script:
```bash
cd /mnt/c/Users/ahabg/OneDrive/Belgeler/GitHub/FIVUCSAS/biometric-processor
sudo bash deploy/laptop-gpu/setup-wsl.sh
```

### Step 2: Configure Cloudflare Tunnel

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create biometric-api

# Note the tunnel ID (e.g., abc123-def456-...)

# Route DNS
cloudflared tunnel route dns biometric-api bio.fivucsas.com
```

### Step 3: Configure Tunnel

Create `~/.cloudflared/config.yml`:
```yaml
tunnel: <YOUR_TUNNEL_ID>
credentials-file: /home/<YOUR_USER>/.cloudflared/<YOUR_TUNNEL_ID>.json

protocol: http2

ingress:
  - hostname: bio.fivucsas.com
    service: http://localhost:8001
    originRequest:
      connectTimeout: 30s
      keepAliveTimeout: 90s
  - service: http_status:404
```

### Step 4: Start Services

**Terminal 1 - Biometric API:**
```bash
cd /opt/biometric-processor
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

**Terminal 2 - Cloudflare Tunnel:**
```bash
cloudflared tunnel run biometric-api
```

### Step 5: Verify

```bash
# Local
curl http://localhost:8001/api/v1/health

# Via Cloudflare
curl https://bio.fivucsas.com/api/v1/health
```

### Safety Notes
- Monitor GPU temperature: `watch -n 1 nvidia-smi`
- Your GTX 1650 has limited VRAM (4GB), may need to limit batch sizes
- Stop with Ctrl+C when not needed

---

## Full Verification Checklist

After all deployments:

| Service | Check Command | Expected |
|---------|--------------|----------|
| Identity API | `curl http://116.203.222.213:8080/actuator/health` | `{"status":"UP"}` |
| Web Dashboard | Browser: `https://app.fivucsas.com` | Login page |
| Landing | Browser: `https://fivucsas.com` | Landing page |
| Biometric API | `curl https://bio.fivucsas.com/api/v1/health` | `{"status":"healthy"}` |

---

## Troubleshooting

### Hetzner SSH Timeout
```bash
# Check if VPS is reachable
ssh -i ~/.ssh/hetzner_ed25519 root@116.203.222.213
```

### Hostinger 404 Errors
- Ensure `.htaccess` file exists and has correct content
- Check if mod_rewrite is enabled (contact Hostinger support)

### Cloudflare Tunnel Not Working
```bash
# Check tunnel status
cloudflared tunnel info biometric-api

# Check DNS
dig bio.fivucsas.com
```

### GPU Not Detected in WSL2
```bash
# Update WSL
wsl --update

# Restart WSL
wsl --shutdown
wsl -d Ubuntu

# Check GPU
nvidia-smi
```
