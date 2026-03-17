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
  updateTokenUI();
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
  el.textContent = text;
  el.className = 'result-box ' + (ok ? 'success' : 'error');
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
    var res = await fetch(getApiUrl() + '/health', { method: 'GET', signal: AbortSignal.timeout(5000) });
    var elapsed = performance.now() - start;
    if (res.ok) {
      dot.className = 'status-dot green';
      txt.textContent = 'Connected (' + formatMs(elapsed) + ')';
      addLogEntry('GET', '/health', res.status, elapsed, null, 'OK');
    } else {
      dot.className = 'status-dot yellow';
      txt.textContent = 'HTTP ' + res.status;
      addLogEntry('GET', '/health', res.status, elapsed, null, null);
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
    showResult('loginResult',
      'Login successful (' + formatMs(res.elapsed) + ')\n\n' + JSON.stringify(res.data, null, 2), true);
  } else {
    showResult('loginResult',
      'Login failed: ' + (res.error || JSON.stringify(res.data, null, 2)), false);
  }
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
    faceStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
    video.srcObject = faceStream;
    document.getElementById('faceOverlay').textContent = 'Camera active';
    document.getElementById('faceStat-status').textContent = 'Camera OK';

    // Try loading MediaPipe
    try {
      var modelStart = performance.now();
      var vision = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs');
      var FaceDetector = vision.FaceDetector;
      var FilesetResolver = vision.FilesetResolver;
      var filesetResolver = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      faceDetector = await FaceDetector.createFromOptions(filesetResolver, {
        baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite', delegate: 'GPU' },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.5
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

    if (result.detections && result.detections.length > 0) {
      var det = result.detections[0];
      var conf = det.categories && det.categories[0] ? det.categories[0].score : 0;
      document.getElementById('faceStat-status').textContent = 'Detected';
      document.getElementById('faceStat-confidence').textContent = (conf * 100).toFixed(1) + '%';
      document.getElementById('faceOverlay').textContent = 'Face detected';

      if (det.boundingBox) {
        var bb = det.boundingBox;
        ctx.strokeStyle = '#58a6ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(bb.originX, bb.originY, bb.width, bb.height);
      }
    } else {
      document.getElementById('faceStat-status').textContent = 'No face';
      document.getElementById('faceStat-confidence').textContent = '--';
      document.getElementById('faceOverlay').textContent = 'No face detected';
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

function captureFace() {
  var video = document.getElementById('faceVideo');
  var c = document.createElement('canvas');
  c.width = video.videoWidth; c.height = video.videoHeight;
  c.getContext('2d').drawImage(video, 0, 0);
  c.toBlob(function(blob) {
    showResult('faceResult',
      'Captured frame: ' + formatBytes(blob.size) + ' JPEG\nResolution: ' + c.width + 'x' + c.height +
      '\n\nBlob ready for API submission.', true);
  }, 'image/jpeg', 0.9);
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
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    voiceAudioCtx = new AudioContext();
    var source = voiceAudioCtx.createMediaStreamSource(voiceStream);
    voiceAnalyser = voiceAudioCtx.createAnalyser();
    voiceAnalyser.fftSize = 2048;
    source.connect(voiceAnalyser);

    voiceChunks = [];
    voiceRecorder = new MediaRecorder(voiceStream, { mimeType: 'audio/webm' });
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
        showResult('voiceResult', 'Recording complete.\nBase64 length: ' + base64.length + ' chars\nReady for API submission.', true);
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
    showResult('fpxResult', 'No SecuGen WebAPI detected at localhost:9120\n' + e.message, false);
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
  var email = document.getElementById('emailOtpAddr').value || 'admin@fivucsas.local';
  var res = await apiCall('POST', '/api/v1/auth/otp/email/send', { email: email });
  showResult('emailOtpResult', res.ok
    ? 'OTP sent to ' + email + ' (' + formatMs(res.elapsed) + ')\n' + JSON.stringify(res.data, null, 2)
    : 'Failed: ' + (res.error || JSON.stringify(res.data, null, 2)), res.ok);
}

async function verifyEmailOtp() {
  var email = document.getElementById('emailOtpAddr').value || 'admin@fivucsas.local';
  var code = document.getElementById('emailOtpCode').value;
  if (!code || code.length < 6) { showResult('emailOtpResult', 'Enter a 6-digit OTP code.', false); return; }
  var res = await apiCall('POST', '/api/v1/auth/otp/email/verify', { email: email, code: code });
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
  var code = document.getElementById('totpCode').value;
  if (!code || code.length < 6) { showResult('totpResult', 'Enter a 6-digit TOTP code.', false); return; }
  var res = await apiCall('POST', '/api/v1/auth/totp/verify', { code: code });
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
  var phone = document.getElementById('smsPhone').value;
  if (!phone) { showResult('smsOtpResult', 'Enter a phone number.', false); return; }
  var res = await apiCall('POST', '/api/v1/auth/otp/sms/send', { phone: phone });
  showResult('smsOtpResult', res.ok
    ? 'SMS sent to ' + phone + ' (' + formatMs(res.elapsed) + ')\n' + JSON.stringify(res.data, null, 2)
    : 'Failed: ' + (res.error || JSON.stringify(res.data, null, 2)), res.ok);
}

async function verifySmsOtp() {
  var phone = document.getElementById('smsPhone').value;
  var code = document.getElementById('smsOtpCode').value;
  if (!code || code.length < 6) { showResult('smsOtpResult', 'Enter a 6-digit OTP code.', false); return; }
  var res = await apiCall('POST', '/api/v1/auth/otp/sms/verify', { phone: phone, code: code });
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
  checkExternalFP();
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
    'faceStopBtn': stopFaceDetection,
    'voiceRecordBtn': toggleVoiceRecording,
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
