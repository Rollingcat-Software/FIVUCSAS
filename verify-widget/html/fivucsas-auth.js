if((function(e){Object.defineProperty(e,Symbol.toStringTag,{value:`Module`});function t(e){"@babel/helpers - typeof";return t=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},t(e)}function n(e,n){if(t(e)!=`object`||!e)return e;var r=e[Symbol.toPrimitive];if(r!==void 0){var i=r.call(e,n||`default`);if(t(i)!=`object`)return i;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(n===`string`?String:Number)(e)}function r(e){var r=n(e,`string`);return t(r)==`symbol`?r:r+``}function i(e,t,n){return(t=r(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var a=`https://verify.fivucsas.com`,o=`https://api.fivucsas.com/api/v1`,s=`fivucsas-verify-iframe`,c=`fivucsas:pkce`,l=`fivucsas:state`,u=`fivucsas:nonce`,d=`fivucsas:redirect_uri`;function f(e){let t=``;for(let n=0;n<e.length;n++)t+=String.fromCharCode(e[n]);return btoa(t).replace(/\+/g,`-`).replace(/\//g,`_`).replace(/=+$/,``)}function p(e=32){let t=new Uint8Array(e);return crypto.getRandomValues(t),f(t)}async function m(){let e=p(32),t=await crypto.subtle.digest(`SHA-256`,new TextEncoder().encode(e));return{verifier:e,challenge:f(new Uint8Array(t))}}var h=/^[a-z][a-z0-9+.-]*$/;function g(e){if(!e||typeof e!=`string`)throw Error(`FivucsasAuth: redirect URI is empty or not a string`);let t;try{t=new URL(e)}catch{throw Error(`FivucsasAuth: redirect URI is not a valid URL: ${e}`)}let n=t.protocol.replace(/:$/,``).toLowerCase();if(new Set([`javascript`,`data`,`vbscript`,`file`,`blob`]).has(n))throw Error(`FivucsasAuth: redirect URI scheme not allowed: ${n}:`);if(n!==`https`){if(n===`http`){let e=t.hostname;if(e===`127.0.0.1`||e===`[::1]`||e===`::1`||e===`localhost`)return;throw Error(`FivucsasAuth: redirect URI scheme not allowed: http:// is only permitted for RFC 8252 loopback (127.0.0.1, [::1], localhost), got host "${e}"`)}if(!h.test(n))throw Error(`FivucsasAuth: redirect URI scheme is not RFC 3986-compliant: ${n}:`)}}function _(e){if(!e||typeof e!=`string`)throw Error(`FivucsasAuth: id_token is not a string`);let t=e.split(`.`);if(t.length!==3)throw Error(`FivucsasAuth: id_token is not a valid JWT (expected 3 segments)`);try{let e=t[1].replace(/-/g,`+`).replace(/_/g,`/`),n=e.length%4;n&&(e+=`=`.repeat(4-n));let r=atob(e),i=JSON.parse(r);if(!i||typeof i!=`object`)throw Error(`FivucsasAuth: id_token payload is not an object`);return i}catch(e){throw e instanceof Error&&e.message.startsWith(`FivucsasAuth:`)?e:Error(`FivucsasAuth: id_token payload could not be decoded`)}}function v(e,t){if(!t)throw Error(`FivucsasAuth: missing stored nonce — cannot validate id_token (possible session loss or replay)`);let n=_(e).nonce;if(typeof n!=`string`||n!==t)throw Error(`FivucsasAuth: id_token nonce mismatch — possible token replay or CSRF`)}var y=`
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
    min-height: 560px;
    height: auto;
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
`,b=!1;function x(){if(b)return;let e=document.createElement(`style`);e.textContent=y,document.head.appendChild(e),b=!0}var S=class{constructor(e){if(i(this,`config`,void 0),i(this,`iframe`,null),i(this,`overlay`,null),i(this,`messageHandler`,null),i(this,`activeReject`,null),!e.clientId)throw Error(`FivucsasAuth: clientId is required`);this.config={clientId:e.clientId,baseUrl:e.baseUrl??a,apiBaseUrl:e.apiBaseUrl??o,locale:e.locale??`en`,theme:e.theme??{}}}verify(e={}){return this.iframe?Promise.reject(Error(`FivucsasAuth: verification already in progress`)):(x(),new Promise((t,n)=>{this.activeReject=n;let r,i=!1;if(e.container){let t=typeof e.container==`string`?document.querySelector(e.container):e.container;if(!t){this.activeReject=null,n(Error(`FivucsasAuth: container not found: ${e.container}`));return}r=t}else i=!0,this.overlay=this.createOverlay(()=>{e.onCancel?.(),this.cleanup(),n(Error(`FivucsasAuth: verification cancelled by user`))}),document.body.appendChild(this.overlay),r=this.overlay.querySelector(`.fivucsas-overlay-inner`);this.iframe=this.createIframe(r,e),this.setupMessageListener(t,n,e,i)}))}destroy(){this.activeReject&&(this.activeReject(Error(`FivucsasAuth: destroyed`)),this.activeReject=null),this.cleanup()}async loginRedirect(e){if(!e?.redirectUri)throw Error(`FivucsasAuth: loginRedirect requires options.redirectUri`);if(typeof window>`u`||typeof crypto>`u`||!crypto.subtle)throw Error(`FivucsasAuth: loginRedirect requires a browser with Web Crypto`);g(e.redirectUri);let t=e.state??p(32),n=e.nonce??p(32),{verifier:r,challenge:i}=await m();sessionStorage.setItem(c,r),sessionStorage.setItem(l,t),sessionStorage.setItem(u,n),sessionStorage.setItem(d,e.redirectUri);let a=new URL(`${this.apiBase()}/oauth2/authorize`);a.searchParams.set(`client_id`,this.config.clientId),a.searchParams.set(`redirect_uri`,e.redirectUri),a.searchParams.set(`response_type`,`code`),a.searchParams.set(`scope`,e.scope??`openid profile email`),a.searchParams.set(`state`,t),a.searchParams.set(`nonce`,n),a.searchParams.set(`code_challenge`,i),a.searchParams.set(`code_challenge_method`,`S256`),a.searchParams.set(`display`,e.display??`page`),window.location.assign(a.toString())}async handleRedirectCallback(){if(typeof window>`u`)throw Error(`FivucsasAuth: handleRedirectCallback requires a browser`);let e=new URLSearchParams(window.location.search),t=e.get(`error`);if(t){this.clearPkceStorage();let n=e.get(`error_description`);throw Error(`FivucsasAuth [${t}]: ${n??`OAuth error`}`)}let n=e.get(`code`),r=e.get(`state`),i=sessionStorage.getItem(l),a=sessionStorage.getItem(u),o=sessionStorage.getItem(c),s=sessionStorage.getItem(d);if(!n)throw this.clearPkceStorage(),Error(`FivucsasAuth: missing authorization code in callback URL`);if(!i||!r||r!==i)throw this.clearPkceStorage(),Error(`FivucsasAuth: state mismatch — possible CSRF or expired session`);if(!o||!s)throw this.clearPkceStorage(),Error(`FivucsasAuth: missing PKCE verifier or redirect URI — session lost`);try{g(s)}catch(e){throw this.clearPkceStorage(),e}let f=new URLSearchParams;f.set(`grant_type`,`authorization_code`),f.set(`code`,n),f.set(`redirect_uri`,s),f.set(`client_id`,this.config.clientId),f.set(`code_verifier`,o);let p;try{p=await fetch(`${this.apiBase()}/oauth2/token`,{method:`POST`,headers:{"Content-Type":`application/x-www-form-urlencoded`},body:f.toString()})}finally{this.clearPkceStorage()}if(!p.ok){let e=``;try{let t=await p.json();e=t.error_description||t.error||``}catch{}throw Error(`FivucsasAuth: token exchange failed (${p.status})${e?`: `+e:``}`)}let m=await p.json(),h=m.id_token?String(m.id_token):void 0;return h&&v(h,a),{success:!0,sessionId:``,completedMethods:[],accessToken:m.access_token?String(m.access_token):void 0,refreshToken:m.refresh_token?String(m.refresh_token):void 0,idToken:h,tokenType:m.token_type?String(m.token_type):void 0,expiresIn:typeof m.expires_in==`number`?m.expires_in:void 0,timestamp:Date.now()}}apiBase(){return this.config.apiBaseUrl.replace(/\/$/,``)}clearPkceStorage(){try{sessionStorage.removeItem(c),sessionStorage.removeItem(l),sessionStorage.removeItem(u),sessionStorage.removeItem(d)}catch{}}createIframe(e,t){let n=document.createElement(`iframe`);return n.id=s,n.className=`fivucsas-iframe`,n.src=this.buildIframeUrl(t),n.setAttribute(`allow`,`camera; microphone; publickey-credentials-get; publickey-credentials-create`),n.setAttribute(`sandbox`,`allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-modals`),n.setAttribute(`title`,`FIVUCSAS Identity Verification`),e.appendChild(n),n}createOverlay(e){let t=document.createElement(`div`);t.className=`fivucsas-overlay`;let n=document.createElement(`div`);n.className=`fivucsas-overlay-inner`;let r=document.createElement(`button`);r.className=`fivucsas-close-btn`,r.setAttribute(`aria-label`,`Close verification`),r.textContent=`×`,r.addEventListener(`click`,e),n.appendChild(r),t.appendChild(n),t.addEventListener(`click`,n=>{n.target===t&&e()});let i=t=>{t.key===`Escape`&&(document.removeEventListener(`keydown`,i),e())};return document.addEventListener(`keydown`,i),t}buildIframeUrl(e){let t=new URL(this.config.baseUrl);return t.searchParams.set(`client_id`,this.config.clientId),e.flow&&t.searchParams.set(`flow`,e.flow),e.userId&&t.searchParams.set(`user_id`,e.userId),e.sessionId?(t.searchParams.set(`session_id`,e.sessionId),t.searchParams.set(`mode`,`session`)):t.searchParams.set(`mode`,`login`),e.methods?.length&&t.searchParams.set(`methods`,e.methods.join(`,`)),this.config.locale&&t.searchParams.set(`locale`,this.config.locale),this.config.apiBaseUrl&&t.searchParams.set(`api_base_url`,this.config.apiBaseUrl),this.config.theme?.mode&&t.searchParams.set(`theme`,this.config.theme.mode),t.toString()}setupMessageListener(e,t,n,r){this.messageHandler=r=>{let i=new URL(this.config.baseUrl).origin;if(r.origin!==i)return;let a=r.data;if(!a||typeof a!=`object`||typeof a.type!=`string`||!a.type.startsWith(`fivucsas:`))return;let o=a.payload??{};switch(a.type){case`fivucsas:ready`:this.iframe?.contentWindow?.postMessage({type:`fivucsas:config`,payload:{theme:this.config.theme.mode??`light`,locale:this.config.locale,apiBaseUrl:this.config.apiBaseUrl,allowedOrigin:window.location.origin}},i);break;case`fivucsas:step-change`:n.onStepChange?.({method:String(o.methodType??``),progress:Number(o.stepIndex??0)+1,total:Number(o.totalSteps??0)});break;case`fivucsas:complete`:{let t={success:!0,sessionId:String(o.sessionId??``),userId:o.userId?String(o.userId):void 0,email:o.email?String(o.email):void 0,displayName:o.displayName?String(o.displayName):void 0,completedMethods:Array.isArray(o.completedMethods)?o.completedMethods.map(String):[],authCode:o.authCode?String(o.authCode):void 0,accessToken:o.accessToken?String(o.accessToken):void 0,refreshToken:o.refreshToken?String(o.refreshToken):void 0,timestamp:typeof o.timestamp==`number`?o.timestamp:void 0};this.activeReject=null,this.cleanup(),e(t);break}case`fivucsas:error`:{let e={code:String(o.code??`UNKNOWN`),message:String(o.error??`Verification failed`)};n.onError?.(e),this.activeReject=null,this.cleanup(),t(Error(`FivucsasAuth [${e.code}]: ${e.message}`));break}case`fivucsas:cancel`:n.onCancel?.(),this.activeReject=null,this.cleanup(),t(Error(`FivucsasAuth: verification cancelled`));break;case`fivucsas:resize`:this.iframe&&typeof o.height==`number`&&(this.iframe.style.height=`${o.height}px`);break}},window.addEventListener(`message`,this.messageHandler)}cleanup(){this.messageHandler&&(window.removeEventListener(`message`,this.messageHandler),this.messageHandler=null),this.iframe&&(this.iframe.remove(),this.iframe=null),this.overlay&&(this.overlay.remove(),this.overlay=null)}},C=`
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
`,w=class extends HTMLElement{static get observedAttributes(){return[`client-id`,`flow`,`user-id`,`theme`,`locale`,`api-base-url`,`base-url`]}constructor(){super(),i(this,`auth`,null),i(this,`shadow`,void 0),i(this,`verifying`,!1),this.shadow=this.attachShadow({mode:`open`})}connectedCallback(){this.render(),this.hasAttribute(`auto-verify`)&&this.startVerification()}disconnectedCallback(){this.auth?.destroy(),this.auth=null}attributeChangedCallback(){this.auth?.destroy(),this.auth=null}async startVerification(){if(!this.verifying){this.verifying=!0;try{this.auth=new S(this.buildConfig());let e=this.buildOptions(),t=await this.auth.verify(e);return this.dispatchEvent(new CustomEvent(`fivucsas-complete`,{detail:t,bubbles:!0,composed:!0})),t}catch(e){let t=e instanceof Error?e.message:String(e);t.includes(`cancelled`)?this.dispatchEvent(new CustomEvent(`fivucsas-cancel`,{bubbles:!0,composed:!0})):this.dispatchEvent(new CustomEvent(`fivucsas-error`,{detail:{message:t},bubbles:!0,composed:!0}));return}finally{this.verifying=!1}}}render(){let e=document.createElement(`style`);e.textContent=C;let t=document.createElement(`button`);t.className=`fivucsas-trigger-btn`;let n=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);n.setAttribute(`class`,`icon`),n.setAttribute(`viewBox`,`0 0 24 24`),n.setAttribute(`fill`,`currentColor`);let r=document.createElementNS(`http://www.w3.org/2000/svg`,`path`);r.setAttribute(`d`,`M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z`),n.appendChild(r);let i=document.createElement(`span`);for(i.textContent=`Verify with FIVUCSAS`,t.appendChild(n),t.appendChild(i),t.addEventListener(`click`,()=>this.startVerification());this.shadow.firstChild;)this.shadow.removeChild(this.shadow.firstChild);this.shadow.appendChild(e),this.shadow.appendChild(t)}buildConfig(){let e=this.getAttribute(`client-id`)??``;if(!e)throw Error(`<fivucsas-verify>: client-id attribute is required`);let t,n=this.getAttribute(`theme`);if(n)try{t=JSON.parse(n)}catch{}return{clientId:e,baseUrl:this.getAttribute(`base-url`)??void 0,apiBaseUrl:this.getAttribute(`api-base-url`)??void 0,locale:this.getAttribute(`locale`)??void 0,theme:t}}buildOptions(){return{flow:this.getAttribute(`flow`)??void 0,userId:this.getAttribute(`user-id`)??void 0,onStepChange:e=>{this.dispatchEvent(new CustomEvent(`fivucsas-step-change`,{detail:e,bubbles:!0,composed:!0}))},onError:e=>{this.dispatchEvent(new CustomEvent(`fivucsas-error`,{detail:e,bubbles:!0,composed:!0}))},onCancel:()=>{this.dispatchEvent(new CustomEvent(`fivucsas-cancel`,{bubbles:!0,composed:!0}))}}}};customElements.define(`fivucsas-verify`,w),e.FivucsasAuth=S,e.FivucsasVerifyElement=w})(this.FivucsasAuth=this.FivucsasAuth||{}),typeof FivucsasAuth==`object`&&FivucsasAuth.FivucsasAuth){var _FA=FivucsasAuth.FivucsasAuth;Object.assign(_FA,FivucsasAuth),FivucsasAuth=_FA}
//# sourceMappingURL=fivucsas-auth.js.map