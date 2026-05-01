# FIVUCSAS — Frontend Engineering Review (Senior FE Lens)
**Date:** 2026-04-30 · **Reviewer role:** Senior Frontend Engineer
**Scope:** `web-app/` · `verify-app` (under web-app/src/verify-app) · `landing-website/` · `verify-widget/html/` · `auth-test/` · `practice-and-test/`
**Companion docs:** `PRODUCT_REVIEW_2026-04-30.md` (PO lens), `ENGINEERING_REVIEW_2026-04-30.md` (CE lens). This doc deliberately avoids reproducing those.

---

## 1. Executive Summary

- **web-app** is unusually disciplined for a student/indie codebase: feature folders, InversifyJS DI, lazy route splits, RHF + Zod everywhere, 27 Playwright specs (~366 tests), 58 unit tests, `tsc --strict` actually on. Lint runs at **2 warnings against max 90** (`web-app/package.json:11`).
- **Maturity grades:** web-app **B+**, verify-app **B**, landing-website **C-** (no i18n, dead links), verify-widget/html **D** (static loader), auth-test **D** (raw IIFE), practice-and-test **N/A**.
- **Top 3 craft strengths:** (1) **i18n parity perfect on dashboard** — 1650 keys identical across en.json/tr.json, page-title re-renders on language change, `<html lang>` re-sync (`src/App.tsx:60-76`); (2) **bundle splitting is mature** — `manualChunks` isolates onnx/recharts/mui-icons/mui-core, DrawingUtils lazy-loads only on camera activation (`src/features/biometric-puzzles/puzzles/FacePuzzle.tsx:50-54`); (3) **auth state machines are server-authoritative** — `LoginPage.tsx:333-339` mirrors backend `completedMethods` set with belt-and-braces client filtering.
- **Top 3 craft risks:** (1) **Redux is dead code in the bundle** — `react-redux + redux-persist + @reduxjs/toolkit` shipped to every user, but `src/store/index.ts` is a placeholder reducer with `whitelist: []`. ≈30-50 KB gzipped on critical path. (2) **Route-level CSP intent silently regressed** — `vite.config.ts:14-22` and `public/.htaccess` describe a strict dashboard CSP, but production htaccess serves relaxed CSP **everywhere** because React Router doesn't reload between routes. Comment-vs-reality lie. (3) **Hardcoded English in legally-critical surfaces** — `RegisterPage.tsx:46-58` (Zod schema), `UserFormPage.tsx:243-269` (role/status MenuItems), `EnrollmentsListPage.tsx:170-310`, all of `landing-website/src/App.tsx`, error fallbacks in `useVerification.ts:44-145`.
- **Cross-cutting smell:** 3 generations of architecture coexist — Redux+persist (gen 1, dead), InversifyJS DI + repositories (gen 2, current), one-off `container.get<IHttpClient>()` calls in components (gen 3, escape hatch — `MyProfilePage.tsx:208`, `DashboardPage.tsx:324`).
- **Bottom line:** web-app is genuinely high-end "graduate project" tier and within striking distance of "small-but-credible SaaS frontend". Non-web-app sub-projects drag the average down — `landing-website` is a 659-line single file with no i18n and a dead URL.

---

## 2. Stack & Build Toolchain

### web-app
- **React 18.3.1**, **TypeScript 5.5.3**, **Vite 8.0.3** with **oxc** minifier, `vite-plugin-pwa` 1.2. **MUI 5.16** (v7 is GA — ~2 years behind).
- Heavy ML deps in the same package.json as the admin shell: `@mediapipe/tasks-vision 0.10.18`, `onnxruntime-web 1.18`, `@tensorflow/tfjs-*` 4.22, `@tensorflow-models/blazeface`. Correctly chunked (see §9). `dist/` is 57 MB; 52 MB is `dist/models/` (silero-vad.onnx + yolo-card-nano.onnx).
- Build outputs (verified): `onnx-vendor`: **520 KB**, `mui-core`: 508 KB, `recharts-vendor`: 408 KB, BiometricEngine bundle: 350 KB, vision_bundle: 134 KB. 113 JS files, single 8 KB CSS.
- **Vite config quality** (`vite.config.ts`): explicit `manualChunks`, custom CSP plugin with **per-route frame-ancestors** for `/login`, prod sourcemaps disabled, `external: ['@tensorflow/tfjs-converter']`, `dropConsole: true`.
- **5 distinct vite configs** (main, adapter, elements, sdk, verify). `dist-verify/` for `verify.fivucsas.com` builds from same `src/verify-app/` — sensible code sharing. Elements config builds Web Components.
- **ONNX manifest discipline:** `prebuild` runs `fetch-models` which **SHA256-verifies** downloads. Build is reproducible.

### landing-website
- React 18, Vite 6, Tailwind 3.4 + framer-motion. Single `src/App.tsx` of **659 lines**. No router, no i18n, no tests. Quality significantly behind web-app.

### verify-widget/html, auth-test
- Static loader (no build) and plain JS IIFE app respectively. Legacy/operator surfaces.

**Dev server config** is solid: HMR, custom CSP middleware (`vite.config.ts:31-66`), per-route `frame-ancestors`, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.

---

## 3. Component Architecture

- **Folder convention:** `app/` (providers, theme), `components/` (shared layout, ErrorBoundary, NotificationPanel), `pages/` (32), `features/` (15 domains), `core/` (api/repositories/services/di/errors), `domain/`, `hooks/`, `lib/biometric-engine/`, `verify-app/`, `i18n/`, `store/` (vestigial). Path aliases wired in `tsconfig.json:24-72`.
- **Smart-vs-presentational:** mixed. `LoginPage.tsx` (996 LOC), `RegisterPage.tsx` (892 LOC) bundle inline `FloatingShape` + framer-motion variant configs that recur in `BiometricPuzzlesPage.tsx` and `DashboardPage.tsx`. Extract to a `loginAnimations.ts` module. Both pages are over the LOC threshold where I'd split.
- **Reuse:** `StepLayout.tsx` is a real shared shell for all 10 MFA steps. `StepProgress.tsx` shared dashboard↔verify-app. `formatApiError` (`src/utils/formatApiError.ts`) is the single error-mapping primitive.
- **Design system:** MUI `sx`-prop everywhere, plus `theme.ts` of **671 LOC** (multi-mode) and `app/theme/themes.ts` (222 LOC). No styled-components, no CSS modules. Opus refresh (2026-04-22 per memory) visible in `DashboardLayout.tsx:131-141` (radial-gradient ambient backgrounds, dark/light variants).
- **Context vs store:** Context for auth, permissions, perf, DI. No prop drilling >2 levels. State stays local (RHF for forms, useState for page loading, context for cross-cutting).
- **Anti-pattern: `container.get<IHttpClient>()` directly in components** — `MyProfilePage.tsx:208,237`, `DashboardPage.tsx:324`. Should use `useService` like AuthProvider. Bypasses the React-aware DI chain.

---

## 4. Hooks & State Discipline

Concrete issues with citations:

1. **`src/features/auth/components/EnrollmentPage.tsx:506`** — ESLint react-hooks/exhaustive-deps warning: `useCallback has missing dependencies: 'refetchEnrollments' and 'userId'`. Latent bug: user logs out + in as different user mid-session, the enrollment-creation closure still holds the previous `userId`.

2. **`src/features/auth/hooks/useFaceChallenge.ts:231`** — `console.log('[PassiveLiveness]', …)` in production code. Vite's `dropConsole: true` strips it from prod; dev-noise only.

3. **`src/features/auth/components/LoginPage.tsx:144-145`** — `_selectedMethod` and `_mfaSessionToken` declared with leading underscore (signals "unused") but actively read+written (`LoginPage.tsx:340` reads `_mfaSessionToken`). Misleading. Drop the underscore or refactor into the dispatcher.

4. **`src/hooks/useVerification.ts:44-145`** — every error setter stores a hardcoded English string. Turkish users see English errors. Pass `t` in or return error codes for the consumer to translate.

5. **`src/features/dashboard/components/DashboardPage.tsx:321-340`** — `useEffect` calls `container.get<IHttpClient>(TYPES.HttpClient)` per effect run. Hoist outside or use `useService`.

6. **`src/App.tsx:72-76`** — `i18n.on('languageChanged', …)` cleanup calls `i18n.off('languageChanged')` with no handler reference, removing ALL handlers globally. Use the named-handler form.

7. **`src/components/layout/Sidebar.tsx:111-115`** — `filterSidebarForRole(...).map(...)` runs on every render; stable per `user?.role`. Wrap in `useMemo`. Sidebar is in the hot path.

8. **`src/features/auth/hooks/AuthProvider.tsx:144-152`** — `useMemo` for context value over `state, login, logout, refreshUser`. Every state mutation re-creates context value → all consumers re-render. Fine today; split `AuthStateContext` vs `AuthActionsContext` if high-frequency state is ever added.

9. **`src/hooks/useVerification.ts:36-147`** — 8 separate `useCallback` factories. Over-applied memoization unless every consumer needs reference stability. Audit downstream and trim.

10. **`src/features/auth/components/LoginPage.tsx:155-158`** — `setTimeout(() => setPageReady(true), 300)` for UX-only animation entry. Cleanup is correct; arbitrary 300 ms is just a smell.

**Empty-deps `useEffect` audit:** 156 useEffects across the codebase. Sample (`AuthProvider.tsx:25-56`) guards with `mounted` flag and returns cleanup. **Discipline is mostly good** — the 1 ESLint hit is the only real bug.

---

## 5. Type Safety & Lint Health

- `tsconfig.json:21-25`: `strict: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `noFallthroughCasesInSwitch: true`. **Strictness is on.** Plus `experimentalDecorators` + `emitDecoratorMetadata` for InversifyJS.
- **`any` count: 15 occurrences across `src/**/*.ts*`.** Concentrations:
  - `src/lib/biometric-engine/core/{FaceDetector,CardDetector,VoiceVAD}.ts` — 10 hits, all justified at MediaPipe/ONNX runtime-loaded boundaries.
  - `src/pages/MyProfilePage.tsx:213` and `src/features/dashboard/components/DashboardPage.tsx:329` — `const rawLogs: any[] = response.data.content ?? …`. **The only two `any`s in non-vendor code.** API boundary field normalization. Should be Zod-parsed.
  - `src/components/NotificationPanel.tsx:189` — `t: any` should be `import('i18next').TFunction`. Quick fix.
- `@ts-ignore`: 2 (both `CardDetector.ts:135,199`). `@ts-expect-error`: 6, mostly for the experimental `NDEFReader` API not yet in lib.dom — legitimate.
- **Lint state** (verified `npm run lint` 2026-04-30): `✖ 2 problems (0 errors, 2 warnings)` against `--max-warnings 90`. Exceptional discipline. 88 headroom — tighten the cap to 10.
- **Zod:** every auth form schema uses it (`LoginPage.tsx:49-52`, `RegisterPage.tsx:45-59`, `PasswordStep.tsx:33-36`). API responses NOT Zod-validated — repositories cast and trust the server. Risk: silent contract drift. Add Zod parse at the top 5 repos (auth, users, enrollments, sessions, audit).
- **eslint config:** `@typescript-eslint 7.13`, `react-hooks 4.6`, `react-refresh 0.4`, `--report-unused-disable-directives`. **Missing:** `eslint-plugin-jsx-a11y`, `eslint-plugin-import`.

---

## 6. i18n Implementation Quality

- **Coverage parity (verified):** `en.json` and `tr.json` both have **exactly 1650 keys, no diff in either direction.** Computed by recursive flatten + set-diff. This is rare — many production apps have 5–15% drift here.
- **i18n setup** (`src/i18n/index.ts`): standard i18next with browser-language-detector, `localStorage` cache key `fivucsas_language`, fallback `'en'`, supportedLngs `['en', 'tr']`, `escapeValue: false` (correct for React).
- **Page-title localization** (`src/App.tsx:56-79`): `PAGE_TITLE_KEYS` map drives `document.title` re-render on `i18n.language` change. `<html lang>` is also re-synced. **Better than 90% of SPAs do this.**
- **Hardcoded English in JSX** — concrete leaks (audit, not exhaustive):
  - `src/pages/UserFormPage.tsx:233,242-245,258,266-269,302` — `label="Role"`, `<MenuItem>User</MenuItem>`, `Tenant Admin`, `Admin`, `Super Admin`, `Status`, `Pending Enrollment`, `Active`, `Suspended`, `Locked`, `<InputLabel>Assigned Roles</InputLabel>`. **Critical: this is the user creation form admins will use.**
  - `src/pages/EnrollmentsListPage.tsx:170,175,194,195,310` — `All Statuses`, `Not Enrolled`, table headers `Quality Score`, `Liveness Score`, dialog title `Delete Enrollment`.
  - `src/pages/DevicesPage.tsx:134` — table header `Last Used`.
  - `src/features/authFlows/components/AuthFlowBuilder.tsx:254` — `Operation Type`.
  - `src/features/auth/components/RegisterPage.tsx:46-58` — Zod error messages: `'First name is required'`, `'Email is required'`, `'Password must contain uppercase letter'`. All shown to the user as form errors.
  - `src/features/auth/components/RegisterPage.tsx:65-69` — `passwordRequirements[].label`: `'8+ characters'`, `'Uppercase letter'`, etc., rendered into the password-strength UI.
  - `src/features/auth/components/RegisterPage.tsx:73-76` — strength labels `'Weak'`, `'Medium'`, `'Strong'`.
  - `src/features/auth/components/LoginPage.tsx:50-51` — Zod: `'Email is required'`, `'Invalid email address'`, `'Password is required'`. (PasswordStep's Zod schema, line 33-36, gets this right.)
  - `src/hooks/useVerification.ts:44,59,77,93,113,127,143` — error state strings. (See §4.)
- **Date/number/currency localization:** mixed.
  - `MyProfilePage.tsx:139-156` — has `dateFnsLocale(lang)` helper, calls `format(…, { locale })`. **Correct.**
  - `TenantsListPage.tsx:197`, `RolesListPage.tsx:179`, `UserDetailsPage.tsx:219,228,237`, `AuditLogsPage.tsx:249`, `UsersListPage.tsx:240`, `EnrollmentsListPage.tsx:263,267` — `format(new Date(…), 'MMM dd, yyyy')` **without `locale`**. Turkish users see `Apr 30, 2026` instead of `30 Nis 2026`. This is the same bug class memory says was fixed for MyProfilePage on 2026-04-30 but the fix was not propagated to the other 9 sites.
  - No `Intl.NumberFormat` usage anywhere I can see. Numbers like quality scores, login counts, enrollment counts render via `.toString()` / template literals — fine for integers but won't scale to currency or percentages with thousands separators.
- **Turkish-specific gotchas:** `i18n.language` is used directly in `App.tsx:73` to set `document.documentElement.lang` — correct. No `.toLowerCase()` / `.toUpperCase()` calls on user-supplied strings that I could find (the dotted-I problem only bites when you uppercase user-input strings without `tr-TR` locale). Locale-aware string sort: not used; lists are sorted server-side.
- **RTL readiness:** none expected, none present. MUI v5 supports it but no `dir="rtl"` paths exist. Confirmed not a regression.

**Verdict:** the i18n **infrastructure is excellent**, the **discipline is uneven**. Memory rule "NEVER hardcode English in UI" is honored on the auth/profile/dashboard surfaces and broken on the admin CRUD surfaces (UserForm, EnrollmentsList, DevicesPage). RegisterPage's Zod schema is the worst offender — it's the second-most-trafficked public page.

---

## 7. Forms, Validation & Error UX

- **Stack:** RHF 7.52 + `@hookform/resolvers` + Zod 3.23 + `Controller` for MUI. Modern best-practice combo across every meaningful form.
- **Disable-on-submit:** consistent — `LoginPage.tsx:140`, RegisterPage similar, PasswordStep `disabled={loading}` (`PasswordStep.tsx:65`).
- **Server-error mapping:** `formatApiError(err, t)` is the single point of translation. Used 30+ times. 401→`auth.invalidCredentials`. 429 intercepted in `AxiosClient.ts:200-208` and rewritten to `mfa.errors.rateLimited` with `retryAfterSeconds`. **Right pattern.**
- **Error-message a11y:** `Alert role="alert"` in 5 places (`LoginPage.tsx:567,891,938`, `StepLayout.tsx:147`, `GestureLivenessStep.tsx:328`). Field errors use MUI `helperText` + `aria-describedby` (`UserFormPage.tsx:239-240`). Correct ARIA. **Missing:** `aria-live="polite"` on the global `notistack` snackbar — SR users can miss success/info.
- **Retry semantics:** Token refresh deduplicated via shared `refreshPromise` (`AxiosClient.ts:220-256`). Concurrent 401s refresh once. Excellent.
- **Forgot/reset-password:** `LoginPage.tsx:176-220` uses raw `fetch` instead of the DI'd HttpClient — bypasses interceptors, so a 429 surfaces as raw `'Failed to send reset'` rather than the i18n'd retry-after message.
- **MFA dispatcher:** delegates to 10 step components, server-driven state (`completedMethods`, `availableMethods`) flows down, with client re-derivation against stale renders (`LoginPage.tsx:333-339`). Professional state-machine thinking.

---

## 8. Routing, Auth Guards & Tenant Scoping

- **Routes:** `App.tsx` defines ~35 routes via `react-router-dom@6.26`, all lazy-loaded (`React.lazy`) except inline `Navigate` redirects.
- **Guard layers:** three. `ProtectedRoute` (`App.tsx:143-166`) wraps `DashboardLayout`, checks `isAuthenticated`, redirects to `/login`. `RoleRoute` (`App.tsx:184-198`) checks role membership, redirects to `/` (correct — user IS authenticated, just not authorized). `AdminRoute` (`App.tsx:205-207`) is the back-compat alias.
- **Tiers:** public (login/register/forgot/reset/terms/privacy/widget-demo/developer-portal/face-demo); authenticated-any-role (`/`, enrollment, biometric-tools, biometric-puzzles, auth-methods-testing, my-profile, settings); admin (users/auth-flows/devices/auth-sessions/enrollments/verification-*/guests); platform-owner (tenants/roles/audit-logs/analytics).
- **Tenant scoping:** server-side. Client guard only checks role, not tenant. Correct — never trust the client to scope tenants.
- **401/403 handling:**
  - 401 → `AxiosClient.ts:211-258` attempts a single deduped refresh; on failure clears tokens and rejects. The page that owned the request shows its own error UI. The user is not *automatically* redirected to `/login`; the next protected route navigation will kick in `ProtectedRoute`. **This is a tiny UX gap** — a 401 on a non-page request (e.g. background polling) leaves the user staring at stale data.
  - 403 → logged but no special UX. Consumer pages typically hide elements via role checks (Sidebar). `DashboardPage.tsx:333` deliberately swallows 403 from `/my/activity` for non-admins. This is good defensive UX.
- **Token refresh UX:** **invisible** when working, which is correct. Proactive refresh (`AxiosClient.ts:139-150`) checks `tokenService.shouldRefresh(accessToken)` *before* sending. Reactive refresh on 401. Both deduplicated. Modern.
- **Deep-linking with auth:** `ProtectedRoute` redirects to `/login` with `replace`, but **does NOT preserve the intended URL**. After login the user lands on `/`, not the deep link they tried. Compare to Auth0/Stripe: those preserve `returnTo`. Easy fix: `<Navigate to="/login" state={{ from: location }} replace />`, then read in LoginPage.
- **Cross-tab session sync:** none. Two tabs of the dashboard with one tab's user logging out: the other tab keeps stale state until next route navigation. `BroadcastChannel` or a `storage` event listener would close this. Risk for now is low because tokens expire on backend.
- **Stale doc lie / inconsistency:** `AxiosClient.ts:18-37` doc comment claims `httpOnly cookies` for auth, but the implementation reads/writes Bearer tokens via `tokenService.getAccessToken()` (sessionStorage per `SecureStorageService.ts:32`). Tokens **are** in JS-readable storage. The comment is aspirational/stale. Update or migrate.

---

## 9. Performance

- **Bundle splitting** (`vite.config.ts:175-225`): `react-vendor`, `mui-icons/core/data`, `redux-vendor`, `recharts-vendor`, `onnx-vendor`. Route-level `React.lazy()` for every page.
- **Verified sizes** (uncompressed): `onnx-vendor` 520 KB (only on `/verify`/`/enroll`/`/biometric-*`), `mui-core` 508 KB (eager), `recharts-vendor` 408 KB (only Analytics), BiometricEngine 350 KB, `vision_bundle` 134 KB.
- **Heavy deps audit:**
  - Redux trio (`@reduxjs/toolkit`, `react-redux`, `redux-persist`) loaded by `main.tsx:5-8`. The `store` is a placeholder (`store/index.ts:31-39`). **Dead code shipped — 30-50 KB gzipped savings.**
  - `class-transformer/validator + reflect-metadata` used by repositories. Reasonable.
  - `lottie-react` in deps; no usage found — likely dead. Verify and prune.
- **Image/asset:** PWA icons registered, no WebP/AVIF, gradients via CSS. `dist/models/` 52 MB ONNX is off the critical path and SHA256-verified.
- **List virtualization:** **none** (no `react-window`/`virtuoso`). Server-side pagination compensates at current scale; will bite on big audit-log filters.
- **Enrollment waterfall:** lazy chunk (49 KB) → on camera: `vision_bundle` (134 KB) + `onnx-vendor` (520 KB) + ONNX model files. **Improvement:** `<link rel="modulepreload">` for `vision_bundle`/`onnx-vendor` on `/enrollment` mount before click — saves 200-500 ms perceived latency.
- **`React.memo`:** 2 places (`DashboardPage.tsx:96,225`). Sensible scope.

---

## 10. Accessibility (a11y)

- **Skip-to-content link** in `DashboardLayout.tsx:144-164` — visually hidden until focused, jumps to `#main-content` (which has `tabIndex={-1}` to receive focus). **Best-practice; better than 95% of SPAs.**
- **`<main>` landmark:** `DashboardLayout.tsx:182` correctly uses `component="main" id="main-content"`. Single landmark per page.
- **Breadcrumbs** (`DashboardLayout.tsx:57-117`): `<Breadcrumbs aria-label="breadcrumb">` with proper anchor + currentpage typography. UUID segments are filtered out (`/^[0-9a-f-]{36}$/i.test(segment)`).
- **Form fields** use MUI's `helperText` + `aria-describedby` linkage. Sample: `UserFormPage.tsx:239-240`. Focus states are MUI defaults (acceptable contrast in light mode, may need verification in dark).
- **`role="alert"`** on error alerts — 5 places (see §7).

**Concrete a11y bugs:**

1. **`web-app/src/components/layout/DashboardLayout.tsx:131-141`** — primary background uses `radial-gradient` with low-opacity overlays. On dark mode (`#0f1220` base) the WCAG contrast between body text (`text.secondary`) and background should be verified — gradient mid-points may dip below 4.5:1.
2. **`web-app/src/features/auth/components/LoginPage.tsx:96-127`** — `FloatingShape` decorative elements use `position: absolute` without `aria-hidden="true"`. Screen readers may attempt to announce them.
3. **`web-app/src/components/NotificationPanel.tsx:393,404`** — `role="status"` is used. Good. But `notistack` snackbars (`enqueueSnackbar(...)`) elsewhere use the library's default `<div>` rendering, which doesn't always inject `role="alert"` for severity=error or `aria-live` for severity=info. A wrapper that sets `aria-live="polite"`/`assertive` per severity is missing.
4. **`web-app/src/features/auth/components/LoginPage.tsx:567`** — error `Alert` has `role="alert"` but its parent `Dialog` doesn't have `aria-modal="true"` set explicitly (MUI Dialog adds this internally via `role="dialog"` + focus trap, but verify with a screen reader that focus *returns* to the trigger button on close).
5. **`web-app/src/features/biometric-puzzles/puzzles/FacePuzzle.tsx:69-94`** — camera-driven puzzles have no live-region announcement of progress. A blind user can't use these (which is expected — they're biometric face puzzles), but the page should at minimum surface a textual fallback like "this challenge requires a visible camera" in an `aria-live` region. Currently silent.
6. **`web-app/src/pages/DevicesPage.tsx:134`** + **`EnrollmentsListPage.tsx:194-195`** — table headers are hardcoded English `<TableCell>Last Used</TableCell>` etc. Screen reader users on Turkish locale hear English column names mid-Turkish-page. (Also a bug under §6.)
7. **Modal focus return:** `ChangePasswordDialog.tsx:141` is opened via a button. Verify focus returns to the trigger button on close — MUI does this by default if you keep the disable-restore-focus prop OFF (default). Don't explicitly set `disableRestoreFocus` anywhere.
8. **Skip-to-content for `verify-app/HostedLoginApp.tsx`** — none. The hosted login surface (`verify.fivucsas.com/login`) doesn't have the same skip link as the dashboard. Lower priority but legally relevant for a public-facing auth page.

**Verdict:** the dashboard a11y is **above industry average for student/indie projects** but below "designed for AT users". WCAG AA is plausible with modest fixes; AAA would need real audit work.

---

## 11. Testing

- **Unit/component tests (Vitest + RTL):**
  - `find src -name "*.test.ts*"` → **58 files**.
  - Configured at `vite.config.ts:test:` block: jsdom env, `setupFiles: './src/test/setup.ts'`, excludes `e2e/`.
  - Run on CI per `package.json` `npm test` (Vitest 4.1.4).
  - Coverage of repositories (`core/repositories/__tests__/`), hooks (`hooks/__tests__/`), auth flows (`features/auth/components/__tests__/`), permission guards. Not exhaustive — no tests on `MyProfilePage`, `EnrollmentsListPage`, etc. — but a foundation.
- **E2E tests (Playwright):**
  - 27 spec files in `e2e/`, ~366 `test()` declarations counted via grep.
  - Auth setup pattern: `auth.setup.ts` runs once, persists `e2e/.auth/session.json`, then both `login-tests` (no pre-auth) and `authenticated` projects run.
  - Targets `https://app.fivucsas.com` by default (`playwright.config.ts:14`), overridable via `E2E_BASE_URL`.
  - Coverage spans: login, login-extended, forgot/reset password, dashboard, navigation, users-crud, users-full, tenants-crud, roles-crud, devices-sessions, enrollments, enrollment, audit-logs, analytics, settings, multi-step-auth, auth-flow-builder, verification-dashboard, verification-flows, verification-session, face-search, voice-search, card-detection, nfc-enrollment, user-enrollment, visual-audit. **This is broader than most B2B SaaS shops achieve.**
  - `fullyParallel: false`, `workers: 1` — sequential. Slow but deterministic, defensible for a single-tenant test DB.
- **Visual regression:** `visual-audit.spec.ts` exists. I didn't read its assertions; per file name it likely uses Playwright screenshot diffs. Adequate but not best-in-class (no Percy/Chromatic).
- **CI gating:** the audit predecessors (`AUDIT_2026-04-28_*.md`) and memory note that Playwright runs in GitHub Actions and is required green for merges. Consistent with the lint cap.
- **Test gaps:**
  - Zero contract/Pact tests against the Spring Boot API.
  - No test for the proactive token refresh dedup primitive (`AxiosClient.refreshTokenProactively`) — high-value to test because it's a concurrency-correctness primitive.
  - No accessibility tests (axe-core hooks) — see §10.
  - No bundle-size assertion in CI (size-limit / bundlesize). Regressions to mui-core or onnx-vendor would slip through.

**Verdict:** **B+ on test coverage breadth**, A- on E2E discipline. Unit tests are present but sparse on page components.

---

## 12. Top 10 Frontend Recommendations (Ranked)

| # | Recommendation | Why | Effort | Expected Impact |
|---|---|---|---|---|
| 1 | **Strip Redux entirely.** Remove `@reduxjs/toolkit`, `react-redux`, `redux-persist` from `package.json`; delete `src/store/`; remove `Provider`/`PersistGate` from `main.tsx`; rewrite the two e2e fixture imports. | Dead code shipped to every user. Comments in `store/index.ts` already describe it as transitional/vestigial. | S (1-2h) | Bundle: -30 to -50 KB gzipped on critical path. Code clarity: removes a "third generation" architecture pattern that confuses new contributors. |
| 2 | **Translate the admin CRUD MenuItems / table headers / Zod messages.** Audit list in §6: UserFormPage roles+statuses, EnrollmentsListPage filters+headers+dialog, DevicesPage table header, RegisterPage Zod schema, useVerification error strings. | Memory rule says "NEVER hardcode English in UI." Currently a Turkish admin sees mixed-language UI on the most-used flows (user creation, enrollment list). | M (3-5h) | Eliminates an entire class of i18n drift. Closes the gap between excellent infra and uneven discipline. |
| 3 | **Fix `format()` calls missing `locale`.** 9 sites listed in §6. Pull the `dateFnsLocale(lang)` helper from `MyProfilePage.tsx:139` into a `src/utils/dateLocale.ts` module and apply everywhere `format(...)` appears. | Same fix-class as #2 but for dates. Currently inconsistent: one page is right, nine are wrong. | S (1-2h) | Consistent date display in Turkish. Easy win. |
| 4 | **Preserve `returnTo` on `/login` redirect.** `ProtectedRoute` should pass `state={{ from: location }}` and `LoginPage` should consume it after successful auth (and after MFA completion). | Current behavior loses the user's intent on every session expiry. Compare to Auth0/Stripe/Okta — they all preserve. | S (2-3h) | Direct UX win for any user with a deep-linked bookmark. |
| 5 | **Add a Zod parse layer at the top 5 repositories' boundaries.** Author one `parseOrThrow<T>(schema, raw)` helper and apply to `AuthRepository.login`, `UserRepository.list`, `EnrollmentRepository.list`, `AuditLogRepository.list`, `AuthSessionRepository.list`. | Right now contracts depend on TypeScript casts — server adds a field, removes a field, changes a type, and the failure surfaces as an opaque runtime error. The two `any` casts in `MyProfilePage.tsx:213` / `DashboardPage.tsx:329` are the smoking gun. | M (4-6h) | Dramatically improves contract safety; turns "TypeError: cannot read 'createdAt'" into a logged Zod issue with the bad field name. |
| 6 | **Tighten ESLint cap from 90 to 10**, and add `eslint-plugin-jsx-a11y` + `eslint-plugin-import`. | `npm run lint` produces 2 warnings against a 90-cap. The cap is meaningless — drop it to enforce the discipline that already exists. jsx-a11y catches most of §10 issues automatically. | S (1h config, M to fix any new findings) | Locks in current quality. Catches a11y regressions in PR review. |
| 7 | **Reconcile `AxiosClient` doc comments with reality**, or migrate to httpOnly cookies. Current state: comments claim httpOnly cookies, code uses sessionStorage Bearer tokens. | Misleading docs are a security smell. If httpOnly is the goal, sequence with backend `Set-Cookie` work and remove `tokenService.getAccessToken()` from frontend. If Bearer-in-sessionStorage is the chosen path, update the comments and document the XSS risk acceptance. | S (rewrite docs) or L (full migration, multi-week) | If the migration happens: closes a real XSS-token-theft vector. If just docs: removes a confusing claim that fails any security review. |
| 8 | **Lazy-load `framer-motion`** for the auth pages, OR remove the floating-shape decoration. `LoginPage.tsx`, `RegisterPage.tsx`, and `BiometricPuzzlesPage.tsx` all import the full framer runtime eagerly for visual flourishes. | Framer is ~30 KB gzipped. Critical-path-eligible to defer. The animations are decorative, not functional. | M (2-4h to refactor with `lazy()` boundary) | -20 to -30 KB on the login critical path; unblocks the Lighthouse score. |
| 9 | **Restore route-level CSP intent.** Either (a) actually enforce `script-src 'self'` on dashboard via different deployments, or (b) delete the misleading comments in `vite.config.ts:14-22` and `public/.htaccess:33-46` so they stop describing a tightening that doesn't exist. | The current state is "lying via comments" — strict CSP is documented but the relaxed CSP is what's served. Hides a real degradation behind comforting words. | M to enforce, S to document | Either tightens prod (real security gain) or stops claiming a security property that doesn't hold. Both paths are improvements. |
| 10 | **i18n-ize `landing-website`** OR explicitly accept it as English-only. Currently `landing-website/src/App.tsx` is 659 lines of hardcoded English with stale links to `ica-fivucsas.rollingcatsoftware.com`. Either add i18next/react-i18next + tr.json, or document the choice in landing-website README. Also fix the dead URL. | A Turkish marketing-site visitor lands on hardcoded English — bad first impression for a Turkish-academic-affiliated product. The dead URL is independent of i18n and is a definite bug. | M (4-6h for i18n) or S (1h for URL fix + doc) | Brand consistency. Closes the largest discipline gap across the FE portfolio. |

---

### Closing notes

The web-app is the strongest non-backend artifact in this org. Infrastructure choices (DI, Zod, RHF, lazy routing, i18n parity, dedup'd token refresh, oxc-Vite, Playwright auth setup, SHA256-verified models) are uniformly modern. The cracks are **discipline-not-infrastructure**: i18n leaks in admin CRUD, date-without-locale in 9 sites, three layered architectures coexisting, one stale CSP claim, one stale auth-storage doc, two `any` casts at the API boundary, and a dead Redux runtime. Items 1, 2, 3, 4, 5, 10 above (≈15-25h focused work) lift this from B+ to A-.
