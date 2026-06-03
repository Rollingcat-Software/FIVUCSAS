# Integrate

The primary integration is **hosted-first redirective OIDC** — you never build login/register
pages. A `FivucsasAuth` SDK wraps the redirect + PKCE + token exchange; an embeddable widget
remains for inline step-up MFA.

## 1. Redirect to the hosted login

```js
import { FivucsasAuth } from '@fivucsas/auth'

const auth = new FivucsasAuth({
  clientId: 'your-client-id',
  redirectUri: 'https://your-app.com/callback',
  authority: 'https://verify.fivucsas.com',
})

// kicks off OAuth2/OIDC with PKCE (code + S256 challenge)
await auth.loginRedirect({ scope: 'openid profile email' })
```

The user authenticates on `verify.fivucsas.com` with your tenant's configured flow (any of
the 10 factors, in your order), then the browser returns to your `redirectUri` with
`?code=…&state=…`.

## 2. Exchange the code for tokens

```js
// on your callback route
const tokens = await auth.handleRedirectCallback()
// tokens.id_token (RS256, verify against JWKS), access_token, refresh_token
```

Validate `id_token` against the published JWKS / discovery document:

```
GET https://api.fivucsas.com/.well-known/openid-configuration   → 200 (public)
GET https://api.fivucsas.com/.well-known/jwks.json
```

## Platform coverage

Web, iOS (`ASWebAuthenticationSession` + AppAuth), Android (Custom Tabs + AppAuth),
Electron/desktop (loopback per RFC 8252), CLI. The redirect-URI allowlist accepts HTTPS,
custom schemes, and `http://127.0.0.1:*`.

## Step-up MFA widget (secondary)

For an already-authenticated session that needs a stronger factor inline, embed the widget
and request a step-up — it returns a signed assertion without a full redirect.

## API references

- [Identity Core API](/identity/) — auth, OAuth2/OIDC, MFA, enrollment, RBAC (OpenAPI 3.1).
- [Biometric Processor API](/biometric/) — face/voice/liveness/NFC (internal microservice).
- [Widget SDK](/sdk/) — the embeddable auth widget.

> The Biometric Processor has **no public route** — tenants never call it directly; the
> Identity API brokers all biometric operations over `X-API-Key`.
