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

async function doLogin() {
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

async function startFaceDetection() {
  var video = document.getElementById('faceVideo');
  var container = document.getElementById('faceContainer');
  var statsEl = document.getElementById('faceStats');
  document.getElementById('faceStartBtn').disabled = true;
  document.getElementById('faceStopBtn').disabled = false;
  document.getElementById('faceCaptureBtn').disabled = false;
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
    } else {
      document.getElementById('faceStat-status').textContent = 'No face';
      document.getElementById('faceStat-status').style.color = 'var(--red)';
      document.getElementById('faceStat-confidence').textContent = '--';
      document.getElementById('faceOverlay').textContent = 'Position your face in the oval guide';
      document.getElementById('faceOverlay').style.color = 'var(--text-secondary)';
    }
  } catch (e) { /* skip frame */ }

  faceAnimFrame = requestAnimationFrame(detectFaceLoop);
}

function stopFaceDetection() {
  if (faceAnimFrame) cancelAnimationFrame(faceAnimFrame);
  if (faceStream) { faceStream.getTracks().forEach(function(t) { t.stop(); }); faceStream = null; }
  if (faceDetector) { faceDetector.close(); faceDetector = null; }
  document.getElementById('faceContainer').style.display = 'none';
  document.getElementById('faceStartBtn').disabled = false;
  document.getElementById('faceStopBtn').disabled = true;
  document.getElementById('faceCaptureBtn').disabled = true;
}

var lastFaceBlob = null;

function captureFace() {
  var video = document.getElementById('faceVideo');
  var c = document.createElement('canvas');
  c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  c.toBlob(function(blob) {
    lastFaceBlob = blob;
    document.getElementById('btnFaceEnroll').disabled = false;
    document.getElementById('btnFaceVerify').disabled = false;
    document.getElementById('btnFaceSearch').disabled = false;
    showResult('faceResult',
      'Captured frame: ' + formatBytes(blob.size) + ' JPEG\nResolution: ' + c.width + 'x' + c.height +
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
      document.getElementById('voiceStat-duration').textContent = duration.toFixed(1) + 's';
      document.getElementById('voiceStat-samplerate').textContent = voiceAudioCtx.sampleRate + ' Hz';
      document.getElementById('voiceStat-size').textContent = formatBytes(blob.size);

      var reader = new FileReader();
      reader.onload = function() {
        var base64 = reader.result.split(',')[1];
        voiceBase64Data = base64;
        showResult('voiceResult', 'Recording complete.\nBase64 length: ' + base64.length + ' chars\nReady for Enroll or Verify.', true);
        // Enable enroll/verify buttons
        document.getElementById('btnVoiceEnroll').disabled = false;
        document.getElementById('btnVoiceVerify').disabled = false;
      };
      reader.readAsDataURL(blob);
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
    showResult('voiceResult', 'Voice enrollment: ' + JSON.stringify(resp, null, 2), resp.verified !== false);
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
    showResult('voiceResult', 'Voice verification: ' + JSON.stringify(resp, null, 2), resp.verified === true);
  } catch (e) {
    showResult('voiceResult', 'Voice verification failed: ' + e.message, false);
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

var qrScanner = null;

async function startQrScan() {
  var video = document.getElementById('qrVideo');
  var container = document.getElementById('qrContainer');
  container.style.display = 'block';
  document.getElementById('qrStartBtn').disabled = true;
  document.getElementById('qrStopBtn').disabled = false;

  try {
    if (typeof QrScanner === 'undefined' && typeof window.QrScanner === 'undefined') {
      showResult('qrResult', 'QR Scanner library not loaded. Check CDN.', false);
      return;
    }
    qrScanner = new QrScanner(video, function(result) {
      showResult('qrResult', 'QR Decoded:\n' + result.data, true);
    }, { highlightScanRegion: true, highlightCodeOutline: true });
    await qrScanner.start();
  } catch (e) {
    showResult('qrResult', 'QR Scanner error: ' + (e.message || e), false);
    document.getElementById('qrStartBtn').disabled = false;
  }
}

function stopQrScan() {
  if (qrScanner) { qrScanner.stop(); qrScanner.destroy(); qrScanner = null; }
  document.getElementById('qrContainer').style.display = 'none';
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
  box.textContent = 'Test QR Payload (copy to any QR generator):\n\n' + payload;
  el.appendChild(box);
}

// ── 7. Email OTP ─────────────────────────────────────────────────────

async function sendEmailOtp() {
  var uid = getUserId();
  if (!uid) { showResult('emailOtpResult', 'Login first to get user ID.', false); return; }
  var res = await apiCall('POST', '/api/v1/otp/email/send/' + uid, null);
  showResult('emailOtpResult', res.ok
    ? 'OTP sent! (' + formatMs(res.elapsed) + ')\n' + JSON.stringify(res.data, null, 2)
    : 'Failed: ' + (res.error || JSON.stringify(res.data, null, 2)), res.ok);
}

async function verifyEmailOtp() {
  var uid = getUserId();
  if (!uid) { showResult('emailOtpResult', 'Login first to get user ID.', false); return; }
  var code = document.getElementById('emailOtpCode').value;
  if (!code || code.length < 6) { showResult('emailOtpResult', 'Enter a 6-digit OTP code.', false); return; }
  var res = await apiCall('POST', '/api/v1/otp/email/verify/' + uid, { code: code });
  if (res.ok && res.data) {
    var token = res.data.token || res.data.accessToken || res.data.access_token;
    if (token) setToken(token);
  }
  showResult('emailOtpResult', res.ok
    ? 'Verified! (' + formatMs(res.elapsed) + ')\n' + JSON.stringify(res.data, null, 2)
    : 'Failed: ' + (res.error || JSON.stringify(res.data, null, 2)), res.ok);
}

// ── 8. TOTP ──────────────────────────────────────────────────────────

async function verifyTotp() {
  var uid = getUserId();
  if (!uid) { showResult('totpResult', 'Login first to get user ID.', false); return; }
  var code = document.getElementById('totpCode').value;
  if (!code || code.length < 6) { showResult('totpResult', 'Enter a 6-digit TOTP code.', false); return; }
  var res = await apiCall('POST', '/api/v1/otp/totp/verify-setup/' + uid, { code: code });
  if (res.ok && res.data) {
    var token = res.data.token || res.data.accessToken || res.data.access_token;
    if (token) setToken(token);
  }
  showResult('totpResult', res.ok
    ? 'TOTP verified! (' + formatMs(res.elapsed) + ')\n' + JSON.stringify(res.data, null, 2)
    : 'Failed: ' + (res.error || JSON.stringify(res.data, null, 2)), res.ok);
}

// ── 9. SMS OTP ───────────────────────────────────────────────────────

async function sendSmsOtp() {
  var uid = getUserId();
  if (!uid) { showResult('smsOtpResult', 'Login first to get user ID.', false); return; }
  var res = await apiCall('POST', '/api/v1/otp/sms/send/' + uid, null);
  showResult('smsOtpResult', res.ok
    ? 'SMS sent! (' + formatMs(res.elapsed) + ')\n' + JSON.stringify(res.data, null, 2)
    : 'Failed: ' + (res.error || JSON.stringify(res.data, null, 2)), res.ok);
}

async function verifySmsOtp() {
  var uid = getUserId();
  if (!uid) { showResult('smsOtpResult', 'Login first to get user ID.', false); return; }
  var code = document.getElementById('smsOtpCode').value;
  if (!code || code.length < 6) { showResult('smsOtpResult', 'Enter a 6-digit OTP code.', false); return; }
  var res = await apiCall('POST', '/api/v1/otp/sms/verify/' + uid, { code: code });
  if (res.ok && res.data) {
    var token = res.data.token || res.data.accessToken || res.data.access_token;
    if (token) setToken(token);
  }
  showResult('smsOtpResult', res.ok
    ? 'Verified! (' + formatMs(res.elapsed) + ')\n' + JSON.stringify(res.data, null, 2)
    : 'Failed: ' + (res.error || JSON.stringify(res.data, null, 2)), res.ok);
}

// ── 10. Hardware Token ───────────────────────────────────────────────

async function hwRegister() {
  var username = document.getElementById('hwUsername').value || 'testuser';
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
        authenticatorSelection: { authenticatorAttachment: 'cross-platform', userVerification: 'preferred' },
        timeout: 90000
      }
    });
    var credId = bufToBase64url(credential.rawId);
    showResult('hwResult',
      'Hardware key registered!\nCredential ID: ' + credId +
      '\nAttestation format: ' + (credential.response.attestationObject ? 'present' : 'none'), true);
    localStorage.setItem('fivucsas_hw_credId', credId);
  } catch (e) {
    showResult('hwResult', 'Registration failed: ' + e.message, false);
  }
}

async function hwVerify() {
  var challenge = randomBytes(32);
  var allowCredentials = [];
  var storedId = localStorage.getItem('fivucsas_hw_credId');
  if (storedId) {
    var raw = Uint8Array.from(atob(storedId.replace(/-/g,'+').replace(/_/g,'/')), function(c) { return c.charCodeAt(0); });
    allowCredentials.push({ id: raw, type: 'public-key', transports: ['usb', 'nfc', 'ble'] });
  }
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
    showResult('hwResult', 'Verification failed: ' + e.message, false);
  }
}

// ── Init ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  updateTokenUI();
  initNfc();
  checkPlatformAuth();

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
    'faceStopBtn': stopFaceDetection,
    'voiceRecordBtn': toggleVoiceRecording,
    'btnVoiceEnroll': enrollVoice,
    'btnVoiceVerify': verifyVoice,
    'btnFpeRegister': fpeRegister,
    'btnFpeVerify': fpeVerify,
    'btnCheckScanner': checkExternalFP,
    'qrStartBtn': startQrScan,
    'qrStopBtn': stopQrScan,
    'btnGenTestQr': generateTestQr,
    'btnSendEmailOtp': sendEmailOtp,
    'btnVerifyEmailOtp': verifyEmailOtp,
    'btnVerifyTotp': verifyTotp,
    'btnSendSms': sendSmsOtp,
    'btnVerifySms': verifySmsOtp,
    'btnHwRegister': hwRegister,
    'btnHwVerify': hwVerify,
    'btnClearLog': clearLog
  };
  Object.keys(bindings).forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', bindings[id]);
  });
});
