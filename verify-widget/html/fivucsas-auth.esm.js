//#region \0@oxc-project+runtime@0.124.0/helpers/typeof.js
function e(t) {
	"@babel/helpers - typeof";
	return e = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e) {
		return typeof e;
	} : function(e) {
		return e && typeof Symbol == "function" && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
	}, e(t);
}
//#endregion
//#region \0@oxc-project+runtime@0.124.0/helpers/toPrimitive.js
function t(t, n) {
	if (e(t) != "object" || !t) return t;
	var r = t[Symbol.toPrimitive];
	if (r !== void 0) {
		var i = r.call(t, n || "default");
		if (e(i) != "object") return i;
		throw TypeError("@@toPrimitive must return a primitive value.");
	}
	return (n === "string" ? String : Number)(t);
}
//#endregion
//#region \0@oxc-project+runtime@0.124.0/helpers/toPropertyKey.js
function n(n) {
	var r = t(n, "string");
	return e(r) == "symbol" ? r : r + "";
}
//#endregion
//#region \0@oxc-project+runtime@0.124.0/helpers/defineProperty.js
function r(e, t, r) {
	return (t = n(t)) in e ? Object.defineProperty(e, t, {
		value: r,
		enumerable: !0,
		configurable: !0,
		writable: !0
	}) : e[t] = r, e;
}
//#endregion
//#region src/verify-app/sdk/FivucsasAuth.ts
var i = "https://verify.fivucsas.com", a = "https://api.fivucsas.com/api/v1", o = "fivucsas-verify-iframe", s = "\n.fivucsas-overlay {\n    position: fixed;\n    inset: 0;\n    z-index: 2147483647;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    background: rgba(0, 0, 0, 0.55);\n    backdrop-filter: blur(4px);\n    -webkit-backdrop-filter: blur(4px);\n    animation: fivucsas-fade-in 0.2s ease-out;\n}\n.fivucsas-overlay-inner {\n    position: relative;\n    width: 100%;\n    max-width: 440px;\n    max-height: 90vh;\n    border-radius: 12px;\n    overflow: hidden;\n    background: #fff;\n    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);\n}\n.fivucsas-close-btn {\n    position: absolute;\n    top: 8px;\n    right: 8px;\n    z-index: 1;\n    width: 32px;\n    height: 32px;\n    border: none;\n    border-radius: 50%;\n    background: rgba(0, 0, 0, 0.06);\n    color: #333;\n    font-size: 18px;\n    line-height: 1;\n    cursor: pointer;\n    display: flex;\n    align-items: center;\n    justify-content: center;\n    transition: background 0.15s;\n}\n.fivucsas-close-btn:hover {\n    background: rgba(0, 0, 0, 0.12);\n}\n.fivucsas-iframe {\n    display: block;\n    width: 100%;\n    height: 500px;\n    border: none;\n}\n@keyframes fivucsas-fade-in {\n    from { opacity: 0; }\n    to   { opacity: 1; }\n}\n@media (max-width: 480px) {\n    .fivucsas-overlay-inner {\n        max-width: 100%;\n        max-height: 100vh;\n        border-radius: 0;\n    }\n}\n", c = !1;
function l() {
	if (c) return;
	let e = document.createElement("style");
	e.textContent = s, document.head.appendChild(e), c = !0;
}
var u = class {
	constructor(e) {
		if (r(this, "config", void 0), r(this, "iframe", null), r(this, "overlay", null), r(this, "messageHandler", null), r(this, "activeReject", null), !e.clientId) throw Error("FivucsasAuth: clientId is required");
		this.config = {
			clientId: e.clientId,
			baseUrl: e.baseUrl ?? i,
			apiBaseUrl: e.apiBaseUrl ?? a,
			locale: e.locale ?? "en",
			theme: e.theme ?? {}
		};
	}
	verify(e = {}) {
		return this.iframe ? Promise.reject(/* @__PURE__ */ Error("FivucsasAuth: verification already in progress")) : (l(), new Promise((t, n) => {
			this.activeReject = n;
			let r, i = !1;
			if (e.container) {
				let t = typeof e.container == "string" ? document.querySelector(e.container) : e.container;
				if (!t) {
					this.activeReject = null, n(/* @__PURE__ */ Error(`FivucsasAuth: container not found: ${e.container}`));
					return;
				}
				r = t;
			} else i = !0, this.overlay = this.createOverlay(() => {
				e.onCancel?.(), this.cleanup(), n(/* @__PURE__ */ Error("FivucsasAuth: verification cancelled by user"));
			}), document.body.appendChild(this.overlay), r = this.overlay.querySelector(".fivucsas-overlay-inner");
			this.iframe = this.createIframe(r, e), this.setupMessageListener(t, n, e, i);
		}));
	}
	destroy() {
		this.activeReject && (this.activeReject(/* @__PURE__ */ Error("FivucsasAuth: destroyed")), this.activeReject = null), this.cleanup();
	}
	createIframe(e, t) {
		let n = document.createElement("iframe");
		return n.id = o, n.className = "fivucsas-iframe", n.src = this.buildIframeUrl(t), n.setAttribute("allow", "camera; microphone; publickey-credentials-get; publickey-credentials-create"), n.setAttribute("sandbox", "allow-scripts allow-forms allow-same-origin allow-popups allow-modals"), n.setAttribute("title", "FIVUCSAS Identity Verification"), e.appendChild(n), n;
	}
	createOverlay(e) {
		let t = document.createElement("div");
		t.className = "fivucsas-overlay";
		let n = document.createElement("div");
		n.className = "fivucsas-overlay-inner";
		let r = document.createElement("button");
		r.className = "fivucsas-close-btn", r.setAttribute("aria-label", "Close verification"), r.textContent = "×", r.addEventListener("click", e), n.appendChild(r), t.appendChild(n), t.addEventListener("click", (n) => {
			n.target === t && e();
		});
		let i = (t) => {
			t.key === "Escape" && (document.removeEventListener("keydown", i), e());
		};
		return document.addEventListener("keydown", i), t;
	}
	buildIframeUrl(e) {
		let t = new URL(this.config.baseUrl);
		return t.searchParams.set("client_id", this.config.clientId), e.flow && t.searchParams.set("flow", e.flow), e.userId && t.searchParams.set("user_id", e.userId), e.sessionId ? (t.searchParams.set("session_id", e.sessionId), t.searchParams.set("mode", "session")) : t.searchParams.set("mode", "login"), e.methods?.length && t.searchParams.set("methods", e.methods.join(",")), this.config.locale && t.searchParams.set("locale", this.config.locale), this.config.apiBaseUrl && t.searchParams.set("api_base_url", this.config.apiBaseUrl), this.config.theme?.mode && t.searchParams.set("theme", this.config.theme.mode), t.toString();
	}
	setupMessageListener(e, t, n, r) {
		this.messageHandler = (r) => {
			let i = new URL(this.config.baseUrl).origin;
			if (r.origin !== i) return;
			let a = r.data;
			if (!a || typeof a != "object" || typeof a.type != "string" || !a.type.startsWith("fivucsas:")) return;
			let o = a.payload ?? {};
			switch (a.type) {
				case "fivucsas:ready":
					this.iframe?.contentWindow?.postMessage({
						type: "fivucsas:config",
						payload: {
							theme: this.config.theme.mode ?? "light",
							locale: this.config.locale,
							apiBaseUrl: this.config.apiBaseUrl,
							allowedOrigin: window.location.origin
						}
					}, i);
					break;
				case "fivucsas:step-change":
					n.onStepChange?.({
						method: String(o.methodType ?? ""),
						progress: Number(o.stepIndex ?? 0) + 1,
						total: Number(o.totalSteps ?? 0)
					});
					break;
				case "fivucsas:complete": {
					let t = {
						success: !0,
						sessionId: String(o.sessionId ?? ""),
						userId: o.userId ? String(o.userId) : void 0,
						email: o.email ? String(o.email) : void 0,
						displayName: o.displayName ? String(o.displayName) : void 0,
						completedMethods: Array.isArray(o.completedMethods) ? o.completedMethods.map(String) : [],
						authCode: o.authCode ? String(o.authCode) : void 0,
						accessToken: o.accessToken ? String(o.accessToken) : void 0,
						refreshToken: o.refreshToken ? String(o.refreshToken) : void 0,
						timestamp: typeof o.timestamp == "number" ? o.timestamp : void 0
					};
					this.activeReject = null, this.cleanup(), e(t);
					break;
				}
				case "fivucsas:error": {
					let e = {
						code: String(o.code ?? "UNKNOWN"),
						message: String(o.error ?? "Verification failed")
					};
					n.onError?.(e), this.activeReject = null, this.cleanup(), t(/* @__PURE__ */ Error(`FivucsasAuth [${e.code}]: ${e.message}`));
					break;
				}
				case "fivucsas:cancel":
					n.onCancel?.(), this.activeReject = null, this.cleanup(), t(/* @__PURE__ */ Error("FivucsasAuth: verification cancelled"));
					break;
				case "fivucsas:resize":
					this.iframe && typeof o.height == "number" && (this.iframe.style.height = `${o.height}px`);
					break;
			}
		}, window.addEventListener("message", this.messageHandler);
	}
	cleanup() {
		this.messageHandler && (window.removeEventListener("message", this.messageHandler), this.messageHandler = null), this.iframe && (this.iframe.remove(), this.iframe = null), this.overlay && (this.overlay.remove(), this.overlay = null);
	}
}, d = "\n:host {\n    display: inline-block;\n}\n.fivucsas-trigger-btn {\n    display: inline-flex;\n    align-items: center;\n    gap: 8px;\n    padding: 10px 20px;\n    border: none;\n    border-radius: 8px;\n    background: #1a73e8;\n    color: #fff;\n    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n    font-size: 14px;\n    font-weight: 600;\n    cursor: pointer;\n    transition: background 0.15s, transform 0.1s;\n}\n.fivucsas-trigger-btn:hover {\n    background: #1557b0;\n}\n.fivucsas-trigger-btn:active {\n    transform: scale(0.98);\n}\n.fivucsas-trigger-btn .icon {\n    width: 18px;\n    height: 18px;\n}\n.fivucsas-inline-container {\n    width: 100%;\n    min-height: 200px;\n}\n", f = class extends HTMLElement {
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
		super(), r(this, "auth", null), r(this, "shadow", void 0), r(this, "verifying", !1), this.shadow = this.attachShadow({ mode: "open" });
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
				this.auth = new u(this.buildConfig());
				let e = this.buildOptions(), t = await this.auth.verify(e);
				return this.dispatchEvent(new CustomEvent("fivucsas-complete", {
					detail: t,
					bubbles: !0,
					composed: !0
				})), t;
			} catch (e) {
				let t = e instanceof Error ? e.message : String(e);
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
		let e = document.createElement("style");
		e.textContent = d;
		let t = document.createElement("button");
		t.className = "fivucsas-trigger-btn";
		let n = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		n.setAttribute("class", "icon"), n.setAttribute("viewBox", "0 0 24 24"), n.setAttribute("fill", "currentColor");
		let r = document.createElementNS("http://www.w3.org/2000/svg", "path");
		r.setAttribute("d", "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"), n.appendChild(r);
		let i = document.createElement("span");
		for (i.textContent = "Verify with FIVUCSAS", t.appendChild(n), t.appendChild(i), t.addEventListener("click", () => this.startVerification()); this.shadow.firstChild;) this.shadow.removeChild(this.shadow.firstChild);
		this.shadow.appendChild(e), this.shadow.appendChild(t);
	}
	buildConfig() {
		let e = this.getAttribute("client-id") ?? "";
		if (!e) throw Error("<fivucsas-verify>: client-id attribute is required");
		let t, n = this.getAttribute("theme");
		if (n) try {
			t = JSON.parse(n);
		} catch {}
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
customElements.define("fivucsas-verify", f);
//#endregion
export { u as FivucsasAuth, f as FivucsasVerifyElement };
if (typeof u == "object" && u.FivucsasAuth) {
	var p = u.FivucsasAuth;
	Object.assign(p, u), u = p;
}

//# sourceMappingURL=fivucsas-auth.esm.js.map