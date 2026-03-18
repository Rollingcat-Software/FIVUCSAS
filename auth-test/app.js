// ── Helpers ──────────────────────────────────────────────────────────

function getApiUrl() {
  return document.getElementById('apiUrl').value.replace(/\/+$/, '');
}

function getToken() {
  return localStorage.getItem('fivucsas_token');
}

function setToken(token) {
  localStorage.setItem('fivucsas_token', token);
  updateTokenUI();
}

function clearToken() {
  localStorage.removeItem('fivucsas_token');
  localStorage.removeItem('fivucsas_user_id');
  updateTokenUI();
}

function getUserId() {
  return localStorage.getItem('fivucsas_user_id');
}

function updateTokenUI() {
  var t = getToken();
  var el = document.getElementById('tokenInfo');
  if (t) {
    el.style.display = 'flex';
    document.getElementById('tokenPreview').textContent = t.substring(0, 20) + '...';
  } else {
    el.style.display = 'none';
  }
}

function formatMs(ms) {
  return ms < 1000 ? Math.round(ms) + 'ms' : (ms / 1000).toFixed(2) + 's';
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function timeStr() {
  var d = new Date();
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map(function(n) { return String(n).padStart(2, '0'); }).join(':');
}

function showResult(id, text, ok) {
  var el = document.getElementById(id);
  el.style.display = 'block';
  // Append instead of overwrite — add separator if existing content
  if (el.textContent.trim()) {
    var sep = document.createElement('div');
    sep.style.borderTop = '1px solid var(--border)';
    sep.style.margin = '8px 0';
    el.appendChild(sep);
  }
  var entry = document.createElement('pre');
  entry.textContent = '[' + timeStr() + '] ' + text;
  entry.style.margin = '0';
  entry.style.whiteSpace = 'pre-wrap';
  entry.style.color = ok ? 'var(--green)' : 'var(--red)';
  el.appendChild(entry);
  el.className = 'result-box';
  el.scrollTop = el.scrollHeight;
}

function randomBytes(len) {
  return crypto.getRandomValues(new Uint8Array(len));
}

function bufToBase64url(buf) {
  var bytes = new Uint8Array(buf);
  var s = '';
  bytes.forEach(function(b) { s += String.fromCharCode(b); });
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function escHtml(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Card Toggle ──────────────────────────────────────────────────────

function toggleCard(id) {
  document.getElementById(id).classList.toggle('open');
}

// ── API Log ──────────────────────────────────────────────────────────

var logEntries = [];

function addLogEntry(method, path, status, durationMs, reqBody, resBody) {
  var statusClass = status >= 500 ? 'status-5xx' :
                    status >= 400 ? 'status-4xx' :
                    status >= 200 && status < 300 ? 'status-2xx' : 'status-err';
  logEntries.push({
    method: method, path: path, status: status,
    durationMs: durationMs, reqBody: reqBody, resBody: resBody,
    time: timeStr(), statusClass: statusClass
  });
  renderLog();
}

function renderLog() {
  var body = document.getElementById('logBody');
  // Clear existing content safely
  while (body.firstChild) { body.removeChild(body.firstChild); }

  if (logEntries.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'log-empty';
    empty.textContent = 'No requests yet. Interact with the auth methods above.';
    body.appendChild(empty);
    return;
  }

  // Render in reverse order (newest first)
  for (var i = logEntries.length - 1; i >= 0; i--) {
    var e = logEntries[i];

    var entry = document.createElement('div');
    entry.className = 'log-entry ' + e.statusClass;
    entry.addEventListener('click', (function(el) {
      return function() { el.classList.toggle('expanded'); };
    })(entry));

    var summary = document.createElement('div');
    summary.className = 'log-summary';

    var timeSpan = document.createElement('span');
    timeSpan.className = 'log-time';
    timeSpan.textContent = '[' + e.time + ']';
    summary.appendChild(timeSpan);

    var methodSpan = document.createElement('span');
    methodSpan.className = 'log-method';
    methodSpan.textContent = e.method;
    summary.appendChild(methodSpan);

    var pathSpan = document.createElement('span');
    pathSpan.className = 'log-path';
    pathSpan.textContent = e.path;
    summary.appendChild(pathSpan);

    var statusSpan = document.createElement('span');
    statusSpan.className = 'log-status';
    statusSpan.textContent = e.status;
    summary.appendChild(statusSpan);

    var durSpan = document.createElement('span');
    durSpan.className = 'log-duration';
    durSpan.textContent = '(' + formatMs(e.durationMs) + ')';
    summary.appendChild(durSpan);

    entry.appendChild(summary);

    // Build detail text
    var detailText = '';
    if (e.reqBody) {
      detailText += 'REQUEST:\n' + (typeof e.reqBody === 'string' ? e.reqBody : JSON.stringify(e.reqBody, null, 2)) + '\n\n';
    }
    if (e.resBody) {
      detailText += 'RESPONSE:\n' + (typeof e.resBody === 'string' ? e.resBody : JSON.stringify(e.resBody, null, 2));
    }

    var detail = document.createElement('div');
    detail.className = 'log-detail';
    detail.textContent = detailText.trim();
    entry.appendChild(detail);

    body.appendChild(entry);
  }
  body.scrollTop = 0;
}

function clearLog() {
  logEntries = [];
  renderLog();
}

// ── API Call Wrapper ─────────────────────────────────────────────────

async function apiCall(method, path, body, extraHeaders) {
  var url = getApiUrl() + path;
  var headers = Object.assign({ 'Content-Type': 'application/json' }, extraHeaders || {});
  var token = getToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;

  var opts = { method: method, headers: headers };
  if (body && method !== 'GET') opts.body = JSON.stringify(body);

  var start = performance.now();
  try {
    var res = await fetch(url, opts);
    var elapsed = performance.now() - start;
    var text = await res.text();
    var resData;
    try { resData = JSON.parse(text); } catch(e) { resData = text; }
    addLogEntry(method, path, res.status, elapsed, body, resData);
    return { ok: res.ok, status: res.status, data: resData, elapsed: elapsed };
  } catch (err) {
    var elapsed2 = performance.now() - start;
    addLogEntry(method, path, 'ERR', elapsed2, body, err.message);
    return { ok: false, status: 0, data: null, error: err.message, elapsed: elapsed2 };
  }
}

// ── Connection Check ─────────────────────────────────────────────────

async function checkConnection() {
  var dot = document.getElementById('connDot');
  var txt = document.getElementById('connText');
  dot.className = 'status-dot yellow';
  txt.textContent = 'Checking...';
  try {
    var start = performance.now();
    var res = await fetch(getApiUrl() + '/actuator/health', { method: 'GET', signal: AbortSignal.timeout(5000) });
    var elapsed = performance.now() - start;
    var body = await res.text();
    if (res.ok) {
      dot.className = 'status-dot green';
      txt.textContent = 'Connected (' + formatMs(elapsed) + ')';
      addLogEntry('GET', '/actuator/health', res.status, elapsed, null, body);
    } else {
      dot.className = 'status-dot yellow';
      txt.textContent = 'HTTP ' + res.status;
      addLogEntry('GET', '/actuator/health', res.status, elapsed, null, body);
    }
  } catch (e) {
    dot.className = 'status-dot red';
    txt.textContent = 'Unreachable';
    addLogEntry('GET', '/health', 'ERR', 0, null, e.message);
  }
}

// ── 1. Password Login ────────────────────────────────────────────────

var loginInProgress = false;
async function doLogin() {
  if (loginInProgress) return;
  loginInProgress = true;
  document.getElementById('btnLogin').disabled = true;
  var email = document.getElementById('loginEmail').value || 'admin@fivucsas.local';
  var password = document.getElementById('loginPassword').value || 'Test@123';
  var res = await apiCall('POST', '/api/v1/auth/login', { email: email, password: password });
  if (res.ok && res.data) {
    var token = res.data.token || res.data.accessToken || res.data.access_token;
    if (token) setToken(token);
    if (res.data.user && res.data.user.id) {
      localStorage.setItem('fivucsas_user_id', res.data.user.id);
      showUserPanel(res.data.user);
    }
    showResult('loginResult',
      'Login successful (' + formatMs(res.elapsed) + ')\n\n' + JSON.stringify(res.data, null, 2), true);
  } else {
    showResult('loginResult',
      'Login failed: ' + (res.error || JSON.stringify(res.data, null, 2)), false);
  }
  loginInProgress = false;
  document.getElementById('btnLogin').disabled = false;
}

function showUserPanel(user) {
  var panel = document.getElementById('card-whoami');
  panel.style.display = 'block';
  panel.classList.add('open');
  document.getElementById('userStat-name').textContent = (user.firstName || '') + ' ' + (user.lastName || '');
  document.getElementById('userStat-email').textContent = user.email || '--';
  document.getElementById('userStat-role').textContent = (user.roles || [user.role]).join(', ');
  document.getElementById('userStat-tenant').textContent = user.tenantId || '--';
  document.getElementById('userStat-biometric').textContent = user.biometricEnrolled ? 'Enrolled' : 'Not enrolled';
  document.getElementById('userStat-biometric').style.color = user.biometricEnrolled ? 'var(--green)' : 'var(--yellow)';
  document.getElementById('userStat-verifications').textContent = user.verificationCount || 0;
  document.getElementById('userStat-id').textContent = user.id;
  document.getElementById('userStat-enrolled').textContent = user.enrolledAt ? new Date(user.enrolledAt).toLocaleString() : 'Never';
}

// ── 2. Face Verification ────────────────────────────────────────────

var faceStream = null;
var faceDetector = null;
var faceAnimFrame = null;
var faceFrameCount = 0;
var faceFpsStart = 0;
var lastQuality = null;
var lastQualityUpdateTime = 0;

// ── Quality Assessment (client-side, Canvas API) ──────────────────
// Mirrors server-side: blur (Laplacian variance), lighting (mean brightness), face size

function assessQuality(video, landmarks) {
  // Draw video frame to an offscreen canvas for pixel access
  var w = video.videoWidth, h = video.videoHeight;
  var offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  var offCtx = offCanvas.getContext('2d');
  offCtx.drawImage(video, 0, 0, w, h);
  var imageData = offCtx.getImageData(0, 0, w, h);
  var pixels = imageData.data;
  var totalPixels = w * h;

  // 1. Convert to grayscale array
  var gray = new Float32Array(totalPixels);
  for (var i = 0; i < totalPixels; i++) {
    var idx = i * 4;
    gray[i] = 0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2];
  }

  // 2. Lighting — mean brightness (0-255)
  var brightnessSum = 0;
  for (var i = 0; i < totalPixels; i++) {
    brightnessSum += gray[i];
  }
  var meanBrightness = brightnessSum / totalPixels;

  // Lighting score: 100 if in [80,180], drops linearly outside
  var lightingScore;
  if (meanBrightness >= 80 && meanBrightness <= 180) {
    lightingScore = 100;
  } else if (meanBrightness < 80) {
    lightingScore = Math.max(0, (meanBrightness / 80) * 100);
  } else {
    lightingScore = Math.max(0, ((255 - meanBrightness) / 75) * 100);
  }

  // 3. Blur detection — Laplacian variance on grayscale
  // 3x3 Laplacian kernel: [0,1,0; 1,-4,1; 0,1,0]
  // Sample every 4th pixel for performance (still accurate enough)
  var lapSum = 0, lapSumSq = 0, lapCount = 0;
  var step = 4; // sample every 4th pixel
  for (var y = 1; y < h - 1; y += step) {
    for (var x = 1; x < w - 1; x += step) {
      var center = gray[y * w + x];
      var lap = -4 * center
        + gray[(y - 1) * w + x]
        + gray[(y + 1) * w + x]
        + gray[y * w + (x - 1)]
        + gray[y * w + (x + 1)];
      lapSum += lap;
      lapSumSq += lap * lap;
      lapCount++;
    }
  }
  var lapMean = lapSum / lapCount;
  var lapVariance = (lapSumSq / lapCount) - (lapMean * lapMean);

  // Blur score: variance < 15 = blurry (score 0), > 500 = very sharp (score 100)
  // Linear scale between thresholds
  var BLUR_LOW = 15.0;
  var BLUR_HIGH = 500.0;
  var blurScore;
  if (lapVariance <= BLUR_LOW) {
    blurScore = 0;
  } else if (lapVariance >= BLUR_HIGH) {
    blurScore = 100;
  } else {
    blurScore = ((lapVariance - BLUR_LOW) / (BLUR_HIGH - BLUR_LOW)) * 100;
  }

  // 4. Face size — minimum dimension of face bounding box in pixels
  var faceSizePx = 0;
  var faceSizeScore = 0;
  if (landmarks && landmarks.length > 0) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    landmarks.forEach(function(lm) {
      var lx = lm.x * w, ly = lm.y * h;
      if (lx < minX) minX = lx; if (ly < minY) minY = ly;
      if (lx > maxX) maxX = lx; if (ly > maxY) maxY = ly;
    });
    faceSizePx = Math.min(maxX - minX, maxY - minY);
    // Face size score: < 80px = 0, > 250px = 100
    if (faceSizePx <= 80) {
      faceSizeScore = 0;
    } else if (faceSizePx >= 250) {
      faceSizeScore = 100;
    } else {
      faceSizeScore = ((faceSizePx - 80) / (250 - 80)) * 100;
    }
  }

  // 5. Overall: weighted average (blur 40% + lighting 30% + size 30%)
  var overall = blurScore * 0.4 + lightingScore * 0.3 + faceSizeScore * 0.3;

  return {
    blur: Math.round(blurScore),
    blurVariance: Math.round(lapVariance),
    lighting: Math.round(lightingScore),
    brightness: Math.round(meanBrightness),
    faceSize: Math.round(faceSizePx),
    faceSizeScore: Math.round(faceSizeScore),
    overall: Math.round(overall),
    acceptable: overall >= 40
  };
}

async function startFaceDetection() {
  var video = document.getElementById('faceVideo');
  var container = document.getElementById('faceContainer');
  var statsEl = document.getElementById('faceStats');
  document.getElementById('faceStartBtn').disabled = true;
  document.getElementById('faceStopBtn').disabled = false;
  document.getElementById('faceCaptureBtn').disabled = false;
  document.getElementById('btnLivenessPuzzle').disabled = false;
  document.getElementById('btnBankEnroll').disabled = false;
  document.getElementById('btnFaceEmbedding').disabled = false;
  container.style.display = 'block';
  statsEl.style.display = 'grid';

  try {
    faceStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 4096 }, height: { ideal: 2160 } } });
    video.srcObject = faceStream;
    video.addEventListener('loadedmetadata', function() {
      document.getElementById('faceOverlay').textContent = 'Camera: ' + video.videoWidth + 'x' + video.videoHeight;
    });
    document.getElementById('faceStat-status').textContent = 'Camera OK';

    // Try loading MediaPipe
    try {
      var modelStart = performance.now();
      var vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs');
      var FaceLandmarker = vision.FaceLandmarker;
      var FilesetResolver = vision.FilesetResolver;
      var filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      faceDetector = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task', delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false
      });
      var modelTime = performance.now() - modelStart;
      document.getElementById('faceStat-model').textContent = formatMs(modelTime);
      faceFrameCount = 0;
      faceFpsStart = performance.now();
      detectFaceLoop();
    } catch (e) {
      document.getElementById('faceStat-model').textContent = 'Failed';
      document.getElementById('faceOverlay').textContent = 'MediaPipe unavailable - camera only';
      console.warn('MediaPipe load failed:', e);
    }
  } catch (e) {
    showResult('faceResult', 'Camera error: ' + e.message, false);
    document.getElementById('faceStartBtn').disabled = false;
  }
}

function detectFaceLoop() {
  if (!faceStream || !faceDetector) return;
  var video = document.getElementById('faceVideo');
  var canvas = document.getElementById('faceCanvas');
  var ctx = canvas.getContext('2d');
  if (video.readyState < 2) {
    faceAnimFrame = requestAnimationFrame(detectFaceLoop);
    return;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  try {
    var result = faceDetector.detectForVideo(video, performance.now());
    faceFrameCount++;
    var elapsed = performance.now() - faceFpsStart;
    if (elapsed > 1000) {
      document.getElementById('faceStat-fps').textContent = Math.round(faceFrameCount / (elapsed / 1000));
      faceFrameCount = 0;
      faceFpsStart = performance.now();
    }

    var cx = canvas.width / 2, cy = canvas.height / 2;

    // Draw centering guide oval
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.ellipse(cx, cy, canvas.width * 0.22, canvas.height * 0.38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
      var landmarks = result.faceLandmarks[0]; // 478 landmarks
      lastFaceLandmarks = landmarks; // Store for face cropping on capture

      // Compute bounding box from landmarks
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      landmarks.forEach(function(lm) {
        var lx = lm.x * canvas.width, ly = lm.y * canvas.height;
        if (lx < minX) minX = lx; if (ly < minY) minY = ly;
        if (lx > maxX) maxX = lx; if (ly > maxY) maxY = ly;
      });
      var bbW = maxX - minX, bbH = maxY - minY;
      var faceCx = minX + bbW / 2, faceCy = minY + bbH / 2;
      var faceArea = bbW * bbH;
      var frameArea = canvas.width * canvas.height;
      var faceRatio = faceArea / frameArea;

      // Quality checks
      var isCentered = Math.abs(faceCx - cx) < canvas.width * 0.12 && Math.abs(faceCy - cy) < canvas.height * 0.12;
      var isTooClose = faceRatio > 0.35;
      var isTooFar = faceRatio < 0.03;
      var isGoodSize = !isTooClose && !isTooFar;
      var isReady = isCentered && isGoodSize;

      var boxColor = isReady ? '#3fb950' : (isCentered && isGoodSize ? '#d29922' : '#f85149');

      // Draw all 478 face landmarks as mesh
      // Face oval (silhouette) indices
      var silhouette = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
      // Draw mesh connections (tessellation)
      ctx.strokeStyle = boxColor + '40'; // semi-transparent
      ctx.lineWidth = 0.5;
      for (var i = 0; i < landmarks.length; i++) {
        var lm = landmarks[i];
        var lx = lm.x * canvas.width, ly = lm.y * canvas.height;
        // Draw tiny dots for each landmark
        ctx.fillStyle = boxColor + '60';
        ctx.fillRect(lx - 0.5, ly - 0.5, 1, 1);
      }

      // Draw face oval outline
      ctx.strokeStyle = boxColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      silhouette.forEach(function(idx, i) {
        var lm = landmarks[idx];
        var lx = lm.x * canvas.width, ly = lm.y * canvas.height;
        if (i === 0) ctx.moveTo(lx, ly); else ctx.lineTo(lx, ly);
      });
      ctx.closePath();
      ctx.stroke();

      // Draw key feature points: eyes, nose, mouth (larger dots)
      var keyIndices = [
        // Left eye
        33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
        // Right eye
        362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
        // Left eyebrow
        46, 53, 52, 65, 55, 70, 63, 105, 66, 107,
        // Right eyebrow
        276, 283, 282, 295, 285, 300, 293, 334, 296, 336,
        // Nose
        1, 2, 98, 327, 4, 5, 195, 197,
        // Lips outer
        61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
        // Lips inner
        78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95
      ];
      ctx.fillStyle = boxColor;
      keyIndices.forEach(function(idx) {
        if (idx < landmarks.length) {
          var lm = landmarks[idx];
          var lx = lm.x * canvas.width, ly = lm.y * canvas.height;
          ctx.beginPath();
          ctx.arc(lx, ly, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw iris centers (landmarks 468-477 if available)
      if (landmarks.length > 468) {
        ctx.fillStyle = '#58a6ff';
        [468, 473].forEach(function(idx) { // left iris, right iris centers
          if (idx < landmarks.length) {
            var lm = landmarks[idx];
            var lx = lm.x * canvas.width, ly = lm.y * canvas.height;
            ctx.beginPath();
            ctx.arc(lx, ly, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      // Corner accents on bounding box
      var pad = 10;
      var bx = minX - pad, by = minY - pad, bw = bbW + pad * 2, bh = bbH + pad * 2;
      var cornerLen = Math.min(bw, bh) * 0.15;
      ctx.lineWidth = 3;
      ctx.strokeStyle = boxColor;
      ctx.beginPath(); ctx.moveTo(bx, by + cornerLen); ctx.lineTo(bx, by); ctx.lineTo(bx + cornerLen, by); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw - cornerLen, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + cornerLen); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by + bh - cornerLen); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + cornerLen, by + bh); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx + bw - cornerLen, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - cornerLen); ctx.stroke();

      // Confidence bar
      ctx.fillStyle = boxColor;
      ctx.fillRect(bx, by - 6, bw, 4);

      // Label
      ctx.font = '13px monospace';
      ctx.fillStyle = boxColor;
      ctx.fillText(landmarks.length + ' pts | ' + bbW.toFixed(0) + 'x' + bbH.toFixed(0) + 'px', bx, by - 10);

      var statusMsg = isReady ? 'READY — Capture now' : (isTooClose ? 'Too close' : (isTooFar ? 'Move closer' : (!isCentered ? 'Center your face' : 'Hold still...')));
      document.getElementById('faceStat-status').textContent = statusMsg;
      document.getElementById('faceStat-status').style.color = boxColor;
      document.getElementById('faceStat-confidence').textContent = landmarks.length + ' landmarks';
      document.getElementById('faceOverlay').textContent = statusMsg;
      document.getElementById('faceOverlay').style.color = boxColor;
      document.getElementById('faceStat-model').textContent = (faceRatio * 100).toFixed(1) + '% of frame';

      // Quality assessment — throttled to every 500ms
      var now = performance.now();
      if (now - lastQualityUpdateTime > 500) {
        lastQualityUpdateTime = now;
        lastQuality = assessQuality(video, landmarks);
        var q = lastQuality;

        // Color coding: green (>70), yellow (40-70), red (<40)
        var qualityColor = q.overall > 70 ? 'var(--green)' : (q.overall >= 40 ? 'var(--yellow)' : 'var(--red)');
        var blurColor = q.blur > 70 ? 'var(--green)' : (q.blur >= 40 ? 'var(--yellow)' : 'var(--red)');
        var lightColor = q.lighting > 70 ? 'var(--green)' : (q.lighting >= 40 ? 'var(--yellow)' : 'var(--red)');

        var qualityLabel = q.overall > 70 ? 'Good' : (q.overall >= 40 ? 'Fair' : 'Poor');
        document.getElementById('faceStat-quality').textContent = qualityLabel + ' (' + q.overall + ')';
        document.getElementById('faceStat-quality').style.color = qualityColor;
        document.getElementById('faceStat-blur').textContent = q.blur + ' (var:' + q.blurVariance + ')';
        document.getElementById('faceStat-blur').style.color = blurColor;
        document.getElementById('faceStat-lighting').textContent = q.lighting + ' (br:' + q.brightness + ')';
        document.getElementById('faceStat-lighting').style.color = lightColor;
      }
    } else {
      lastFaceLandmarks = null;
      lastQuality = null;
      document.getElementById('faceStat-status').textContent = 'No face';
      document.getElementById('faceStat-status').style.color = 'var(--red)';
      document.getElementById('faceStat-confidence').textContent = '--';
      document.getElementById('faceOverlay').textContent = 'Position your face in the oval guide';
      document.getElementById('faceOverlay').style.color = 'var(--text-secondary)';
      document.getElementById('faceStat-quality').textContent = '--';
      document.getElementById('faceStat-quality').style.color = '';
      document.getElementById('faceStat-blur').textContent = '--';
      document.getElementById('faceStat-blur').style.color = '';
      document.getElementById('faceStat-lighting').textContent = '--';
      document.getElementById('faceStat-lighting').style.color = '';
    }
  } catch (e) { /* skip frame */ }

  faceAnimFrame = requestAnimationFrame(detectFaceLoop);
}

function stopFaceDetection() {
  if (faceAnimFrame) cancelAnimationFrame(faceAnimFrame);
  if (faceStream) { faceStream.getTracks().forEach(function(t) { t.stop(); }); faceStream = null; }
  if (faceDetector) { faceDetector.close(); faceDetector = null; }
  lastFaceLandmarks = null;
  document.getElementById('faceContainer').style.display = 'none';
  document.getElementById('faceStartBtn').disabled = false;
  document.getElementById('faceStopBtn').disabled = true;
  document.getElementById('faceCaptureBtn').disabled = true;
  document.getElementById('btnLivenessPuzzle').disabled = true;
  document.getElementById('btnBankEnroll').disabled = true;
  document.getElementById('btnFaceEmbedding').disabled = true;
}

var lastFaceBlob = null;

// Store last detected face landmarks for cropping
var lastFaceLandmarks = null;

function captureFace() {
  // Quality gate — block capture if quality is too poor
  if (lastQuality) {
    if (lastQuality.overall < 40) {
      showResult('faceResult', 'Image quality too poor (score: ' + lastQuality.overall + '/100).\n' +
        'Blur: ' + lastQuality.blur + ', Lighting: ' + lastQuality.lighting + ', Face Size: ' + lastQuality.faceSizeScore + '\n' +
        'Improve lighting, hold camera steady, and position face closer.', false);
      return;
    }
    if (lastQuality.overall < 70) {
      showResult('faceResult', 'Warning: Image quality is fair (score: ' + lastQuality.overall + '/100).\n' +
        'Blur: ' + lastQuality.blur + ', Lighting: ' + lastQuality.lighting + ', Face Size: ' + lastQuality.faceSizeScore + '\n' +
        'Proceeding with capture, but results may be less reliable.', true);
    }
  }

  var video = document.getElementById('faceVideo');
  var c = document.createElement('canvas');
  var w = video.videoWidth, h = video.videoHeight;

  // If we have face landmarks, crop to just the face region with 30% padding
  // This prevents "multiple faces" errors from background faces (photos on walls, monitors)
  if (lastFaceLandmarks && lastFaceLandmarks.length > 0) {
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    lastFaceLandmarks.forEach(function(lm) {
      var lx = lm.x * w, ly = lm.y * h;
      if (lx < minX) minX = lx; if (ly < minY) minY = ly;
      if (lx > maxX) maxX = lx; if (ly > maxY) maxY = ly;
    });
    var bbW = maxX - minX, bbH = maxY - minY;
    var padX = bbW * 0.6, padY = bbH * 0.6;
    var cropX = Math.max(0, Math.floor(minX - padX));
    var cropY = Math.max(0, Math.floor(minY - padY));
    var cropW = Math.min(w - cropX, Math.ceil(bbW + padX * 2));
    var cropH = Math.min(h - cropY, Math.ceil(bbH + padY * 2));

    // Resize to max 720px to prevent "multiple faces" on high-res mobile cameras
    var maxDim = 720;
    var scale = 1;
    if (cropW > maxDim || cropH > maxDim) {
      scale = maxDim / Math.max(cropW, cropH);
    }
    c.width = Math.round(cropW * scale);
    c.height = Math.round(cropH * scale);
    c.getContext('2d').drawImage(video, cropX, cropY, cropW, cropH, 0, 0, c.width, c.height);

    console.log('[captureFace] Cropped+resized: ' + c.width + 'x' + c.height +
      ' from ' + w + 'x' + h + ' (crop ' + cropW + 'x' + cropH + ', scale ' + scale.toFixed(2) + ')');
  } else {
    // Fallback: capture full frame, resize if needed
    var maxFull = 720;
    var fullScale = Math.min(1, maxFull / Math.max(w, h));
    c.width = Math.round(w * fullScale);
    c.height = Math.round(h * fullScale);
    c.getContext('2d').drawImage(video, 0, 0, w, h, 0, 0, c.width, c.height);
    console.log('[captureFace] Full frame resized: ' + c.width + 'x' + c.height + ' from ' + w + 'x' + h);
  }

  c.toBlob(function(blob) {
    lastFaceBlob = blob;
    // Enable all face action buttons
    var faceButtons = ['btnFaceEnroll', 'btnFaceVerify', 'btnFaceSearch', 'btnLivenessPuzzle', 'btnBankEnroll'];
    faceButtons.forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
      } else {
        console.warn('[captureFace] Button not found: ' + id);
      }
    });
    var cropped = lastFaceLandmarks ? ' (face-cropped)' : ' (full frame)';
    showResult('faceResult',
      'Captured frame: ' + formatBytes(blob.size) + ' JPEG' + cropped +
      '\nResolution: ' + c.width + 'x' + c.height +
      '\n\nReady — click Enroll or Verify below.', true);
  }, 'image/jpeg', 0.92);
}

async function enrollFace() {
  var uid = getUserId();
  if (!uid) { showResult('faceResult', 'Login first to get user ID.', false); return; }
  if (!lastFaceBlob) { showResult('faceResult', 'Capture a face frame first.', false); return; }

  var formData = new FormData();
  formData.append('image', lastFaceBlob, 'face.jpg');

  var start = performance.now();
  try {
    var token = getToken();
    var res = await fetch(getApiUrl() + '/api/v1/biometric/enroll/' + uid, {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: formData
    });
    var elapsed = performance.now() - start;
    var data = await res.json().catch(function() { return null; });
    addLogEntry('POST', '/api/v1/biometric/enroll/' + uid, res.status, elapsed, '(multipart image)', data);

    if (res.ok && data) {
      showResult('faceResult', 'Face enrolled! (' + formatMs(elapsed) + ')\n\n' + JSON.stringify(data, null, 2), true);
    } else {
      showResult('faceResult', 'Enrollment failed (' + res.status + '): ' + JSON.stringify(data, null, 2), false);
    }
  } catch (e) {
    showResult('faceResult', 'Enrollment error: ' + e.message, false);
    addLogEntry('POST', '/api/v1/biometric/enroll/' + uid, 'ERR', performance.now() - start, null, e.message);
  }
}

async function verifyFace() {
  var uid = getUserId();
  if (!uid) { showResult('faceResult', 'Login first to get user ID.', false); return; }
  if (!lastFaceBlob) { showResult('faceResult', 'Capture a face frame first.', false); return; }

  var formData = new FormData();
  formData.append('image', lastFaceBlob, 'face.jpg');

  var start = performance.now();
  try {
    var token = getToken();
    var res = await fetch(getApiUrl() + '/api/v1/biometric/verify/' + uid, {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: formData
    });
    var elapsed = performance.now() - start;
    var data = await res.json().catch(function() { return null; });
    addLogEntry('POST', '/api/v1/biometric/verify/' + uid, res.status, elapsed, '(multipart image)', data);

    if (res.ok && data) {
      var msg = data.verified
        ? 'VERIFIED! Confidence: ' + ((data.confidence || 0) * 100).toFixed(1) + '%'
        : 'NOT VERIFIED. Confidence: ' + ((data.confidence || 0) * 100).toFixed(1) + '%';
      showResult('faceResult', msg + ' (' + formatMs(elapsed) + ')\n\n' + JSON.stringify(data, null, 2), data.verified);
    } else {
      showResult('faceResult', 'Verification failed (' + res.status + '): ' + JSON.stringify(data, null, 2), false);
    }
  } catch (e) {
    showResult('faceResult', 'Verification error: ' + e.message, false);
    addLogEntry('POST', '/api/v1/biometric/verify/' + uid, 'ERR', performance.now() - start, null, e.message);
  }
}

async function searchFace() {
  if (!lastFaceBlob) { showResult('faceResult', 'Capture a face frame first.', false); return; }

  var formData = new FormData();
  formData.append('file', lastFaceBlob, 'face.jpg');

  var start = performance.now();
  try {
    var token = getToken();
    var res = await fetch(getApiUrl() + '/api/v1/biometric/search', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: formData
    });
    var elapsed = performance.now() - start;
    var data = await res.json().catch(function() { return null; });
    addLogEntry('POST', '/api/v1/biometric/search', res.status, elapsed, '(multipart image)', data);

    if (res.ok && data) {
      var matches = data.matches || data.results || [];
      if (matches.length > 0) {
        var lines = 'FACE IDENTIFIED! (' + formatMs(elapsed) + ')\n\n';
        for (var i = 0; i < matches.length; i++) {
          var m = matches[i];
          var sim = m.similarity ? (m.similarity * 100).toFixed(1) : ((1 - (m.distance || 0)) * 100).toFixed(1);
          lines += '#' + (i + 1) + ' User: ' + m.user_id + ' | Similarity: ' + sim + '%\n';
        }
        // Fetch user info for top match
        try {
          var topId = matches[0].user_id;
          var userRes = await fetch(getApiUrl() + '/api/v1/users/' + topId, {
            headers: token ? { 'Authorization': 'Bearer ' + token } : {}
          });
          if (userRes.ok) {
            var user = await userRes.json();
            lines += '\n--- Top Match ---\n';
            lines += 'Name: ' + (user.firstName || '') + ' ' + (user.lastName || '') + '\n';
            lines += 'Email: ' + (user.email || '--') + '\n';
            lines += 'Role: ' + (user.role || '--') + '\n';
            lines += 'Enrolled: ' + (user.enrolledAt ? new Date(user.enrolledAt).toLocaleString() : 'N/A') + '\n';
            lines += 'Verifications: ' + (user.verificationCount || 0);
          }
        } catch (e) { /* optional */ }
        showResult('faceResult', lines, true);
      } else {
        showResult('faceResult', 'No match found. This face is not enrolled. (' + formatMs(elapsed) + ')\n\n' + JSON.stringify(data, null, 2), false);
      }
    } else {
      showResult('faceResult', 'Search failed (' + (res.status || 'ERR') + '): ' + JSON.stringify(data, null, 2), false);
    }
  } catch (e) {
    showResult('faceResult', 'Search error: ' + e.message, false);
    addLogEntry('POST', '/api/v1/biometric/search', 'ERR', performance.now() - start, null, e.message);
  }
}

async function deleteFaceEnrollment() {
  var uid = getUserId();
  if (!uid) { showResult('faceResult', 'Login first.', false); return; }
  var res = await apiCall('DELETE', '/api/v1/biometric/face/' + uid, null);
  showResult('faceResult', res.ok
    ? 'Enrollment deleted. You can now enroll a different face.'
    : 'Delete failed (' + (res.status || 'ERR') + '): ' + JSON.stringify(res.data, null, 2), res.ok);
}

// ── Client-Side Face Embedding (512-dim from landmarks) ─────────────

var lastFaceEmbedding = null;
var previousFaceEmbedding = null;

// Key landmark indices for geometric face descriptor
var EMBEDDING_LANDMARK_PAIRS = (function() {
  var leftEye = [33, 160, 158, 133, 153, 144];
  var rightEye = [362, 385, 387, 263, 373, 380];
  var nose = [1, 2, 4, 5, 6, 195, 197, 98, 327];
  var mouth = [61, 291, 0, 17, 13, 14, 78, 308, 82, 312, 87, 317];
  var jaw = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
  var eyebrowL = [46, 53, 52, 65, 55, 70, 63, 105, 66, 107];
  var eyebrowR = [276, 283, 282, 295, 285, 300, 293, 334, 296, 336];
  var forehead = [10, 67, 109, 338, 297];
  var cheeks = [116, 123, 147, 187, 345, 352, 376, 411];
  var chin = [152, 148, 377, 400, 378, 379];
  var all = [].concat(leftEye, rightEye, nose, mouth, jaw, eyebrowL, eyebrowR, forehead, cheeks, chin);
  var pairs = [];
  for (var i = 0; i < all.length; i++) {
    for (var j = i + 1; j < all.length; j++) {
      pairs.push([all[i], all[j]]);
    }
  }
  return pairs;
})();

var EMBEDDING_ANGLE_TRIPLETS = [
  [33, 1, 263],    // left eye corner - nose tip - right eye corner
  [133, 1, 362],   // inner eye corners through nose
  [70, 33, 147],   // left eyebrow - left eye - left cheek
  [300, 263, 376], // right eyebrow - right eye - right cheek
  [98, 1, 327],    // nose wings through nose tip
  [2, 0, 17],      // nose bridge - upper lip - lower lip
  [127, 152, 356], // jaw corners through chin
  [234, 152, 454], // wider jaw measurement
  [10, 1, 152],    // forehead top - nose - chin
  [33, 61, 263],   // left eye - left mouth - right eye
  [33, 291, 263],  // left eye - right mouth - right eye
  [33, 4, 133],    // around left eye through nose
  [362, 4, 263],   // around right eye through nose
  [61, 13, 291],   // mouth corners through upper lip center
  [61, 14, 291],   // mouth corners through lower lip center
  [78, 13, 308],   // inner mouth corners through center
  [58, 152, 288],  // jaw points through chin
  [132, 377, 361], // cross-jaw angles
  [46, 1, 276],    // eyebrow inner corners through nose
  [105, 4, 334],   // eyebrow outer corners through nose
  [116, 1, 345],   // cheek-nose-cheek
  [187, 152, 411], // lower cheek through chin
  [10, 33, 152],   // forehead-eye-chin
  [10, 263, 152],  // forehead-eye-chin (right)
  [10, 61, 152],   // forehead-mouth-chin
  [10, 4, 61],     // forehead-nose-mouth
  [4, 61, 152],    // nose-mouth-chin
  [4, 291, 152],   // nose-mouth-chin (right)
  [127, 10, 356],  // temple-forehead-temple
  [234, 1, 454],   // ear-nose-ear
  [93, 4, 323],    // mid-face width at nose
  [58, 17, 288]    // jaw width at lower lip
];

function computeLandmarkEmbedding(landmarks) {
  if (!landmarks || landmarks.length < 468) return null;

  var embedding = new Float32Array(512);
  var idx = 0;

  // 1. Compute face bounding box for normalization
  var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  var minZ = Infinity, maxZ = -Infinity;
  for (var i = 0; i < landmarks.length; i++) {
    var lm = landmarks[i];
    if (lm.x < minX) minX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y > maxY) maxY = lm.y;
    if (lm.z !== undefined) {
      if (lm.z < minZ) minZ = lm.z;
      if (lm.z > maxZ) maxZ = lm.z;
    }
  }
  var faceW = maxX - minX;
  var faceH = maxY - minY;
  var faceZ = (maxZ !== -Infinity) ? (maxZ - minZ) : 1;
  if (faceW < 0.001) faceW = 0.001;
  if (faceH < 0.001) faceH = 0.001;
  if (faceZ < 0.001) faceZ = 0.001;
  var faceCx = (minX + maxX) / 2;
  var faceCy = (minY + maxY) / 2;

  // 2. Pairwise distances between key landmarks (normalized by face size)
  var numDistances = Math.min(220, EMBEDDING_LANDMARK_PAIRS.length);
  for (var p = 0; p < numDistances; p++) {
    var pair = EMBEDDING_LANDMARK_PAIRS[p];
    var a = landmarks[pair[0]];
    var b = landmarks[pair[1]];
    if (!a || !b) { embedding[idx++] = 0; continue; }
    var dx = (a.x - b.x) / faceW;
    var dy = (a.y - b.y) / faceH;
    var dz = ((a.z || 0) - (b.z || 0)) / faceZ;
    embedding[idx++] = Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // 3. Angles between key triplets (normalized to [-1, 1] via cosine)
  var numAngles = Math.min(32, EMBEDDING_ANGLE_TRIPLETS.length);
  for (var t = 0; t < numAngles; t++) {
    var triplet = EMBEDDING_ANGLE_TRIPLETS[t];
    var p1 = landmarks[triplet[0]];
    var p2 = landmarks[triplet[1]];
    var p3 = landmarks[triplet[2]];
    if (!p1 || !p2 || !p3) { embedding[idx++] = 0; continue; }
    var v1x = (p1.x - p2.x) / faceW;
    var v1y = (p1.y - p2.y) / faceH;
    var v2x = (p3.x - p2.x) / faceW;
    var v2y = (p3.y - p2.y) / faceH;
    var dot = v1x * v2x + v1y * v2y;
    var mag1 = Math.sqrt(v1x * v1x + v1y * v1y);
    var mag2 = Math.sqrt(v2x * v2x + v2y * v2y);
    embedding[idx++] = (mag1 > 0 && mag2 > 0) ? dot / (mag1 * mag2) : 0;
  }

  // 4. Normalized coordinates of key landmarks relative to face center
  var coordLandmarks = [
    33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
    362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398,
    468, 473,
    46, 53, 52, 65, 55, 70, 63, 105, 66, 107,
    276, 283, 282, 295, 285, 300, 293, 334, 296, 336,
    1, 2, 4, 5, 6, 195, 197, 98, 327, 168,
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
    78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];
  var remaining = 512 - idx;
  var numCoords = Math.min(Math.floor(remaining / 2), coordLandmarks.length);
  for (var c = 0; c < numCoords; c++) {
    var li = coordLandmarks[c];
    var lm = landmarks[li];
    if (!lm) { embedding[idx++] = 0; embedding[idx++] = 0; continue; }
    embedding[idx++] = (lm.x - faceCx) / faceW;
    embedding[idx++] = (lm.y - faceCy) / faceH;
  }

  // Fill remaining with depth features
  while (idx < 512) {
    var depthIdx = idx % landmarks.length;
    embedding[idx] = ((landmarks[depthIdx].z || 0) - minZ) / faceZ;
    idx++;
  }

  // 5. L2 normalize
  var norm = 0;
  for (var n = 0; n < 512; n++) {
    norm += embedding[n] * embedding[n];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (var n = 0; n < 512; n++) {
      embedding[n] = embedding[n] / norm;
    }
  }

  return embedding;
}

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  var dot = 0, normA = 0, normB = 0;
  for (var i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

function computeAndShowEmbedding() {
  if (!lastFaceLandmarks || lastFaceLandmarks.length < 468) {
    showResult('faceResult', 'No face landmarks available. Start camera and detect a face first.', false);
    return;
  }

  var start = performance.now();
  var embedding = computeLandmarkEmbedding(lastFaceLandmarks);
  var elapsed = performance.now() - start;

  if (!embedding) {
    showResult('faceResult', 'Failed to compute embedding from landmarks.', false);
    return;
  }

  // Store for comparison
  previousFaceEmbedding = lastFaceEmbedding;
  lastFaceEmbedding = embedding;

  // Show stats
  var statsEl = document.getElementById('embeddingStats');
  statsEl.style.display = 'grid';
  document.getElementById('embStat-dim').textContent = embedding.length + '-dim';
  document.getElementById('embStat-time').textContent = formatMs(elapsed);

  var preview = [];
  for (var i = 0; i < 5; i++) {
    preview.push(embedding[i].toFixed(4));
  }
  document.getElementById('embStat-preview').textContent = '[' + preview.join(', ') + ', ...]';

  // Similarity with previous embedding
  var simText = '--';
  if (previousFaceEmbedding) {
    var sim = cosineSimilarity(embedding, previousFaceEmbedding);
    var simPct = (sim * 100).toFixed(1);
    simText = simPct + '%';
    var simColor = sim > 0.85 ? 'var(--green)' : (sim > 0.6 ? 'var(--yellow)' : 'var(--red)');
    document.getElementById('embStat-similarity').style.color = simColor;
  } else {
    simText = 'Capture again to compare';
    document.getElementById('embStat-similarity').style.color = 'var(--text-muted)';
  }
  document.getElementById('embStat-similarity').textContent = simText;

  // Result text
  var resultLines = 'Landmark Embedding computed in ' + formatMs(elapsed) + '\n';
  resultLines += 'Dimension: ' + embedding.length + '\n';
  resultLines += 'Source: MediaPipe 478 landmarks (geometry-based)\n';
  resultLines += 'First 10: [' + Array.from(embedding.slice(0, 10)).map(function(v) { return v.toFixed(4); }).join(', ') + ']\n';
  resultLines += 'L2 norm: ' + Math.sqrt(Array.from(embedding).reduce(function(s, v) { return s + v * v; }, 0)).toFixed(4) + '\n';

  if (previousFaceEmbedding) {
    var sim2 = cosineSimilarity(embedding, previousFaceEmbedding);
    resultLines += '\nComparison with previous embedding:\n';
    resultLines += 'Cosine similarity: ' + (sim2 * 100).toFixed(1) + '%\n';
    if (sim2 > 0.85) {
      resultLines += 'Verdict: SAME PERSON (high similarity)\n';
    } else if (sim2 > 0.6) {
      resultLines += 'Verdict: UNCERTAIN (moderate similarity)\n';
    } else {
      resultLines += 'Verdict: DIFFERENT PERSON (low similarity)\n';
    }
  } else {
    resultLines += '\nClick Compute Embedding again with a different pose or person to compare.';
  }

  var embeddingBytes = embedding.length * 4;
  resultLines += '\nEmbedding size: ' + formatBytes(embeddingBytes) + ' (vs ~100-500KB JPEG image)';

  showResult('faceResult', resultLines, true);
}

// ── 3. NFC ───────────────────────────────────────────────────────────

function initNfc() {
  var el = document.getElementById('nfcContent');
  // Clear existing content
  while (el.firstChild) { el.removeChild(el.firstChild); }

  if ('NDEFReader' in window) {
    var actionsDiv = document.createElement('div');
    actionsDiv.className = 'form-actions';
    actionsDiv.style.marginBottom = '12px';
    var scanBtn = document.createElement('button');
    scanBtn.className = 'btn btn-primary';
    scanBtn.textContent = 'Scan NFC Tag';
    scanBtn.addEventListener('click', scanNfc);
    actionsDiv.appendChild(scanBtn);
    el.appendChild(actionsDiv);

    var statsDiv = document.createElement('div');
    statsDiv.className = 'stats';
    statsDiv.id = 'nfcStats';
    statsDiv.style.display = 'none';

    var labels = ['Serial', 'Records', 'Type'];
    var ids = ['nfcStat-serial', 'nfcStat-records', 'nfcStat-type'];
    for (var i = 0; i < labels.length; i++) {
      var stat = document.createElement('div');
      stat.className = 'stat';
      var lbl = document.createElement('div');
      lbl.className = 'stat-label';
      lbl.textContent = labels[i];
      var val = document.createElement('div');
      val.className = 'stat-value';
      val.id = ids[i];
      val.textContent = '--';
      stat.appendChild(lbl);
      stat.appendChild(val);
      statsDiv.appendChild(stat);
    }
    el.appendChild(statsDiv);
  } else {
    var p = document.createElement('p');
    p.className = 'info-text';
    p.style.marginTop = '0';

    var line1 = document.createTextNode('Web NFC is ');
    var strong1 = document.createElement('strong');
    strong1.textContent = 'not supported';
    var line2 = document.createTextNode(' in this browser.');
    var br1 = document.createElement('br');
    var line3 = document.createTextNode('NFC authentication requires the ');
    var strong2 = document.createElement('strong');
    strong2.textContent = 'FIVUCSAS mobile app';
    var line4 = document.createTextNode(' or Chrome on Android with NFC hardware.');
    var br2 = document.createElement('br');
    var br3 = document.createElement('br');
    var line5 = document.createTextNode('Supported: Chrome 89+ on Android with NFC enabled.');

    p.appendChild(line1);
    p.appendChild(strong1);
    p.appendChild(line2);
    p.appendChild(br1);
    p.appendChild(line3);
    p.appendChild(strong2);
    p.appendChild(line4);
    p.appendChild(br2);
    p.appendChild(br3);
    p.appendChild(line5);
    el.appendChild(p);
  }
}

async function scanNfc() {
  try {
    var reader = new NDEFReader();
    await reader.scan();
    document.getElementById('nfcStats').style.display = 'grid';
    showResult('nfcResult', 'Waiting for NFC tag... Hold tag near device.', true);
    reader.addEventListener('reading', function(event) {
      var serialNumber = event.serialNumber;
      var message = event.message;
      document.getElementById('nfcStat-serial').textContent = serialNumber || 'N/A';
      document.getElementById('nfcStat-records').textContent = message.records.length;
      var types = Array.from(message.records).map(function(r) { return r.recordType; }).join(', ');
      document.getElementById('nfcStat-type').textContent = types || 'N/A';
      showResult('nfcResult', 'Tag read!\nSerial: ' + serialNumber + '\nRecords: ' + message.records.length + '\nTypes: ' + types, true);
    });
    reader.addEventListener('readingerror', function() {
      showResult('nfcResult', 'Error reading NFC tag. Try again.', false);
    });
  } catch (e) {
    showResult('nfcResult', 'NFC error: ' + e.message, false);
  }
}

// ── 4. Voice Recording ──────────────────────────────────────────────

// ── WAV Conversion Helpers (Web Audio API) ──────────────────────────

function writeString(view, offset, string) {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function createWavBuffer(samples, sampleRate) {
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (var i = 0; i < samples.length; i++) {
    var s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return buffer;
}

async function convertToWav16k(blob) {
  var audioCtx = new AudioContext({ sampleRate: 16000 });
  var arrayBuffer = await blob.arrayBuffer();
  var audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  var channelData;
  if (audioBuffer.numberOfChannels === 1) {
    channelData = audioBuffer.getChannelData(0);
  } else {
    var ch0 = audioBuffer.getChannelData(0);
    var ch1 = audioBuffer.getChannelData(1);
    channelData = new Float32Array(ch0.length);
    for (var i = 0; i < ch0.length; i++) {
      channelData[i] = (ch0[i] + ch1[i]) / 2;
    }
  }
  var wavBuffer = createWavBuffer(channelData, 16000);
  audioCtx.close();
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

var canConvertWav = (function() {
  try {
    return typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined';
  } catch (e) {
    return false;
  }
})();

var voiceRecorder = null;
var voiceChunks = [];
var voiceStream = null;
var voiceAnalyser = null;
var voiceAnimFrame = null;
var voiceStartTime = 0;
var voiceAudioCtx = null;
var voiceBase64Data = null; // stored after recording for enroll/verify

async function toggleVoiceRecording() {
  var btn = document.getElementById('voiceRecordBtn');
  if (voiceRecorder && voiceRecorder.state === 'recording') {
    voiceRecorder.stop();
    voiceStream.getTracks().forEach(function(t) { t.stop(); });
    cancelAnimationFrame(voiceAnimFrame);
    btn.textContent = 'Start Recording';
    btn.classList.remove('btn-danger');
    btn.classList.add('btn-primary');
    return;
  }

  try {
    var micId = document.getElementById('voiceMicSelect').value;
    var audioConstraints = micId ? { deviceId: { exact: micId } } : true;
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    voiceAudioCtx = new AudioContext();
    var source = voiceAudioCtx.createMediaStreamSource(voiceStream);
    voiceAnalyser = voiceAudioCtx.createAnalyser();
    voiceAnalyser.fftSize = 2048;
    source.connect(voiceAnalyser);

    voiceChunks = [];
    voiceRecorder = new MediaRecorder(voiceStream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 128000 });
    voiceRecorder.ondataavailable = function(e) { if (e.data.size > 0) voiceChunks.push(e.data); };
    voiceRecorder.onstop = function() {
      var blob = new Blob(voiceChunks, { type: 'audio/webm' });
      var url = URL.createObjectURL(blob);
      var audio = document.getElementById('voiceAudio');
      audio.src = url;
      document.getElementById('voicePlayback').style.display = 'block';
      document.getElementById('voiceStats').style.display = 'grid';

      var duration = (performance.now() - voiceStartTime) / 1000;
      var origSampleRate = voiceAudioCtx.sampleRate;
      document.getElementById('voiceStat-duration').textContent = duration.toFixed(1) + 's';
      document.getElementById('voiceStat-samplerate').textContent = origSampleRate + ' Hz';
      document.getElementById('voiceStat-size').textContent = formatBytes(blob.size);

      // Try client-side WAV conversion (WebM -> WAV 16kHz mono)
      if (canConvertWav) {
        document.getElementById('voiceStat-conversion').textContent = 'Converting...';
        document.getElementById('voiceStat-format').textContent = 'WebM -> WAV';
        var convStart = performance.now();
        convertToWav16k(blob).then(function(wavBlob) {
          var convTime = performance.now() - convStart;
          document.getElementById('voiceStat-wavsize').textContent = formatBytes(wavBlob.size);
          document.getElementById('voiceStat-conversion').textContent = formatMs(convTime);
          document.getElementById('voiceStat-format').textContent = 'WAV 16kHz mono';

          // Read WAV as base64
          var wavReader = new FileReader();
          wavReader.onload = function() {
            var base64 = wavReader.result.split(',')[1];
            voiceBase64Data = base64;
            showResult('voiceResult',
              'Recording complete + converted to WAV.\n' +
              'Original: WebM, ' + origSampleRate + 'Hz, ' + formatBytes(blob.size) + '\n' +
              'Converted: WAV, 16kHz, mono, ' + formatBytes(wavBlob.size) + '\n' +
              'Conversion time: ' + formatMs(convTime) + '\n' +
              'Base64 length: ' + base64.length + ' chars\n' +
              'Ready for Enroll or Verify.', true);
            document.getElementById('btnVoiceEnroll').disabled = false;
            document.getElementById('btnVoiceVerify').disabled = false;
            document.getElementById('btnVoiceSearch').disabled = false;
          };
          wavReader.readAsDataURL(wavBlob);
        }).catch(function(err) {
          // Fallback: send WebM if conversion fails
          console.warn('WAV conversion failed, falling back to WebM:', err);
          document.getElementById('voiceStat-conversion').textContent = 'Failed (using WebM)';
          document.getElementById('voiceStat-format').textContent = 'WebM (fallback)';
          document.getElementById('voiceStat-wavsize').textContent = '--';
          var reader = new FileReader();
          reader.onload = function() {
            var base64 = reader.result.split(',')[1];
            voiceBase64Data = base64;
            showResult('voiceResult',
              'Recording complete (WAV conversion failed, using WebM).\n' +
              'Format: WebM, ' + origSampleRate + 'Hz, ' + formatBytes(blob.size) + '\n' +
              'Base64 length: ' + base64.length + ' chars\nReady for Enroll or Verify.', true);
            document.getElementById('btnVoiceEnroll').disabled = false;
            document.getElementById('btnVoiceVerify').disabled = false;
            document.getElementById('btnVoiceSearch').disabled = false;
          };
          reader.readAsDataURL(blob);
        });
      } else {
        // No AudioContext support — send WebM as-is
        document.getElementById('voiceStat-conversion').textContent = 'N/A (no AudioContext)';
        document.getElementById('voiceStat-format').textContent = 'WebM (original)';
        document.getElementById('voiceStat-wavsize').textContent = '--';
        var reader = new FileReader();
        reader.onload = function() {
          var base64 = reader.result.split(',')[1];
          voiceBase64Data = base64;
          showResult('voiceResult', 'Recording complete.\nBase64 length: ' + base64.length + ' chars\nReady for Enroll or Verify.', true);
          document.getElementById('btnVoiceEnroll').disabled = false;
          document.getElementById('btnVoiceVerify').disabled = false;
          document.getElementById('btnVoiceSearch').disabled = false;
        };
        reader.readAsDataURL(blob);
      }
    };

    voiceRecorder.start();
    voiceStartTime = performance.now();
    btn.textContent = 'Stop Recording';
    btn.classList.remove('btn-primary');
    btn.classList.add('btn-danger');
    drawWaveform();
  } catch (e) {
    showResult('voiceResult', 'Microphone error: ' + e.message, false);
  }
}

function drawWaveform() {
  var canvas = document.getElementById('voiceWaveform');
  var ctx = canvas.getContext('2d');
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
  ctx.scale(2, 2);
  var w = canvas.offsetWidth, h = canvas.offsetHeight;
  var bufLen = voiceAnalyser.frequencyBinCount;
  var data = new Uint8Array(bufLen);

  function draw() {
    if (!voiceRecorder || voiceRecorder.state !== 'recording') return;
    voiceAnimFrame = requestAnimationFrame(draw);
    voiceAnalyser.getByteTimeDomainData(data);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#58a6ff';
    ctx.beginPath();
    var sliceWidth = w / bufLen;
    var x = 0;
    for (var i = 0; i < bufLen; i++) {
      var v = data[i] / 128.0;
      var y = v * h / 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(w, h / 2);
    ctx.stroke();
  }
  draw();
}

async function enrollVoice() {
  var userId = getUserId();
  if (!userId) { showResult('voiceResult', 'Login first to get a user ID.', false); return; }
  if (!voiceBase64Data) { showResult('voiceResult', 'Record audio first.', false); return; }

  showResult('voiceResult', 'Enrolling voice...', true);
  try {
    var resp = await apiCall('POST', '/api/v1/biometric/voice/enroll/' + userId, {
      voiceData: voiceBase64Data
    });
    var d = resp.data || resp;
    var ok = d.verified !== false && resp.ok !== false;
    showResult('voiceResult', (ok ? 'Voice enrolled!' : 'Voice enrollment failed.') + '\n\n' + JSON.stringify(resp, null, 2), ok);
  } catch (e) {
    showResult('voiceResult', 'Voice enrollment failed: ' + e.message, false);
  }
}

async function verifyVoice() {
  var userId = getUserId();
  if (!userId) { showResult('voiceResult', 'Login first to get a user ID.', false); return; }
  if (!voiceBase64Data) { showResult('voiceResult', 'Record audio first.', false); return; }

  showResult('voiceResult', 'Verifying voice...', true);
  try {
    var resp = await apiCall('POST', '/api/v1/biometric/voice/verify/' + userId, {
      voiceData: voiceBase64Data
    });
    var d = resp.data || resp;
    var verified = d.verified === true || d.confidence > 0;
    var confStr = d.confidence != null ? ' (confidence: ' + d.confidence + ')' : '';
    showResult('voiceResult',
      (verified ? 'Voice VERIFIED!' : 'Voice NOT verified.') + confStr + '\n\n' +
      JSON.stringify(resp, null, 2), verified);
  } catch (e) {
    showResult('voiceResult', 'Voice verification failed: ' + e.message, false);
  }
}

async function searchVoice() {
  if (!voiceBase64Data) { showResult('voiceResult', 'Record voice first.', false); return; }
  showResult('voiceResult', 'Searching voice...', true);
  var token = getToken();
  var start = performance.now();
  try {
    var res = await fetch(getApiUrl() + '/api/v1/biometric/voice/search', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { 'Authorization': 'Bearer ' + token } : {}),
      body: JSON.stringify({ voiceData: voiceBase64Data })
    });
    var elapsed = performance.now() - start;
    var data = await res.json().catch(function() { return null; });
    addLogEntry('POST', '/api/v1/biometric/voice/search', res.status, elapsed, '(voice audio)', data);

    if (res.ok && data && data.matches && data.matches.length > 0) {
      var lines = 'SPEAKER IDENTIFIED! (' + formatMs(elapsed) + ')\n\n';
      data.matches.forEach(function(m, i) {
        lines += '#' + (i + 1) + ' User: ' + m.user_id + ' | Similarity: ' + ((m.similarity || 0) * 100).toFixed(1) + '%\n';
      });
      try {
        var topId = data.matches[0].user_id;
        var userRes = await fetch(getApiUrl() + '/api/v1/users/' + topId, {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {}
        });
        if (userRes.ok) {
          var user = await userRes.json();
          lines += '\n--- Top Match ---\n';
          lines += 'Name: ' + (user.firstName || '') + ' ' + (user.lastName || '') + '\n';
          lines += 'Email: ' + (user.email || '--') + '\n';
          lines += 'Role: ' + (user.role || '--');
        }
      } catch (e) { /* optional */ }
      showResult('voiceResult', lines, true);
    } else {
      showResult('voiceResult', 'No speaker match found. (' + formatMs(elapsed) + ')\n' + JSON.stringify(data, null, 2), false);
    }
  } catch (e) {
    showResult('voiceResult', 'Search error: ' + e.message, false);
  }
}

// ── 5a. Fingerprint Embedded ─────────────────────────────────────────

async function checkPlatformAuth() {
  var el = document.getElementById('fpeStat-available');
  if (window.PublicKeyCredential) {
    try {
      var avail = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      el.textContent = avail ? 'Available' : 'Not Available';
      el.style.color = avail ? 'var(--green)' : 'var(--yellow)';
    } catch (e) {
      el.textContent = 'Error';
      el.style.color = 'var(--red)';
    }
  } else {
    el.textContent = 'No WebAuthn';
    el.style.color = 'var(--red)';
  }
}

async function fpeRegister() {
  var username = document.getElementById('fpeUsername').value || 'testuser';
  var challenge = randomBytes(32);
  var userId = randomBytes(16);
  try {
    var credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: 'FIVUCSAS Auth Test', id: location.hostname },
        user: { id: userId, name: username, displayName: username },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
        timeout: 60000
      }
    });
    var credId = bufToBase64url(credential.rawId);
    showResult('fpeResult',
      'Registration successful!\nCredential ID: ' + credId +
      '\nAttestation: ' + (credential.response.attestationObject ? 'present' : 'none') +
      '\nClient Data: ' + new TextDecoder().decode(credential.response.clientDataJSON).substring(0, 100) + '...', true);
    localStorage.setItem('fivucsas_fpe_credId', credId);
  } catch (e) {
    showResult('fpeResult', 'Registration failed: ' + e.message, false);
  }
}

async function fpeVerify() {
  var challenge = randomBytes(32);
  var allowCredentials = [];
  var storedId = localStorage.getItem('fivucsas_fpe_credId');
  if (storedId) {
    var raw = Uint8Array.from(atob(storedId.replace(/-/g,'+').replace(/_/g,'/')), function(c) { return c.charCodeAt(0); });
    allowCredentials.push({ id: raw, type: 'public-key' });
  }
  try {
    var assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        rpId: location.hostname,
        allowCredentials: allowCredentials,
        userVerification: 'required',
        timeout: 60000
      }
    });
    showResult('fpeResult',
      'Verification successful!\nCredential ID: ' + bufToBase64url(assertion.rawId) +
      '\nAuthenticator Data: ' + bufToBase64url(assertion.response.authenticatorData).substring(0, 60) + '...' +
      '\nSignature present: yes', true);
  } catch (e) {
    showResult('fpeResult', 'Verification failed: ' + e.message, false);
  }
}

// ── 5b. Fingerprint External ─────────────────────────────────────────

async function checkExternalFP() {
  var el = document.getElementById('fpxStat-status');
  el.textContent = 'Checking...';
  try {
    var res = await fetch('http://localhost:9120/status', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      el.textContent = 'Detected';
      el.style.color = 'var(--green)';
      var data = await res.text();
      showResult('fpxResult', 'SecuGen WebAPI detected!\n' + data, true);
    } else {
      el.textContent = 'HTTP ' + res.status;
      el.style.color = 'var(--yellow)';
      showResult('fpxResult', 'Scanner responded with HTTP ' + res.status, false);
    }
  } catch (e) {
    el.textContent = 'Not Found';
    el.style.color = 'var(--text-muted)';
    // Silently handle — no console error for expected missing scanner
  }
}

// ── 6. QR Code ───────────────────────────────────────────────────────

var html5QrScanner = null;
var lastQrResult = null;

async function startQrScan() {
  var container = document.getElementById('qrReaderContainer');
  container.style.display = 'block';
  document.getElementById('qrStartBtn').disabled = true;
  document.getElementById('qrStopBtn').disabled = false;

  try {
    if (typeof Html5Qrcode === 'undefined') {
      showResult('qrResult', 'QR Scanner library (html5-qrcode) not loaded. Check CDN.', false);
      document.getElementById('qrStartBtn').disabled = false;
      document.getElementById('qrStopBtn').disabled = true;
      return;
    }

    html5QrScanner = new Html5Qrcode('qrReader');
    await html5QrScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      function onScanSuccess(decodedText, decodedResult) {
        if (decodedText === lastQrResult) return; // debounce same QR
        lastQrResult = decodedText;
        showResult('qrResult', 'QR Decoded:\n' + decodedText, true);
      },
      function onScanFailure(errorMessage) {
        // Ignore scan failures (no QR found in frame) — this fires constantly
      }
    );
    showResult('qrResult', 'QR Scanner started. Point camera at a QR code.', true);
  } catch (e) {
    showResult('qrResult', 'QR Scanner error: ' + (e.message || e), false);
    document.getElementById('qrStartBtn').disabled = false;
    document.getElementById('qrStopBtn').disabled = true;
  }
}

async function stopQrScan() {
  if (html5QrScanner) {
    try { await html5QrScanner.stop(); } catch (e) { /* ignore */ }
    try { html5QrScanner.clear(); } catch (e) { /* ignore */ }
    html5QrScanner = null;
  }
  document.getElementById('qrReaderContainer').style.display = 'none';
  document.getElementById('qrStartBtn').disabled = false;
  document.getElementById('qrStopBtn').disabled = true;
}

function generateTestQr() {
  var challenge = bufToBase64url(randomBytes(32));
  var payload = JSON.stringify({ type: 'fivucsas_auth', challenge: challenge, ts: Date.now() });
  var el = document.getElementById('qrGenOutput');
  // Clear and rebuild safely
  while (el.firstChild) { el.removeChild(el.firstChild); }
  var box = document.createElement('div');
  box.className = 'result-box success';
  box.style.display = 'block';
  var label = document.createElement('div');
  label.textContent = 'Test QR Payload:';
  label.style.marginBottom = '8px';
  box.appendChild(label);

  var img = document.createElement('img');
  img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(payload);
  img.alt = 'QR Code';
  img.style.display = 'block';
  img.style.marginBottom = '8px';
  box.appendChild(img);

  var code = document.createElement('pre');
  code.textContent = payload;
  code.style.fontSize = '0.75rem';
  code.style.wordBreak = 'break-all';
  box.appendChild(code);

  el.appendChild(box);
}

// ── 7. Email OTP ─────────────────────────────────────────────────────

async function sendEmailOtp() {
  var uid = getUserId();
  if (!uid) { showResult('emailOtpResult', 'Login first to get user ID (use Password Login above).', false); return; }
  showResult('emailOtpResult', 'Sending OTP to user email...', true);
  var res = await apiCall('POST', '/api/v1/otp/email/send/' + uid, null);
  if (res.ok) {
    showResult('emailOtpResult',
      'OTP sent successfully! (' + formatMs(res.elapsed) + ')\n' +
      'Check your email inbox for the 6-digit code.\n' +
      '(If SMTP is not configured, the OTP may not arrive — check the API response below)\n\n' +
      JSON.stringify(res.data, null, 2), true);
  } else {
    var errMsg = res.error || '';
    if (res.data) errMsg = JSON.stringify(res.data, null, 2);
    showResult('emailOtpResult',
      'Send failed (' + (res.status || 'ERR') + '):\n' + errMsg +
      '\n\nNote: If SMTP is not configured, the server may return an error.', false);
  }
}

async function verifyEmailOtp() {
  var uid = getUserId();
  if (!uid) { showResult('emailOtpResult', 'Login first to get user ID.', false); return; }
  var code = document.getElementById('emailOtpCode').value;
  if (!code || code.length < 6) { showResult('emailOtpResult', 'Enter a 6-digit OTP code.', false); return; }
  showResult('emailOtpResult', 'Verifying OTP code...', true);
  var res = await apiCall('POST', '/api/v1/otp/email/verify/' + uid, { code: code });
  if (res.ok && res.data) {
    var token = res.data.token || res.data.accessToken || res.data.access_token;
    if (token) setToken(token);
    showResult('emailOtpResult',
      'Email OTP verified successfully! (' + formatMs(res.elapsed) + ')\n\n' +
      JSON.stringify(res.data, null, 2), true);
  } else {
    showResult('emailOtpResult',
      'Verification failed (' + (res.status || 'ERR') + '):\n' +
      (res.error || JSON.stringify(res.data, null, 2)), false);
  }
}

// ── 8. TOTP ──────────────────────────────────────────────────────────

async function setupTotp() {
  var uid = getUserId();
  if (!uid) { showResult('totpResult', 'Login first to get user ID.', false); return; }
  showResult('totpResult', 'Setting up TOTP...', true);
  var res = await apiCall('POST', '/api/v1/totp/setup/' + uid, null);
  var infoEl = document.getElementById('totpSetupInfo');
  if (res.ok && res.data) {
    var qrUri = res.data.otpAuthUri || res.data.qrCodeUri || res.data.otpauthUrl || res.data.uri || res.data.secretUri || '';
    var secret = res.data.secret || res.data.secretKey || '';
    // Build info display
    while (infoEl.firstChild) infoEl.removeChild(infoEl.firstChild);
    infoEl.style.display = 'block';

    var box = document.createElement('div');
    box.className = 'result-box success';
    box.style.display = 'block';
    box.style.wordBreak = 'break-all';

    var title = document.createElement('div');
    title.textContent = 'TOTP Setup successful! (' + formatMs(res.elapsed) + ')';
    title.style.marginBottom = '8px';
    box.appendChild(title);

    if (qrUri) {
      var qrImg = document.createElement('img');
      qrImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(qrUri);
      qrImg.alt = 'TOTP QR Code';
      qrImg.style.display = 'block';
      qrImg.style.marginBottom = '8px';
      box.appendChild(qrImg);
    }

    if (secret) {
      var secretEl = document.createElement('div');
      secretEl.textContent = 'Secret Key: ' + secret;
      secretEl.style.fontFamily = 'monospace';
      secretEl.style.marginBottom = '8px';
      box.appendChild(secretEl);
    }

    var hint = document.createElement('div');
    hint.textContent = 'Scan the QR code with your authenticator app, then enter the 6-digit code below.';
    hint.style.color = 'var(--text-secondary)';
    box.appendChild(hint);

    infoEl.appendChild(box);

    showResult('totpResult', 'TOTP setup complete! Enter the code from your authenticator app to verify.', true);
  } else {
    infoEl.style.display = 'none';
    showResult('totpResult',
      'TOTP setup failed (' + (res.status || 'ERR') + '):\n' +
      (res.error || JSON.stringify(res.data, null, 2)), false);
  }
}

async function checkTotpStatus() {
  var uid = getUserId();
  if (!uid) { showResult('totpResult', 'Login first to get user ID.', false); return; }
  showResult('totpResult', 'Checking TOTP status...', true);
  var res = await apiCall('GET', '/api/v1/totp/status/' + uid, null);
  if (res.ok && res.data) {
    var enabled = res.data.enabled || res.data.totpEnabled || res.data.active || false;
    showResult('totpResult',
      'TOTP Status: ' + (enabled ? 'ENABLED' : 'NOT ENABLED') + ' (' + formatMs(res.elapsed) + ')\n\n' +
      JSON.stringify(res.data, null, 2), enabled);
  } else {
    showResult('totpResult',
      'Status check failed (' + (res.status || 'ERR') + '):\n' +
      (res.error || JSON.stringify(res.data, null, 2)), false);
  }
}

async function verifyTotp() {
  var uid = getUserId();
  if (!uid) { showResult('totpResult', 'Login first to get user ID.', false); return; }
  var code = document.getElementById('totpCode').value;
  if (!code || code.length < 6) { showResult('totpResult', 'Enter a 6-digit TOTP code.', false); return; }
  showResult('totpResult', 'Verifying TOTP code...', true);
  var res = await apiCall('POST', '/api/v1/totp/verify-setup/' + uid, { code: code });
  if (res.ok && res.data) {
    var verified = res.data.success !== false;
    showResult('totpResult',
      (verified ? 'TOTP verified!' : 'TOTP code invalid.') + ' (' + formatMs(res.elapsed) + ')\n\n' +
      JSON.stringify(res.data, null, 2), verified);
  } else {
    showResult('totpResult',
      'TOTP verification failed (' + (res.status || 'ERR') + '):\n' +
      (res.error || JSON.stringify(res.data, null, 2)), false);
  }
}

// ── 9. SMS OTP ───────────────────────────────────────────────────────

async function sendSmsOtp() {
  var uid = getUserId();
  if (!uid) { showResult('smsOtpResult', 'Login first to get user ID.', false); return; }
  showResult('smsOtpResult', 'Attempting to send SMS OTP...', true);
  var res = await apiCall('POST', '/api/v1/otp/sms/send/' + uid, null);
  if (res.ok) {
    showResult('smsOtpResult',
      'SMS OTP sent! (' + formatMs(res.elapsed) + ')\n\n' +
      JSON.stringify(res.data, null, 2), true);
  } else {
    var errMsg = res.error || '';
    if (res.data) errMsg = JSON.stringify(res.data, null, 2);
    showResult('smsOtpResult',
      'SMS send failed (' + (res.status || 'ERR') + '):\n' + errMsg +
      '\n\n[Pending Activation] SMS OTP requires Twilio to be configured.\n' +
      'Contact admin to set up: twilio.account-sid, twilio.auth-token, twilio.from-number', false);
  }
}

async function verifySmsOtp() {
  var uid = getUserId();
  if (!uid) { showResult('smsOtpResult', 'Login first to get user ID.', false); return; }
  var code = document.getElementById('smsOtpCode').value;
  if (!code || code.length < 6) { showResult('smsOtpResult', 'Enter a 6-digit OTP code.', false); return; }
  showResult('smsOtpResult', 'Verifying SMS OTP code...', true);
  var res = await apiCall('POST', '/api/v1/otp/sms/verify/' + uid, { code: code });
  if (res.ok && res.data) {
    var token = res.data.token || res.data.accessToken || res.data.access_token;
    if (token) setToken(token);
    showResult('smsOtpResult',
      'SMS OTP verified! (' + formatMs(res.elapsed) + ')\n\n' +
      JSON.stringify(res.data, null, 2), true);
  } else {
    showResult('smsOtpResult',
      'SMS OTP verification failed (' + (res.status || 'ERR') + '):\n' +
      (res.error || JSON.stringify(res.data, null, 2)), false);
  }
}

// ── 10. Hardware Token ───────────────────────────────────────────────

async function checkHwTokenSupport() {
  var el = document.getElementById('hwStat-available');
  if (!window.PublicKeyCredential) {
    el.textContent = 'No WebAuthn support';
    el.style.color = 'var(--red)';
    return;
  }
  el.textContent = 'WebAuthn available (cross-platform)';
  el.style.color = 'var(--green)';
}

async function hwRegister() {
  if (!window.PublicKeyCredential) {
    showResult('hwResult', 'WebAuthn is not supported in this browser. Cannot register hardware keys.', false);
    return;
  }
  var username = document.getElementById('hwUsername').value || 'testuser';
  var challenge = randomBytes(32);
  var userId = randomBytes(16);
  showResult('hwResult', 'Insert your YubiKey or security key and tap when prompted...', true);
  try {
    var credential = await navigator.credentials.create({
      publicKey: {
        challenge: challenge,
        rp: { name: 'FIVUCSAS Auth Test', id: location.hostname },
        user: { id: userId, name: username, displayName: username },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: { authenticatorAttachment: 'cross-platform', userVerification: 'preferred' },
        timeout: 90000
      }
    });
    var credId = bufToBase64url(credential.rawId);
    showResult('hwResult',
      'Hardware key registered!\nCredential ID: ' + credId +
      '\nAttestation format: ' + (credential.response.attestationObject ? 'present' : 'none') +
      '\nTransport hints: USB / NFC / BLE', true);
    localStorage.setItem('fivucsas_hw_credId', credId);
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      showResult('hwResult', 'No security key detected or operation was cancelled.\nMake sure your security key is inserted and try again.', false);
    } else {
      showResult('hwResult', 'Registration failed: ' + e.message, false);
    }
  }
}

async function hwVerify() {
  if (!window.PublicKeyCredential) {
    showResult('hwResult', 'WebAuthn is not supported in this browser.', false);
    return;
  }
  var challenge = randomBytes(32);
  var allowCredentials = [];
  var storedId = localStorage.getItem('fivucsas_hw_credId');
  if (storedId) {
    var raw = Uint8Array.from(atob(storedId.replace(/-/g,'+').replace(/_/g,'/')), function(c) { return c.charCodeAt(0); });
    allowCredentials.push({ id: raw, type: 'public-key', transports: ['usb', 'nfc', 'ble'] });
  }
  showResult('hwResult', 'Tap your security key now...', true);
  try {
    var assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge,
        rpId: location.hostname,
        allowCredentials: allowCredentials,
        userVerification: 'preferred',
        timeout: 90000
      }
    });
    showResult('hwResult',
      'Hardware key verified!\nCredential ID: ' + bufToBase64url(assertion.rawId) +
      '\nSignature present: yes\nUser present: yes', true);
  } catch (e) {
    if (e.name === 'NotAllowedError') {
      showResult('hwResult', 'No security key detected or operation was cancelled.\nInsert your security key and try again.', false);
    } else {
      showResult('hwResult', 'Verification failed: ' + e.message, false);
    }
  }
}

// ── 11. Card Detection (Client-Side) ────────────────────────────────

var cardStream = null;
var cardLiveMode = false;
var cardLiveRAF = null;

// ISO/IEC 7810 ID-1 card: 85.6mm x 53.98mm = 1.586 aspect ratio
var CARD_ASPECT_RATIO = 85.6 / 53.98; // ~1.586
var CARD_RATIO_TOLERANCE = 0.25; // allow 1.33 to 1.84 (covers passports too)
var CARD_MIN_AREA_FRACTION = 0.04; // card must be at least 4% of frame
var CARD_MAX_AREA_FRACTION = 0.85; // card must be at most 85% of frame

async function startCardCamera() {
  var video = document.getElementById('cardVideo');
  var container = document.getElementById('cardContainer');
  document.getElementById('cardStartBtn').disabled = true;
  document.getElementById('cardStopBtn').disabled = false;
  document.getElementById('cardDetectBtn').disabled = false;
  document.getElementById('cardLiveToggle').disabled = false;
  container.style.display = 'block';

  try {
    cardStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    video.srcObject = cardStream;
    video.addEventListener('loadedmetadata', function() {
      var canvas = document.getElementById('cardCanvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      document.getElementById('cardOverlay').textContent = 'Camera: ' + video.videoWidth + 'x' + video.videoHeight + ' — Point at a card';
    });
  } catch (e) {
    showResult('cardDetectResult', 'Camera error: ' + e.message, false);
    document.getElementById('cardStartBtn').disabled = false;
    document.getElementById('cardStopBtn').disabled = true;
    document.getElementById('cardDetectBtn').disabled = true;
    document.getElementById('cardLiveToggle').disabled = true;
  }
}

function stopCardCamera() {
  cardLiveMode = false;
  if (cardLiveRAF) { cancelAnimationFrame(cardLiveRAF); cardLiveRAF = null; }
  if (cardStream) {
    cardStream.getTracks().forEach(function(t) { t.stop(); });
    cardStream = null;
  }
  document.getElementById('cardContainer').style.display = 'none';
  document.getElementById('cardStats').style.display = 'none';
  document.getElementById('cardCropContainer').style.display = 'none';
  document.getElementById('cardStartBtn').disabled = false;
  document.getElementById('cardStopBtn').disabled = true;
  document.getElementById('cardDetectBtn').disabled = true;
  document.getElementById('cardLiveToggle').disabled = true;
  document.getElementById('cardLiveToggle').textContent = 'Live Detection: OFF';
  document.getElementById('cardLiveToggle').style.background = 'var(--purple)';
}

function toggleCardLiveDetection() {
  cardLiveMode = !cardLiveMode;
  document.getElementById('cardLiveToggle').textContent = 'Live Detection: ' + (cardLiveMode ? 'ON' : 'OFF');
  document.getElementById('cardLiveToggle').style.background = cardLiveMode ? 'var(--green)' : 'var(--purple)';
  if (cardLiveMode) {
    cardLiveLoop();
  } else {
    if (cardLiveRAF) { cancelAnimationFrame(cardLiveRAF); cardLiveRAF = null; }
    var oc = document.getElementById('cardCanvas');
    oc.getContext('2d').clearRect(0, 0, oc.width, oc.height);
  }
}

function cardLiveLoop() {
  if (!cardLiveMode || !cardStream) return;
  var video = document.getElementById('cardVideo');
  if (video.readyState >= 2) {
    var result = runCardDetection(video);
    drawCardOverlay(result);
    updateCardStats(result);
  }
  cardLiveRAF = requestAnimationFrame(cardLiveLoop);
}

// ── Image Processing Utilities ──────────────────────────────────────

function toGrayscale(imageData) {
  var data = imageData.data;
  var w = imageData.width;
  var h = imageData.height;
  var gray = new Float32Array(w * h);
  for (var i = 0; i < w * h; i++) {
    var idx = i * 4;
    gray[i] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
  }
  return { data: gray, width: w, height: h };
}

function gaussianBlur3x3(gray) {
  var w = gray.width, h = gray.height;
  var src = gray.data;
  var dst = new Float32Array(w * h);
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var idx = y * w + x;
      dst[idx] = (
        src[(y-1)*w+(x-1)] + 2*src[(y-1)*w+x] + src[(y-1)*w+(x+1)] +
        2*src[y*w+(x-1)]   + 4*src[y*w+x]     + 2*src[y*w+(x+1)] +
        src[(y+1)*w+(x-1)] + 2*src[(y+1)*w+x] + src[(y+1)*w+(x+1)]
      ) / 16;
    }
  }
  return { data: dst, width: w, height: h };
}

function sobelGradient(gray) {
  var w = gray.width, h = gray.height;
  var src = gray.data;
  var mag = new Float32Array(w * h);
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      var gx = -src[(y-1)*w+(x-1)] + src[(y-1)*w+(x+1)]
              -2*src[y*w+(x-1)]    + 2*src[y*w+(x+1)]
              -src[(y+1)*w+(x-1)]  + src[(y+1)*w+(x+1)];
      var gy = -src[(y-1)*w+(x-1)] - 2*src[(y-1)*w+x] - src[(y-1)*w+(x+1)]
              +src[(y+1)*w+(x-1)]  + 2*src[(y+1)*w+x]  + src[(y+1)*w+(x+1)];
      mag[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return { mag: mag, width: w, height: h };
}

function thresholdEdges(mag, w, h) {
  var sum = 0, sum2 = 0, n = w * h;
  for (var i = 0; i < n; i++) { sum += mag[i]; sum2 += mag[i] * mag[i]; }
  var mean = sum / n;
  var std = Math.sqrt(sum2 / n - mean * mean);
  var thresh = mean + 1.0 * std;
  var binary = new Uint8Array(w * h);
  for (var i = 0; i < n; i++) {
    binary[i] = mag[i] > thresh ? 1 : 0;
  }
  return binary;
}

function dilate(binary, w, h) {
  var out = new Uint8Array(w * h);
  for (var y = 1; y < h - 1; y++) {
    for (var x = 1; x < w - 1; x++) {
      if (binary[(y-1)*w+(x-1)] || binary[(y-1)*w+x] || binary[(y-1)*w+(x+1)] ||
          binary[y*w+(x-1)]     || binary[y*w+x]     || binary[y*w+(x+1)] ||
          binary[(y+1)*w+(x-1)] || binary[(y+1)*w+x] || binary[(y+1)*w+(x+1)]) {
        out[y * w + x] = 1;
      }
    }
  }
  return out;
}

function findBoundingBoxes(binary, w, h) {
  var visited = new Uint8Array(w * h);
  var boxes = [];

  for (var y = 0; y < h; y++) {
    for (var x = 0; x < w; x++) {
      if (binary[y * w + x] && !visited[y * w + x]) {
        var minX = x, maxX = x, minY = y, maxY = y;
        var pixelCount = 0;
        var queue = [[x, y]];
        visited[y * w + x] = 1;
        while (queue.length > 0) {
          var p = queue.shift();
          var px = p[0], py = p[1];
          pixelCount++;
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
          var neighbors = [[px-1,py],[px+1,py],[px,py-1],[px,py+1]];
          for (var ni = 0; ni < neighbors.length; ni++) {
            var nx = neighbors[ni][0], ny = neighbors[ni][1];
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && binary[ny * w + nx] && !visited[ny * w + nx]) {
              visited[ny * w + nx] = 1;
              queue.push([nx, ny]);
            }
          }
        }
        var bw = maxX - minX + 1;
        var bh = maxY - minY + 1;
        if (bw > 20 && bh > 20) {
          boxes.push({ x: minX, y: minY, w: bw, h: bh, pixels: pixelCount });
        }
      }
    }
  }
  return boxes;
}

function borderEdgeDensity(binary, w, h, box) {
  var total = 0, edgePixels = 0;
  var margin = 3;
  for (var x = box.x; x < box.x + box.w; x++) {
    for (var dy = 0; dy < margin; dy++) {
      var ty = box.y + dy;
      var by = box.y + box.h - 1 - dy;
      if (ty >= 0 && ty < h && x >= 0 && x < w) { total++; if (binary[ty * w + x]) edgePixels++; }
      if (by >= 0 && by < h && x >= 0 && x < w) { total++; if (binary[by * w + x]) edgePixels++; }
    }
  }
  for (var y = box.y; y < box.y + box.h; y++) {
    for (var dx = 0; dx < margin; dx++) {
      var lx = box.x + dx;
      var rx = box.x + box.w - 1 - dx;
      if (y >= 0 && y < h && lx >= 0 && lx < w) { total++; if (binary[y * w + lx]) edgePixels++; }
      if (y >= 0 && y < h && rx >= 0 && rx < w) { total++; if (binary[y * w + rx]) edgePixels++; }
    }
  }
  return total > 0 ? edgePixels / total : 0;
}

// Main card detection pipeline
function runCardDetection(videoOrCanvas) {
  var start = performance.now();

  var scale = 0.5;
  var srcW, srcH;
  if (videoOrCanvas.videoWidth) {
    srcW = videoOrCanvas.videoWidth;
    srcH = videoOrCanvas.videoHeight;
  } else {
    srcW = videoOrCanvas.width;
    srcH = videoOrCanvas.height;
  }
  var procW = Math.round(srcW * scale);
  var procH = Math.round(srcH * scale);

  var tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = procW;
  tmpCanvas.height = procH;
  var tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.drawImage(videoOrCanvas, 0, 0, procW, procH);

  var imageData = tmpCtx.getImageData(0, 0, procW, procH);

  // 1. Grayscale
  var gray = toGrayscale(imageData);

  // 2. Gaussian blur
  var blurred = gaussianBlur3x3(gray);

  // 3. Sobel edge detection
  var edges = sobelGradient(blurred);

  // 4. Threshold edges
  var binary = thresholdEdges(edges.mag, procW, procH);

  // 5. Dilate to connect edges
  binary = dilate(binary, procW, procH);

  // 6. Find bounding boxes of connected edge regions
  var boxes = findBoundingBoxes(binary, procW, procH);

  var frameArea = procW * procH;

  // 7. Filter and score candidate rectangles
  var candidates = [];
  for (var i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    var boxArea = box.w * box.h;
    var areaFrac = boxArea / frameArea;

    if (areaFrac < CARD_MIN_AREA_FRACTION || areaFrac > CARD_MAX_AREA_FRACTION) continue;

    var aspectRatio = box.w > box.h ? box.w / box.h : box.h / box.w;
    var ratioDiff = Math.abs(aspectRatio - CARD_ASPECT_RATIO);
    if (ratioDiff > CARD_RATIO_TOLERANCE * CARD_ASPECT_RATIO) continue;

    var edgeDensity = borderEdgeDensity(binary, procW, procH, box);

    var ratioScore = 1.0 - (ratioDiff / (CARD_RATIO_TOLERANCE * CARD_ASPECT_RATIO));
    var sizeScore = Math.min(areaFrac / 0.15, 1.0);
    var confidence = ratioScore * 0.4 + edgeDensity * 0.35 + sizeScore * 0.25;

    candidates.push({
      x: Math.round(box.x / scale),
      y: Math.round(box.y / scale),
      w: Math.round(box.w / scale),
      h: Math.round(box.h / scale),
      aspectRatio: aspectRatio,
      areaFraction: areaFrac,
      edgeDensity: edgeDensity,
      confidence: Math.min(confidence, 1.0)
    });
  }

  candidates.sort(function(a, b) { return b.confidence - a.confidence; });

  var elapsed = performance.now() - start;
  var best = candidates.length > 0 ? candidates[0] : null;

  // Classify card type by aspect ratio heuristic
  var cardType = '--';
  if (best) {
    var ar = best.aspectRatio;
    if (ar >= 1.35 && ar <= 1.45) {
      cardType = 'Passport (Pasaport)';
    } else if (ar >= 1.45 && ar <= 1.65) {
      cardType = 'ID Card (Kimlik / Ehliyet)';
    } else if (ar >= 1.65 && ar <= 1.85) {
      cardType = 'ID Card (Wide Format)';
    } else {
      cardType = 'Card-like Object';
    }
  }

  return {
    detected: best !== null && best.confidence > 0.35,
    bestCandidate: best,
    cardType: cardType,
    candidateCount: candidates.length,
    elapsed: elapsed,
    frameWidth: srcW,
    frameHeight: srcH
  };
}

function drawCardOverlay(result) {
  var oc = document.getElementById('cardCanvas');
  var ctx = oc.getContext('2d');
  ctx.clearRect(0, 0, oc.width, oc.height);

  if (result.detected && result.bestCandidate) {
    var c = result.bestCandidate;
    var conf = c.confidence;

    var color;
    if (conf > 0.65) color = '#3fb950';
    else if (conf > 0.45) color = '#d29922';
    else color = '#f85149';

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(c.x, c.y, c.w, c.h);

    // Corner markers
    var cornerLen = Math.min(c.w, c.h) * 0.1;
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.beginPath(); ctx.moveTo(c.x, c.y + cornerLen); ctx.lineTo(c.x, c.y); ctx.lineTo(c.x + cornerLen, c.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x + c.w - cornerLen, c.y); ctx.lineTo(c.x + c.w, c.y); ctx.lineTo(c.x + c.w, c.y + cornerLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x, c.y + c.h - cornerLen); ctx.lineTo(c.x, c.y + c.h); ctx.lineTo(c.x + cornerLen, c.y + c.h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x + c.w - cornerLen, c.y + c.h); ctx.lineTo(c.x + c.w, c.y + c.h); ctx.lineTo(c.x + c.w, c.y + c.h - cornerLen); ctx.stroke();

    // Label
    ctx.font = '14px ' + getComputedStyle(document.body).fontFamily;
    var label = result.cardType + ' (' + (conf * 100).toFixed(0) + '%)';
    var labelW = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(c.x, c.y - 22, labelW + 10, 20);
    ctx.fillStyle = color;
    ctx.fillText(label, c.x + 5, c.y - 6);
  }
}

function updateCardStats(result) {
  document.getElementById('cardStats').style.display = 'grid';
  document.getElementById('cardStat-detected').textContent = result.detected ? 'YES' : 'NO';
  document.getElementById('cardStat-detected').style.color = result.detected ? 'var(--green)' : 'var(--red)';
  document.getElementById('cardStat-type').textContent = result.cardType;
  document.getElementById('cardStat-confidence').textContent = result.bestCandidate
    ? (result.bestCandidate.confidence * 100).toFixed(1) + '%' : '--';
  document.getElementById('cardStat-time').textContent = formatMs(result.elapsed);
  document.getElementById('cardStat-ratio').textContent = result.bestCandidate
    ? result.bestCandidate.aspectRatio.toFixed(3) : '--';
  document.getElementById('cardStat-area').textContent = result.bestCandidate
    ? (result.bestCandidate.areaFraction * 100).toFixed(1) + '% of frame' : '--';

  document.getElementById('cardOverlay').textContent = result.detected
    ? result.cardType + ' (' + (result.bestCandidate.confidence * 100).toFixed(0) + '%) — ' + formatMs(result.elapsed)
    : 'No card detected — ' + formatMs(result.elapsed);
}

function cropDetectedCard(result) {
  if (!result.detected || !result.bestCandidate) return;
  var video = document.getElementById('cardVideo');
  var c = result.bestCandidate;
  var cropCanvas = document.getElementById('cardCropCanvas');
  cropCanvas.width = c.w;
  cropCanvas.height = c.h;
  var ctx = cropCanvas.getContext('2d');
  ctx.drawImage(video, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);
  document.getElementById('cardCropContainer').style.display = 'block';
}

async function captureAndDetectCard() {
  var video = document.getElementById('cardVideo');
  if (!cardStream || video.readyState < 2) {
    showResult('cardDetectResult', 'Camera not ready. Wait a moment.', false);
    return;
  }

  document.getElementById('cardOverlay').textContent = 'Detecting...';
  document.getElementById('cardDetectBtn').disabled = true;

  var result = runCardDetection(video);
  drawCardOverlay(result);
  updateCardStats(result);

  if (result.detected) {
    cropDetectedCard(result);
  }

  document.getElementById('cardDetectBtn').disabled = false;

  var detailLines = [
    result.detected ? 'CARD DETECTED!' : 'No card detected.',
    'Processing time: ' + formatMs(result.elapsed) + ' (client-side)',
    'Candidates found: ' + result.candidateCount,
  ];
  if (result.bestCandidate) {
    detailLines.push('Best candidate:');
    detailLines.push('  Bounding box: (' + result.bestCandidate.x + ', ' + result.bestCandidate.y + ') ' + result.bestCandidate.w + 'x' + result.bestCandidate.h);
    detailLines.push('  Aspect ratio: ' + result.bestCandidate.aspectRatio.toFixed(3) + ' (target: ' + CARD_ASPECT_RATIO.toFixed(3) + ')');
    detailLines.push('  Edge density: ' + (result.bestCandidate.edgeDensity * 100).toFixed(1) + '%');
    detailLines.push('  Confidence: ' + (result.bestCandidate.confidence * 100).toFixed(1) + '%');
    detailLines.push('  Card type: ' + result.cardType);
    detailLines.push('  Area: ' + (result.bestCandidate.areaFraction * 100).toFixed(1) + '% of frame');
  }
  showResult('cardDetectResult', detailLines.join('\n'), result.detected);

  // Also try server-side YOLO detection (more accurate for card TYPE classification)
  var token = getToken();
  if (token) {
    var c = document.createElement('canvas');
    c.width = video.videoWidth; c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    c.toBlob(async function(blob) {
      var formData = new FormData();
      formData.append('file', blob, 'card.jpg');
      try {
        var res = await fetch(getApiUrl() + '/api/v1/biometric/card-detect', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + token },
          body: formData
        });
        var data = await res.json().catch(function() { return null; });
        addLogEntry('POST', '/api/v1/biometric/card-detect', res.status, 0, '(card image)', data);
        if (data && data.detected) {
          var cardNames = { 'tc_kimlik': 'Turkish ID (TC Kimlik)', 'pasaport': 'Passport', 'ehliyet': "Driver's License", 'ogrenci_karti': 'Student Card', 'akademisyen_karti': 'Academic Card' };
          showResult('cardDetectResult',
            'SERVER YOLO DETECTED: ' + (cardNames[data.class_name] || data.class_name) +
            '\nConfidence: ' + ((data.confidence || 0) * 100).toFixed(1) + '%' +
            '\nClass: ' + data.class_name + ' (ID: ' + data.class_id + ')', true);
          document.getElementById('cardStat-detected').textContent = 'YES (YOLO)';
          document.getElementById('cardStat-detected').style.color = 'var(--green)';
          document.getElementById('cardStat-type').textContent = cardNames[data.class_name] || data.class_name;
        } else if (data && !data.detected) {
          showResult('cardDetectResult', 'Server YOLO: No card detected in this frame.', false);
        }
      } catch (e) {
        // Server detection failed silently — client-side result already shown
      }
    }, 'image/jpeg', 0.92);
  }
}

// ── Face Landmark Detection Helpers ──────────────────────────────────

function landmarkDist(landmarks, a, b) {
  var la = landmarks[a], lb = landmarks[b];
  var dx = la.x - lb.x, dy = la.y - lb.y, dz = (la.z || 0) - (lb.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function detectBlink(landmarks) {
  // Eye aspect ratio: vertical / horizontal
  // Left eye: 159(top), 145(bottom), 33(outer), 133(inner)
  var leftV = landmarkDist(landmarks, 159, 145);
  var leftH = landmarkDist(landmarks, 33, 133);
  var leftEAR = leftH > 0 ? leftV / leftH : 1;
  // Right eye: 386(top), 374(bottom), 362(outer), 263(inner)
  var rightV = landmarkDist(landmarks, 386, 374);
  var rightH = landmarkDist(landmarks, 362, 263);
  var rightEAR = rightH > 0 ? rightV / rightH : 1;
  var avgEAR = (leftEAR + rightEAR) / 2;
  return { detected: avgEAR < 0.18, ear: avgEAR };
}

function detectSmile(landmarks) {
  // Mouth width (61-291) vs mouth height (13-14)
  var mouthWidth = landmarkDist(landmarks, 61, 291);
  var mouthHeight = landmarkDist(landmarks, 13, 14);
  var ratio = mouthHeight > 0 ? mouthWidth / mouthHeight : 0;
  return { detected: ratio > 2.8, ratio: ratio };
}

function detectOpenMouth(landmarks) {
  // Upper inner lip (13) to lower inner lip (14) distance
  // Normalized by face height (forehead 10 to chin 152)
  var mouthOpen = landmarkDist(landmarks, 13, 14);
  var faceHeight = landmarkDist(landmarks, 10, 152);
  var ratio = faceHeight > 0 ? mouthOpen / faceHeight : 0;
  // Mouth is "open" when ratio > 0.08 (about 8% of face height)
  return { detected: ratio > 0.08, ratio: ratio };
}

function detectRaiseEyebrows(landmarks) {
  // Left eyebrow center (105) to left eye top (159)
  // Right eyebrow center (334) to right eye top (386)
  // Normalize by face height
  var leftDist = landmarkDist(landmarks, 105, 159);
  var rightDist = landmarkDist(landmarks, 334, 386);
  var avgDist = (leftDist + rightDist) / 2;
  var faceHeight = landmarkDist(landmarks, 10, 152);
  var ratio = faceHeight > 0 ? avgDist / faceHeight : 0;
  // Eyebrows raised when ratio > 0.065 (normal ~0.05)
  return { detected: ratio > 0.065, ratio: ratio };
}

function detectHeadTurn(landmarks) {
  // Compare nose tip (1) x-position to midpoint of face bbox
  // Use left ear (234) and right ear (454) as reference
  var noseX = landmarks[1].x;
  var leftRef = landmarks[234].x;
  var rightRef = landmarks[454].x;
  var faceCenter = (leftRef + rightRef) / 2;
  var faceWidth = Math.abs(rightRef - leftRef);
  var offset = (noseX - faceCenter) / (faceWidth || 0.001);
  // offset > 0.12 means nose is right of center (user turned left from camera POV)
  // offset < -0.12 means nose is left of center (user turned right from camera POV)
  if (offset > 0.12) return { direction: 'left', offset: offset };
  if (offset < -0.12) return { direction: 'right', offset: offset };
  return { direction: 'center', offset: offset };
}

function detectNod(landmarks) {
  // Track nose tip (1) y-position relative to face center
  var noseY = landmarks[1].y;
  var foreheadY = landmarks[10].y;
  var chinY = landmarks[152].y;
  var faceCenter = (foreheadY + chinY) / 2;
  var faceHeight = Math.abs(chinY - foreheadY);
  var offset = (noseY - faceCenter) / (faceHeight || 0.001);
  // offset > 0.15 means nose is below center (nod down)
  // offset < -0.05 means nose is above center (look up)
  return { nod: offset > 0.15, lookUp: offset < -0.05, offset: offset };
}

function captureFullFrameAsBlob() {
  return new Promise(function(resolve) {
    var video = document.getElementById('faceVideo');
    var c = document.createElement('canvas');
    var w = video.videoWidth, h = video.videoHeight;
    var maxDim = 720;
    var scale = Math.min(1, maxDim / Math.max(w, h));
    c.width = Math.round(w * scale);
    c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(video, 0, 0, w, h, 0, 0, c.width, c.height);
    c.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', 0.92);
  });
}

function captureFrameAsBlob() {
  return new Promise(function(resolve) {
    var video = document.getElementById('faceVideo');
    var c = document.createElement('canvas');
    var w = video.videoWidth, h = video.videoHeight;

    // Crop to face region if landmarks are available
    if (lastFaceLandmarks && lastFaceLandmarks.length > 0) {
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      lastFaceLandmarks.forEach(function(lm) {
        var lx = lm.x * w, ly = lm.y * h;
        if (lx < minX) minX = lx; if (ly < minY) minY = ly;
        if (lx > maxX) maxX = lx; if (ly > maxY) maxY = ly;
      });
      var bbW = maxX - minX, bbH = maxY - minY;
      var padX = bbW * 0.6, padY = bbH * 0.6;
      var cropX = Math.max(0, Math.floor(minX - padX));
      var cropY = Math.max(0, Math.floor(minY - padY));
      var cropW = Math.min(w - cropX, Math.ceil(bbW + padX * 2));
      var cropH = Math.min(h - cropY, Math.ceil(bbH + padY * 2));
      c.width = cropW; c.height = cropH;
      c.getContext('2d').drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    } else {
      c.width = w; c.height = h;
      c.getContext('2d').drawImage(video, 0, 0);
    }

    c.toBlob(function(blob) { resolve(blob); }, 'image/jpeg', 0.92);
  });
}

// ── Liveness Puzzle ─────────────────────────────────────────────────

var livenessActive = false;

async function startLivenessPuzzle() {
  if (!faceStream || !faceDetector) {
    showResult('faceResult', 'Start camera first and wait for MediaPipe to load.', false);
    return;
  }
  if (livenessActive) return;
  livenessActive = true;

  var btn = document.getElementById('btnLivenessPuzzle');
  btn.disabled = true;
  btn.textContent = 'Puzzle Active...';

  try {
    // 1. Get challenge from server
    showResult('faceResult', 'Requesting liveness challenge...', true);
    var res = await apiCall('POST', '/api/v1/enrollment/liveness/challenge', {});
    if (!res.ok || !res.data) {
      showResult('faceResult', 'Failed to get liveness challenge: ' + JSON.stringify(res.data, null, 2), false);
      resetLivenessBtn();
      return;
    }

    var challenge = res.data;
    var challengeId = challenge.challengeId;
    var steps = challenge.steps || [];
    var timeoutSec = challenge.timeoutSeconds || 60;

    if (steps.length === 0) {
      showResult('faceResult', 'No steps in challenge. Raw response:\n' + JSON.stringify(challenge, null, 2), false);
      resetLivenessBtn();
      return;
    }

    // Sort steps by order
    steps.sort(function(a, b) { return (a.order || 0) - (b.order || 0); });

    showResult('faceResult', 'Challenge received: ' + steps.length + ' steps. ID: ' + challengeId, true);

    var capturedFrames = [];
    var stepConfidences = [];
    var stepResults = [];

    // 2. Process each step with client-side scoring
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      var action = step.action || step.type || '';
      var duration = (step.duration_seconds || step.durationSeconds || 5) * 1000;
      var instruction = getActionInstruction(action);

      document.getElementById('faceOverlay').textContent = 'Step ' + (i + 1) + '/' + steps.length + ': ' + instruction;
      document.getElementById('faceOverlay').style.color = '#d29922';
      showResult('faceResult', 'Step ' + (i + 1) + '/' + steps.length + ': ' + instruction + ' (max ' + (duration / 1000) + 's)', true);

      var actionResult = await waitForAction(action, duration);
      var stepConfidence = actionResult.detected ? 1.0 : 0.3;
      stepConfidences.push(stepConfidence);

      if (actionResult.detected) {
        var frame = await captureFrameAsBlob();
        capturedFrames.push({ stepIndex: i, action: action, blob: frame });
        var detectedSymbol = String.fromCharCode(10003); // checkmark
        var stepMsg = 'Step ' + (i + 1) + ': ' + instruction + ' ' + detectedSymbol +
          ' (detected in ' + (actionResult.elapsedMs / 1000).toFixed(1) + 's)' +
          ' -- confidence: ' + stepConfidence.toFixed(1);
        document.getElementById('faceOverlay').textContent = 'Step ' + (i + 1) + ' PASSED!';
        document.getElementById('faceOverlay').style.color = '#3fb950';
        showResult('faceResult', stepMsg, true);
        stepResults.push({ action: action, detected: true, elapsed: actionResult.elapsedMs, confidence: stepConfidence });
      } else {
        var frame2 = await captureFrameAsBlob();
        capturedFrames.push({ stepIndex: i, action: action, blob: frame2 });
        var failSymbol = String.fromCharCode(10007); // X mark
        var stepMsg2 = 'Step ' + (i + 1) + ': ' + instruction + ' ' + failSymbol +
          ' (timed out)' +
          ' -- confidence: ' + stepConfidence.toFixed(1);
        document.getElementById('faceOverlay').textContent = 'Step ' + (i + 1) + ' TIMEOUT';
        document.getElementById('faceOverlay').style.color = '#f85149';
        showResult('faceResult', stepMsg2, false);
        stepResults.push({ action: action, detected: false, elapsed: actionResult.elapsedMs, confidence: stepConfidence });
      }

      // Brief pause between steps
      if (i < steps.length - 1) {
        await new Promise(function(r) { setTimeout(r, 800); });
      }
    }

    // 2b. Compute client-side liveness score
    var clientScoreSum = 0;
    for (var cs = 0; cs < stepConfidences.length; cs++) {
      clientScoreSum += stepConfidences[cs];
    }
    var clientScore = stepConfidences.length > 0 ? clientScoreSum / stepConfidences.length : 0;
    var clientScorePct = (clientScore * 100).toFixed(1);

    showResult('faceResult', 'Client liveness score: ' + clientScorePct + '%', clientScore >= 0.6);

    // Update liveness stat in face stats panel
    var livenessStatEl = document.getElementById('faceStat-liveness');
    if (livenessStatEl) {
      livenessStatEl.textContent = clientScorePct + '%';
      livenessStatEl.style.color = clientScore >= 0.6 ? 'var(--green)' : (clientScore >= 0.4 ? 'var(--yellow)' : 'var(--red)');
    }

    // 3. Verify with server
    document.getElementById('faceOverlay').textContent = 'Verifying with server...';
    document.getElementById('faceOverlay').style.color = '#d29922';
    showResult('faceResult', 'Sending ' + capturedFrames.length + ' frames for server verification...', true);

    var formData = new FormData();
    formData.append('challengeId', challengeId);
    for (var j = 0; j < capturedFrames.length && j < 3; j++) {
      formData.append('frame_' + j, capturedFrames[j].blob, 'frame_' + j + '.jpg');
    }

    var token = getToken();
    var start = performance.now();
    var verifyRes = await fetch(getApiUrl() + '/api/v1/enrollment/liveness/verify', {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: formData
    });
    var elapsed = performance.now() - start;
    var verifyData = await verifyRes.json().catch(function() { return null; });
    addLogEntry('POST', '/api/v1/enrollment/liveness/verify', verifyRes.status, elapsed, '(multipart: challengeId + frames)', verifyData);

    if (verifyRes.ok && verifyData) {
      var serverScore = verifyData.score || verifyData.confidence || 0;
      var serverScorePct = (serverScore * 100).toFixed(1);
      var passed = verifyData.passed || verifyData.alive || verifyData.liveness || false;

      // Show both client and server scores
      var finalVerdict = (clientScore >= 0.6 && passed) ? 'PASSED' : 'FAILED';
      var verdictSymbol = finalVerdict === 'PASSED' ? String.fromCharCode(10003) : String.fromCharCode(10007);
      var hybridMsg = 'Client score: ' + clientScorePct + '%\n' +
        'Server score: ' + serverScorePct + '% (' + formatMs(elapsed) + ')\n' +
        'Final: ' + finalVerdict + ' ' + verdictSymbol;

      document.getElementById('faceOverlay').textContent = finalVerdict === 'PASSED' ? 'LIVENESS PASSED!' : 'LIVENESS FAILED';
      document.getElementById('faceOverlay').style.color = finalVerdict === 'PASSED' ? '#3fb950' : '#f85149';
      showResult('faceResult', hybridMsg + '\n\n' + JSON.stringify(verifyData, null, 2), finalVerdict === 'PASSED');

      // Update liveness stat with final hybrid score
      if (livenessStatEl) {
        var hybridScore = (clientScore * 0.4 + serverScore * 0.6);
        var hybridPct = (hybridScore * 100).toFixed(1);
        livenessStatEl.textContent = hybridPct + '% (C:' + clientScorePct + '% S:' + serverScorePct + '%)';
        livenessStatEl.style.color = finalVerdict === 'PASSED' ? 'var(--green)' : 'var(--red)';
      }
    } else {
      // Server verification failed, show client-only score
      document.getElementById('faceOverlay').textContent = 'Server verification failed';
      document.getElementById('faceOverlay').style.color = '#f85149';
      showResult('faceResult',
        'Client score: ' + clientScorePct + '%\n' +
        'Server verification failed (' + (verifyRes.status || 'ERR') + ')\n\n' +
        JSON.stringify(verifyData, null, 2), false);
    }
  } catch (e) {
    showResult('faceResult', 'Liveness puzzle error: ' + e.message, false);
  }

  resetLivenessBtn();
}

function resetLivenessBtn() {
  livenessActive = false;
  var btn = document.getElementById('btnLivenessPuzzle');
  btn.disabled = !faceStream;
  btn.textContent = 'Liveness Puzzle';
}

function getActionInstruction(action) {
  var map = {
    'blink': 'Blink your eyes',
    'smile': 'Smile!',
    'turn_left': 'Turn your head LEFT',
    'turn_right': 'Turn your head RIGHT',
    'nod': 'Nod your head down',
    'look_up': 'Look up',
    'open_mouth': 'Open your mouth wide',
    'raise_eyebrows': 'Raise your eyebrows'
  };
  return map[action] || ('Perform: ' + action);
}

function waitForAction(action, timeoutMs) {
  return new Promise(function(resolve) {
    var startTime = performance.now();
    var detectedCount = 0;
    var requiredCount = 3; // Need 3 consecutive frames to confirm

    function check() {
      if (!faceStream || !faceDetector) { resolve({ detected: false, elapsedMs: performance.now() - startTime }); return; }
      if (performance.now() - startTime > timeoutMs) { resolve({ detected: false, elapsedMs: performance.now() - startTime }); return; }

      var video = document.getElementById('faceVideo');
      if (video.readyState < 2) {
        requestAnimationFrame(check);
        return;
      }

      try {
        var result = faceDetector.detectForVideo(video, performance.now());
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          var landmarks = result.faceLandmarks[0];
          var actionDetected = false;

          switch (action) {
            case 'blink':
              actionDetected = detectBlink(landmarks).detected;
              break;
            case 'smile':
              actionDetected = detectSmile(landmarks).detected;
              break;
            case 'turn_left':
              actionDetected = detectHeadTurn(landmarks).direction === 'left';
              break;
            case 'turn_right':
              actionDetected = detectHeadTurn(landmarks).direction === 'right';
              break;
            case 'nod':
              actionDetected = detectNod(landmarks).nod;
              break;
            case 'look_up':
              actionDetected = detectNod(landmarks).lookUp;
              break;
            case 'open_mouth':
              actionDetected = detectOpenMouth(landmarks).detected;
              break;
            case 'raise_eyebrows':
              actionDetected = detectRaiseEyebrows(landmarks).detected;
              break;
            default:
              actionDetected = false;
          }

          if (actionDetected) {
            detectedCount++;
            if (detectedCount >= requiredCount) {
              resolve({ detected: true, elapsedMs: performance.now() - startTime });
              return;
            }
          } else {
            detectedCount = Math.max(0, detectedCount - 1);
          }
        }
      } catch (e) { /* skip frame */ }

      requestAnimationFrame(check);
    }

    requestAnimationFrame(check);
  });
}

// ── Bank Enrollment (Multi-Perspective) ─────────────────────────────

var bankEnrollActive = false;

async function startBankEnrollment() {
  if (!faceStream || !faceDetector) {
    showResult('faceResult', 'Start camera first and wait for MediaPipe to load.', false);
    return;
  }
  if (bankEnrollActive) return;

  var uid = getUserId();
  if (!uid) { showResult('faceResult', 'Login first to get user ID.', false); return; }

  bankEnrollActive = true;
  var btn = document.getElementById('btnBankEnroll');
  btn.disabled = true;
  btn.textContent = 'Enrolling...';

  var captureSteps = [
    { label: 'Look straight at camera', detectFn: function(lm) { return detectHeadTurn(lm).direction === 'center'; } },
    { label: 'Turn your head slightly LEFT', detectFn: function(lm) { return detectHeadTurn(lm).direction === 'left'; } },
    { label: 'Turn your head slightly RIGHT', detectFn: function(lm) { return detectHeadTurn(lm).direction === 'right'; } }
  ];

  var capturedBlobs = [];

  try {
    for (var i = 0; i < captureSteps.length; i++) {
      var step = captureSteps[i];
      document.getElementById('faceOverlay').textContent = 'Step ' + (i + 1) + '/3: ' + step.label;
      document.getElementById('faceOverlay').style.color = '#d29922';
      showResult('faceResult', 'Bank Enrollment ' + (i + 1) + '/3: ' + step.label, true);

      // Wait for pose detection (10 second timeout per step)
      var detected = await waitForPose(step.detectFn, 10000);
      if (detected) {
        // Hold steady for a moment, then capture
        await new Promise(function(r) { setTimeout(r, 300); });
        var blob = await captureFullFrameAsBlob();
        capturedBlobs.push(blob);
        document.getElementById('faceOverlay').textContent = 'Step ' + (i + 1) + ' captured!';
        document.getElementById('faceOverlay').style.color = '#3fb950';
        showResult('faceResult', 'Angle ' + (i + 1) + ' captured (' + formatBytes(blob.size) + ')', true);
      } else {
        document.getElementById('faceOverlay').textContent = 'Step ' + (i + 1) + ' timed out - capturing anyway';
        document.getElementById('faceOverlay').style.color = '#f85149';
        showResult('faceResult', 'Pose timeout for step ' + (i + 1) + ', capturing current frame.', false);
        var fallbackBlob = await captureFullFrameAsBlob();
        capturedBlobs.push(fallbackBlob);
      }

      // Brief pause between steps
      if (i < captureSteps.length - 1) {
        await new Promise(function(r) { setTimeout(r, 1000); });
      }
    }

    // Send all captures to enrollment endpoint
    document.getElementById('faceOverlay').textContent = 'Sending 3 angles for enrollment...';
    document.getElementById('faceOverlay').style.color = '#d29922';
    showResult('faceResult', 'Sending ' + capturedBlobs.length + ' angle captures to server...', true);

    var formData = new FormData();
    for (var j = 0; j < capturedBlobs.length; j++) {
      formData.append('files', capturedBlobs[j], 'angle_' + j + '.jpg');
    }

    var token = getToken();
    var start = performance.now();

    // Try multi-enroll first, fall back to standard enroll with first image
    var enrollUrl = '/api/v1/biometric/enroll/multi/' + uid;
    var res = await fetch(getApiUrl() + enrollUrl, {
      method: 'POST',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
      body: formData
    });
    var elapsed = performance.now() - start;

    // If multi-enroll fails (404, 500, or success:false), fall back to sequential single enrolls
    var multiData = await res.json().catch(function() { return null; });
    addLogEntry('POST', enrollUrl, res.status, elapsed, '(multipart: 3 angle images)', multiData);
    var multiOk = res.ok && multiData && multiData.success !== false && !multiData.message?.includes('rejected');
    if (!multiOk) {
      showResult('faceResult', 'Multi-enroll returned error, falling back to sequential single enrollments...', false);
      showResult('faceResult', 'Multi-enroll endpoint not available, falling back to sequential single enrollments...', false);
      var lastData = null;
      for (var k = 0; k < capturedBlobs.length; k++) {
        var singleForm = new FormData();
        singleForm.append('image', capturedBlobs[k], 'face_' + k + '.jpg');
        var singleStart = performance.now();
        var singleRes = await fetch(getApiUrl() + '/api/v1/biometric/enroll/' + uid, {
          method: 'POST',
          headers: token ? { 'Authorization': 'Bearer ' + token } : {},
          body: singleForm
        });
        var singleElapsed = performance.now() - singleStart;
        lastData = await singleRes.json().catch(function() { return null; });
        addLogEntry('POST', '/api/v1/biometric/enroll/' + uid, singleRes.status, singleElapsed, '(angle ' + (k + 1) + ')', lastData);
        showResult('faceResult', 'Angle ' + (k + 1) + ' enrolled: ' + (singleRes.ok ? 'OK' : 'FAILED') + ' (' + formatMs(singleElapsed) + ')', singleRes.ok);
      }
      document.getElementById('faceOverlay').textContent = 'Bank enrollment complete (fallback mode)';
      document.getElementById('faceOverlay').style.color = '#3fb950';
    } else {
      if (multiData) {
        document.getElementById('faceOverlay').textContent = 'BANK ENROLLMENT SUCCESS!';
        document.getElementById('faceOverlay').style.color = '#3fb950';
        showResult('faceResult',
          'MULTI-ANGLE ENROLLMENT COMPLETE! (' + formatMs(elapsed) + ')\n' +
          capturedBlobs.length + ' angles fused into template.\n\n' +
          JSON.stringify(multiData, null, 2), true);
      } else {
        document.getElementById('faceOverlay').textContent = 'Enrollment failed';
        document.getElementById('faceOverlay').style.color = '#f85149';
        showResult('faceResult',
          'Bank enrollment failed (' + (res.status || 'ERR') + '): ' +
          JSON.stringify(multiData, null, 2), false);
      }
    }
  } catch (e) {
    showResult('faceResult', 'Bank enrollment error: ' + e.message, false);
  }

  bankEnrollActive = false;
  btn.disabled = !faceStream;
  btn.textContent = 'Bank Enrollment (3 angles)';
}

function waitForPose(detectFn, timeoutMs) {
  return new Promise(function(resolve) {
    var startTime = performance.now();
    var stableCount = 0;
    var requiredStable = 5; // Need 5 consecutive frames for a stable pose

    function check() {
      if (!faceStream || !faceDetector) { resolve(false); return; }
      if (performance.now() - startTime > timeoutMs) { resolve(false); return; }

      var video = document.getElementById('faceVideo');
      if (video.readyState < 2) {
        requestAnimationFrame(check);
        return;
      }

      try {
        var result = faceDetector.detectForVideo(video, performance.now());
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          var landmarks = result.faceLandmarks[0];
          if (detectFn(landmarks)) {
            stableCount++;
            if (stableCount >= requiredStable) {
              resolve(true);
              return;
            }
          } else {
            stableCount = Math.max(0, stableCount - 1);
          }
        } else {
          stableCount = 0;
        }
      } catch (e) { /* skip frame */ }

      requestAnimationFrame(check);
    }

    requestAnimationFrame(check);
  });
}

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  updateTokenUI();
  initNfc();
  checkPlatformAuth();
  checkHwTokenSupport();

  // Enumerate microphones
  navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
    stream.getTracks().forEach(function(t) { t.stop(); });
    return navigator.mediaDevices.enumerateDevices();
  }).then(function(devices) {
    var select = document.getElementById('voiceMicSelect');
    while (select.firstChild) select.removeChild(select.firstChild);
    devices.filter(function(d) { return d.kind === 'audioinput'; }).forEach(function(d, i) {
      var opt = document.createElement('option');
      opt.value = d.deviceId;
      opt.textContent = d.label || ('Microphone ' + (i + 1));
      select.appendChild(opt);
    });
    if (select.options.length === 0) {
      var fallback = document.createElement('option');
      fallback.value = '';
      fallback.textContent = 'No microphones found';
      select.appendChild(fallback);
    }
  }).catch(function() {
    var select = document.getElementById('voiceMicSelect');
    while (select.firstChild) select.removeChild(select.firstChild);
    var errOpt = document.createElement('option');
    errOpt.value = '';
    errOpt.textContent = 'Mic access denied';
    select.appendChild(errOpt);
  });
  // Don't auto-check external FP scanner — only on button click
  document.getElementById('fpxStat-status').textContent = 'Click Check Scanner';
  document.getElementById('fpxStat-status').style.color = 'var(--text-muted)';
  checkConnection();

  // Bind card headers for toggle
  document.querySelectorAll('.card-header').forEach(function(h) {
    h.addEventListener('click', function() {
      toggleCard(h.parentElement.id);
    });
  });

  // Button bindings
  var bindings = {
    'btnTestConn': checkConnection,
    'btnClearToken': clearToken,
    'btnLogin': doLogin,
    'faceStartBtn': startFaceDetection,
    'faceCaptureBtn': captureFace,
    'btnFaceEnroll': enrollFace,
    'btnFaceVerify': verifyFace,
    'btnFaceSearch': searchFace,
    'btnFaceDelete': deleteFaceEnrollment,
    'btnLivenessPuzzle': startLivenessPuzzle,
    'btnBankEnroll': startBankEnrollment,
    'btnFaceEmbedding': computeAndShowEmbedding,
    'faceStopBtn': stopFaceDetection,
    'voiceRecordBtn': toggleVoiceRecording,
    'btnVoiceEnroll': enrollVoice,
    'btnVoiceVerify': verifyVoice,
    'btnVoiceSearch': searchVoice,
    'btnFpeRegister': fpeRegister,
    'btnFpeVerify': fpeVerify,
    'btnCheckScanner': checkExternalFP,
    'qrStartBtn': startQrScan,
    'qrStopBtn': stopQrScan,
    'btnGenTestQr': generateTestQr,
    'btnSendEmailOtp': sendEmailOtp,
    'btnVerifyEmailOtp': verifyEmailOtp,
    'btnSetupTotp': setupTotp,
    'btnTotpStatus': checkTotpStatus,
    'btnVerifyTotp': verifyTotp,
    'btnSendSms': sendSmsOtp,
    'btnVerifySms': verifySmsOtp,
    'btnHwRegister': hwRegister,
    'btnHwVerify': hwVerify,
    'cardStartBtn': startCardCamera,
    'cardDetectBtn': captureAndDetectCard,
    'cardLiveToggle': toggleCardLiveDetection,
    'cardStopBtn': stopCardCamera,
    'btnClearLog': clearLog
  };
  Object.keys(bindings).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', bindings[id]);
  });
});
