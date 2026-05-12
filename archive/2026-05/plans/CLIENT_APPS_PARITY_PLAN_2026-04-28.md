# Client-Apps Parity & APK Release Plan — 2026-04-28

Research-only output from Team D. **Nothing was changed in code.** This
file captures the work for user review before implementation.

## 1. UI Parity Plan (≈5.5h work)

Goal: bring `client-apps` LoginScreen visually + behaviorally close to
`web-app/src/features/auth/components/LoginPage.tsx` and
`web-app/src/verify-app/HostedLoginApp.tsx`.

### Web reference visuals
- Background gradient: `linear-gradient(135deg, #667eea → #764ba2 → #f64f59)`, animated.
- Primary/button gradient: `#6366f1 → #8b5cf6`.
- Input bg: `#f8fafc` light, focus `#fff`. Text `#1a1a2e`. Border `rgba(0,0,0,0.23)`.
- Card: glassmorphism (white 0.95, blur 20px), 24px radius.
- Logo: 80×80 gradient box, white Fingerprint icon, shadow.
- TextField/Button radius: 12px.
- Motion: framer-motion staggered entry, logo 3D rotateY.
- Floating shapes: 5 glassmorphic circles (decorative).

### Client-apps current
- File: `client-apps/shared/src/commonMain/kotlin/com/fivucsas/shared/ui/screen/LoginScreen.kt` (441 lines), Material3.
- Theme: `AppColors.kt` Primary `#FF1976D2`, Secondary `#FF00ACC1`. No gradients.
- No card wrapper, no logo gradient block, no animations on form entry.

### Phase plan
| Phase | Work | Effort |
|---|---|---|
| 1 — Colors & Shapes | Update `AppColors.kt`: Primary `#6366F1`, Secondary `#8B5CF6`, add `WebGradientBg`/`WebPrimaryGradient` Brushes. Add `AppShapes.small = RoundedCornerShape(12.dp)`. Wrap LoginScreen in Card + add gradient logo box. | 2h |
| 2 — Form styling | Custom `OutlinedTextField` defaults: bg `#F8FAFC`, text `#1A1A2E`, 12dp radius. | 1.5h |
| 3 — Animations & polish | `AnimatedVisibility` + slide animations for form fields. White spinner color. Verify dark-mode behavior (recommend light-only for login). | 2h |

### Compose limitations / decisions needed
- **Glassmorphism** — Compose has no native `backdrop-filter: blur()`. Use solid white Card + elevation shadow. Acceptable.
- **Animated gradient** — CSS animation not portable. Use static gradient OR `animateFloat()` + offset (medium complexity). Recommend static for MVP.
- **Floating shapes** — Decorative; expensive on mobile. Defer.
- **Dark mode** — Web has no dark login. Recommend forcing light-only for `LoginScreen` (override LocalThemeMode in screen root).

## 2. APK Release Workflow Plan

### Current state
- `client-apps/.github/workflows/android-build.yml` (142 lines) — builds debug + release APKs but **does not sign the release** and **does not upload to GitHub Releases**. All historical APK uploads (v1.0.0–v5.2.0) were manual.
- `client-apps/androidApp/build.gradle.kts:23-108` — signing config already reads from env vars; no code change needed.
- **No GitHub repo secrets exist** for `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.

### What user must do (one-time)
1. Generate keystore locally:
   ```
   keytool -genkey -v -keystore release.jks -keyalg RSA -keysize 2048 -validity 36500 \
     -alias fivucsas \
     -dname "CN=FIVUCSAS, OU=Engineering, O=Marmara University, C=TR" \
     -storepass "<SECURE>" -keypass "<SECURE>"
   ```
2. Base64-encode: `base64 -i release.jks` (Linux/Mac) or PowerShell `[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.jks"))`.
3. Add 4 GitHub repo secrets at `github.com/Rollingcat-Software/client-apps/settings/secrets/actions`:
   - `ANDROID_KEYSTORE_BASE64` (the base64 string)
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS` (= `fivucsas`)
   - `ANDROID_KEY_PASSWORD`
4. **Never commit `release.jks` to git.** Store securely (e.g., `~/.android/keystore/`).

### Workflow YAML (to be added at `.github/workflows/android-release.yml`)

Triggers on `vX.Y.Z` tag push. Builds signed APK, uploads to GitHub Releases tagged with the same version.

```yaml
name: Android Release APK
on:
  push:
    tags: ['v[0-9]+.[0-9]+.[0-9]+']
  workflow_dispatch:
    inputs:
      tag_name:
        description: 'Release tag (e.g. v5.2.1)'
        required: true
        type: string
concurrency:
  group: android-release-${{ github.ref }}
  cancel-in-progress: false
env:
  JAVA_VERSION: '21'
jobs:
  build_and_release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { java-version: 21, distribution: 'temurin' }
      - uses: android-actions/setup-android@v3
      - uses: gradle/actions/setup-gradle@v4
      - name: Dummy google-services.json
        run: |
          cat > androidApp/google-services.json << 'EOF'
          {"project_info":{"project_id":"fivucsas-ci-dummy"},"client":[{"client_info":{"android_client_info":{"package_name":"com.fivucsas.mobile"}}}],"configuration_version":"1"}
          EOF
      - name: Decode keystore
        env:
          ANDROID_KEYSTORE_BASE64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: |
          [ -z "$ANDROID_KEYSTORE_BASE64" ] && { echo "::error::keystore secret missing"; exit 1; }
          mkdir -p "$RUNNER_TEMP/keystore"
          printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$RUNNER_TEMP/keystore/release.jks"
          echo "ANDROID_KEYSTORE_PATH=$RUNNER_TEMP/keystore/release.jks" >> "$GITHUB_ENV"
      - name: Build signed release APK
        env:
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: ./gradlew :androidApp:assembleRelease --no-daemon
      - name: Wipe keystore
        if: always()
        run: rm -f "$RUNNER_TEMP/keystore/release.jks"
      - id: version
        run: |
          TAG="${{ github.ref_name }}"
          echo "version_name=${TAG#v}" >> "$GITHUB_OUTPUT"
      - uses: softprops/action-gh-release@v1
        env: { GITHUB_TOKEN: '${{ secrets.GITHUB_TOKEN }}' }
        with:
          tag_name: ${{ github.ref_name }}
          files: androidApp/build/outputs/apk/release/*.apk
          body: |
            ## FIVUCSAS Mobile ${{ steps.version.outputs.version_name }}
            Signed release APK. Suitable for direct distribution or Play submission.
            Package: com.fivucsas.mobile
```

## 3. Open decisions (need user)

1. Dark mode for login: light-only or platform-dark? **Recommend: light-only.**
2. Animated gradient background: do or skip for MVP? **Recommend: skip, static gradient.**
3. Floating glassmorphic shapes: implement or defer? **Recommend: defer.**
4. Test the workflow on `v5.2.0-test` first or go straight to `v5.2.1`? **Recommend: test tag first.**
5. Keystore rotation policy: store rotation cadence (e.g., 12 months)? Document it.

## 4. Sequence I recommend the user follow

1. Approve the parity color/typography choices (or push back).
2. Generate the keystore locally; do NOT share it with anyone.
3. Add 4 GitHub secrets.
4. Approve me to commit the `android-release.yml` and apply the parity changes.
5. Push a `v5.2.0-test` tag, watch the workflow, delete the test release after.
6. Push `v5.2.1` for real.
