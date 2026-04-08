function d(e) {
  "@babel/helpers - typeof";
  return d = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(t) {
    return typeof t;
  } : function(t) {
    return t && typeof Symbol == "function" && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t;
  }, d(e);
}
function m(e, t) {
  if (d(e) != "object" || !e) return e;
  var i = e[Symbol.toPrimitive];
  if (i !== void 0) {
    var r = i.call(e, t || "default");
    if (d(r) != "object") return r;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (t === "string" ? String : Number)(e);
}
function v(e) {
  var t = m(e, "string");
  return d(t) == "symbol" ? t : t + "";
}
function o(e, t, i) {
  return (t = v(t)) in e ? Object.defineProperty(e, t, {
    value: i,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : e[t] = i, e;
}
var p = "https://verify.fivucsas.com", b = "https://api.fivucsas.com/api/v1", g = "fivucsas-verify-iframe", y = `
.fivucsas-overlay {
    position: fixed;
    inset: 0;
    z-index: 2147483647;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    animation: fivucsas-fade-in 0.2s ease-out;
}
.fivucsas-overlay-inner {
    position: relative;
    width: 100%;
    max-width: 440px;
    max-height: 90vh;
    border-radius: 12px;
    overflow: hidden;
    background: #fff;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
}
.fivucsas-close-btn {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 1;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.06);
    color: #333;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
}
.fivucsas-close-btn:hover {
    background: rgba(0, 0, 0, 0.12);
}
.fivucsas-iframe {
    display: block;
    width: 100%;
    height: 500px;
    border: none;
}
@keyframes fivucsas-fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
}
@media (max-width: 480px) {
    .fivucsas-overlay-inner {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
    }
}
`, h = !1;
function w() {
  if (h) return;
  const e = document.createElement("style");
  e.textContent = y, document.head.appendChild(e), h = !0;
}
var l = class {
  constructor(e) {
    if (o(this, "config", void 0), o(this, "iframe", null), o(this, "overlay", null), o(this, "messageHandler", null), o(this, "activeReject", null), !e.clientId) throw new Error("FivucsasAuth: clientId is required");
    this.config = {
      clientId: e.clientId,
      baseUrl: e.baseUrl ?? p,
      apiBaseUrl: e.apiBaseUrl ?? b,
      locale: e.locale ?? "en",
      theme: e.theme ?? {}
    };
  }
  verify(e = {}) {
    return this.iframe ? Promise.reject(/* @__PURE__ */ new Error("FivucsasAuth: verification already in progress")) : (w(), new Promise((t, i) => {
      this.activeReject = i;
      let r, a = !1;
      if (e.container) {
        const n = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
        if (!n) {
          this.activeReject = null, i(/* @__PURE__ */ new Error(`FivucsasAuth: container not found: ${e.container}`));
          return;
        }
        r = n;
      } else
        a = !0, this.overlay = this.createOverlay(() => {
          e.onCancel?.(), this.cleanup(), i(/* @__PURE__ */ new Error("FivucsasAuth: verification cancelled by user"));
        }), document.body.appendChild(this.overlay), r = this.overlay.querySelector(".fivucsas-overlay-inner");
      this.iframe = this.createIframe(r, e), this.setupMessageListener(t, i, e, a);
    }));
  }
  destroy() {
    this.activeReject && (this.activeReject(/* @__PURE__ */ new Error("FivucsasAuth: destroyed")), this.activeReject = null), this.cleanup();
  }
  createIframe(e, t) {
    const i = document.createElement("iframe");
    return i.id = g, i.className = "fivucsas-iframe", i.src = this.buildIframeUrl(t), i.setAttribute("allow", "camera 'src'; microphone 'src'; publickey-credentials-get 'src'"), i.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups allow-modals"), i.setAttribute("title", "FIVUCSAS Identity Verification"), e.appendChild(i), i;
  }
  createOverlay(e) {
    const t = document.createElement("div");
    t.className = "fivucsas-overlay";
    const i = document.createElement("div");
    i.className = "fivucsas-overlay-inner";
    const r = document.createElement("button");
    r.className = "fivucsas-close-btn", r.setAttribute("aria-label", "Close verification"), r.textContent = "×", r.addEventListener("click", e), i.appendChild(r), t.appendChild(i), t.addEventListener("click", (n) => {
      n.target === t && e();
    });
    const a = (n) => {
      n.key === "Escape" && (document.removeEventListener("keydown", a), e());
    };
    return document.addEventListener("keydown", a), t;
  }
  buildIframeUrl(e) {
    const t = new URL(this.config.baseUrl);
    return t.searchParams.set("client_id", this.config.clientId), e.flow && t.searchParams.set("flow", e.flow), e.userId && t.searchParams.set("user_id", e.userId), e.sessionId ? (t.searchParams.set("session_id", e.sessionId), t.searchParams.set("mode", "session")) : t.searchParams.set("mode", "login"), e.methods?.length && t.searchParams.set("methods", e.methods.join(",")), this.config.locale && t.searchParams.set("locale", this.config.locale), this.config.apiBaseUrl && t.searchParams.set("api_base_url", this.config.apiBaseUrl), this.config.theme?.mode && t.searchParams.set("theme", this.config.theme.mode), t.toString();
  }
  setupMessageListener(e, t, i, r) {
    this.messageHandler = (a) => {
      const n = new URL(this.config.baseUrl).origin;
      if (a.origin !== n) return;
      const c = a.data;
      if (!c || typeof c != "object" || typeof c.type != "string" || !c.type.startsWith("fivucsas:")) return;
      const s = c.payload ?? {};
      switch (c.type) {
        case "fivucsas:ready":
          this.iframe?.contentWindow?.postMessage({
            type: "fivucsas:config",
            payload: {
              theme: this.config.theme.mode ?? "light",
              locale: this.config.locale,
              apiBaseUrl: this.config.apiBaseUrl,
              allowedOrigin: window.location.origin
            }
          }, n);
          break;
        case "fivucsas:step-change":
          i.onStepChange?.({
            method: String(s.methodType ?? ""),
            progress: Number(s.stepIndex ?? 0) + 1,
            total: Number(s.totalSteps ?? 0)
          });
          break;
        case "fivucsas:complete": {
          const u = {
            success: !0,
            sessionId: String(s.sessionId ?? ""),
            userId: s.userId ? String(s.userId) : void 0,
            email: s.email ? String(s.email) : void 0,
            displayName: s.displayName ? String(s.displayName) : void 0,
            completedMethods: Array.isArray(s.completedMethods) ? s.completedMethods.map(String) : [],
            authCode: s.authCode ? String(s.authCode) : void 0,
            accessToken: s.accessToken ? String(s.accessToken) : void 0,
            refreshToken: s.refreshToken ? String(s.refreshToken) : void 0,
            timestamp: typeof s.timestamp == "number" ? s.timestamp : void 0
          };
          this.activeReject = null, this.cleanup(), e(u);
          break;
        }
        case "fivucsas:error": {
          const u = {
            code: String(s.code ?? "UNKNOWN"),
            message: String(s.error ?? "Verification failed")
          };
          i.onError?.(u), this.activeReject = null, this.cleanup(), t(/* @__PURE__ */ new Error(`FivucsasAuth [${u.code}]: ${u.message}`));
          break;
        }
        case "fivucsas:cancel":
          i.onCancel?.(), this.activeReject = null, this.cleanup(), t(/* @__PURE__ */ new Error("FivucsasAuth: verification cancelled"));
          break;
        case "fivucsas:resize":
          this.iframe && typeof s.height == "number" && (this.iframe.style.height = `${s.height}px`);
          break;
      }
    }, window.addEventListener("message", this.messageHandler);
  }
  cleanup() {
    this.messageHandler && (window.removeEventListener("message", this.messageHandler), this.messageHandler = null), this.iframe && (this.iframe.remove(), this.iframe = null), this.overlay && (this.overlay.remove(), this.overlay = null);
  }
}, E = `
:host {
    display: inline-block;
}
.fivucsas-trigger-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    background: #1a73e8;
    color: #fff;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
}
.fivucsas-trigger-btn:hover {
    background: #1557b0;
}
.fivucsas-trigger-btn:active {
    transform: scale(0.98);
}
.fivucsas-trigger-btn .icon {
    width: 18px;
    height: 18px;
}
.fivucsas-inline-container {
    width: 100%;
    min-height: 200px;
}
`, x = class extends HTMLElement {
  static get observedAttributes() {
    return [
      "client-id",
      "flow",
      "user-id",
      "theme",
      "locale",
      "api-base-url",
      "base-url"
    ];
  }
  constructor() {
    super(), o(this, "auth", null), o(this, "shadow", void 0), o(this, "verifying", !1), this.shadow = this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.render(), this.hasAttribute("auto-verify") && this.startVerification();
  }
  disconnectedCallback() {
    this.auth?.destroy(), this.auth = null;
  }
  attributeChangedCallback() {
    this.auth?.destroy(), this.auth = null;
  }
  async startVerification() {
    if (!this.verifying) {
      this.verifying = !0;
      try {
        this.auth = new l(this.buildConfig());
        const e = this.buildOptions(), t = await this.auth.verify(e);
        return this.dispatchEvent(new CustomEvent("fivucsas-complete", {
          detail: t,
          bubbles: !0,
          composed: !0
        })), t;
      } catch (e) {
        const t = e instanceof Error ? e.message : String(e);
        t.includes("cancelled") ? this.dispatchEvent(new CustomEvent("fivucsas-cancel", {
          bubbles: !0,
          composed: !0
        })) : this.dispatchEvent(new CustomEvent("fivucsas-error", {
          detail: { message: t },
          bubbles: !0,
          composed: !0
        }));
        return;
      } finally {
        this.verifying = !1;
      }
    }
  }
  render() {
    const e = document.createElement("style");
    e.textContent = E;
    const t = document.createElement("button");
    t.className = "fivucsas-trigger-btn";
    const i = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    i.setAttribute("class", "icon"), i.setAttribute("viewBox", "0 0 24 24"), i.setAttribute("fill", "currentColor");
    const r = document.createElementNS("http://www.w3.org/2000/svg", "path");
    r.setAttribute("d", "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"), i.appendChild(r);
    const a = document.createElement("span");
    for (a.textContent = "Verify with FIVUCSAS", t.appendChild(i), t.appendChild(a), t.addEventListener("click", () => this.startVerification()); this.shadow.firstChild; ) this.shadow.removeChild(this.shadow.firstChild);
    this.shadow.appendChild(e), this.shadow.appendChild(t);
  }
  buildConfig() {
    const e = this.getAttribute("client-id") ?? "";
    if (!e) throw new Error("<fivucsas-verify>: client-id attribute is required");
    let t;
    const i = this.getAttribute("theme");
    if (i) try {
      t = JSON.parse(i);
    } catch {
    }
    return {
      clientId: e,
      baseUrl: this.getAttribute("base-url") ?? void 0,
      apiBaseUrl: this.getAttribute("api-base-url") ?? void 0,
      locale: this.getAttribute("locale") ?? void 0,
      theme: t
    };
  }
  buildOptions() {
    return {
      flow: this.getAttribute("flow") ?? void 0,
      userId: this.getAttribute("user-id") ?? void 0,
      onStepChange: (e) => {
        this.dispatchEvent(new CustomEvent("fivucsas-step-change", {
          detail: e,
          bubbles: !0,
          composed: !0
        }));
      },
      onError: (e) => {
        this.dispatchEvent(new CustomEvent("fivucsas-error", {
          detail: e,
          bubbles: !0,
          composed: !0
        }));
      },
      onCancel: () => {
        this.dispatchEvent(new CustomEvent("fivucsas-cancel", {
          bubbles: !0,
          composed: !0
        }));
      }
    };
  }
};
customElements.define("fivucsas-verify", x);
if (typeof l == "object" && l.FivucsasAuth) {
  var f = l.FivucsasAuth;
  Object.assign(f, l), l = f;
}
export {
  l as FivucsasAuth,
  x as FivucsasVerifyElement
};

//# sourceMappingURL=fivucsas-auth.esm.js.map