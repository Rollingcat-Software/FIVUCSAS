# FIVUCSAS Mobile App - Comprehensive Redesign

> **Scope note (2026-04-26):** iOS and macOS are permanently out of scope. The product owner has no Apple hardware for development/testing. Android APK + Windows + Linux desktop cover the demonstration target. The iOS-side material below (architectural diagrams referencing `iosMain`/`iosApp`, the `IosTokenStorage` Keychain example, etc.) is preserved for KMP architectural reference only — those modules are not engineered against. Forward-looking iOS work has been removed.

## Executive Summary

This document provides a complete redesign specification for the FIVUCSAS mobile application ecosystem, based on extensive research of industry best practices from banking apps, government ID systems (e-Devlet), and leading identity verification platforms (Onfido, Jumio, Veriff).

**Key Decisions:**
- **App Strategy**: Two separate apps (End-User App + Admin App) for better UX and security
- **Authentication**: Offline-capable with biometric login + PIN fallback
- **Backend-Ready**: Works in demo mode until backend is ready
- **Professional KYC Flow**: Industry-standard identity verification UX

---

## 1. App Strategy Decision

### Recommendation: Two Separate Apps

Based on research from [Commencis](https://www.commencis.com/thoughts/are-super-apps-taking-over-the-world-super-apps-vs-multi-apps/) and industry patterns:

| Approach | Pros | Cons |
|----------|------|------|
| **Single Super App** | One download, unified experience | Complex, security concerns, large size |
| **Two Focused Apps** | Better security, simpler UX, smaller size | Two downloads required |

**Decision: Two Apps**

```
┌─────────────────────────────────────────────────────────────────────┐
│                      FIVUCSAS APP ECOSYSTEM                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────────────────┐    ┌─────────────────────────┐       │
│   │     FIVUCSAS ID         │    │    FIVUCSAS Admin       │       │
│   │    (End-User App)       │    │   (Management App)      │       │
│   │                         │    │                         │       │
│   │  • Identity Enrollment  │    │  • User Management      │       │
│   │  • Face Verification    │    │  • Analytics Dashboard  │       │
│   │  • NFC Document Read    │    │  • Security Monitoring  │       │
│   │  • Profile Management   │    │  • Tenant Settings      │       │
│   │  • Verification History │    │  • Audit Logs           │       │
│   │                         │    │                         │       │
│   │  Target: All Users      │    │  Target: Admins Only    │       │
│   │  Size: ~30MB            │    │  Size: ~20MB            │       │
│   └─────────────────────────┘    └─────────────────────────┘       │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────┐       │
│   │              FIVUCSAS Kiosk (Desktop/Tablet)            │       │
│   │                                                         │       │
│   │  • Standalone enrollment/verification terminal          │       │
│   │  • Full-screen kiosk mode                               │       │
│   │  • Shared code with mobile apps (KMP)                   │       │
│   └─────────────────────────────────────────────────────────┘       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. User Personas & Roles

### App 1: FIVUCSAS ID (End-User App)

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **New User** | First-time user enrolling | Simple onboarding, clear instructions |
| **Returning User** | Verified user checking status | Quick access, verification history |
| **Verifying User** | User at checkpoint/kiosk | Fast verification, clear result |
| **NFC User** | User with TC Kimlik/Passport | Document scanning, data extraction |

### App 2: FIVUCSAS Admin (Management App)

| Persona | Description | Key Needs |
|---------|-------------|-----------|
| **Tenant Admin** | Organization administrator | User CRUD, analytics, settings |
| **Security Officer** | Security monitoring role | Audit logs, alerts, incident response |
| **Super Admin** | Platform administrator | Multi-tenant management, system config |

---

## 3. Authentication Flow Design

### 3.1 First-Time Setup (Onboarding)

Based on [banking app best practices](https://www.nextauth.com/mobile-authentication-fintech-7-best-practices/):

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FIRST-TIME USER ONBOARDING                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: Welcome                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │                    [FIVUCSAS Logo]                          │    │
│  │                                                             │    │
│  │              Güvenli Kimlik Doğrulama                       │    │
│  │              Secure Identity Verification                   │    │
│  │                                                             │    │
│  │     "Yüz tanıma ve biyometrik teknoloji ile               │    │
│  │      kimliğinizi güvenle doğrulayın"                       │    │
│  │                                                             │    │
│  │              [ Başla / Get Started ]                        │    │
│  │                                                             │    │
│  │         ○ ○ ○ ○  (4 steps indicator)                       │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 2: Login or Register                                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  📧 E-posta / Email                                 │   │    │
│  │   │  ________________________________________________   │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  🔒 Şifre / Password                                │   │    │
│  │   │  ________________________________________________ 👁   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │              [ Giriş Yap / Login ]                          │    │
│  │                                                             │    │
│  │         ─────────── veya / or ───────────                  │    │
│  │                                                             │    │
│  │              [ Kayıt Ol / Register ]                        │    │
│  │                                                             │    │
│  │              Şifremi Unuttum / Forgot Password              │    │
│  │                                                             │    │
│  │  ┌─────────────────────────────────────────────────────┐   │    │
│  │  │  🔘 Demo Modu / Demo Mode (Backend olmadan)         │   │    │
│  │  └─────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 3: Setup Biometric Login                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │                    [Fingerprint Icon]                       │    │
│  │                                                             │    │
│  │            Biyometrik Giriş Ayarla                         │    │
│  │            Setup Biometric Login                            │    │
│  │                                                             │    │
│  │     "Parmak izi veya yüz tanıma ile hızlı giriş"          │    │
│  │                                                             │    │
│  │              [ Biyometrik Etkinleştir ]                     │    │
│  │              [ Enable Biometric ]                           │    │
│  │                                                             │    │
│  │              Şimdilik Atla / Skip for Now                   │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 4: Setup PIN (Fallback)                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │              PIN Kodu Oluştur                               │    │
│  │              Create PIN Code                                │    │
│  │                                                             │    │
│  │     "Biyometrik çalışmadığında kullanılacak"              │    │
│  │                                                             │    │
│  │              ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐          │    │
│  │              │ ● │ │ ● │ │ ● │ │ ● │ │ ○ │ │ ○ │          │    │
│  │              └───┘ └───┘ └───┘ └───┘ └───┘ └───┘          │    │
│  │                                                             │    │
│  │              ┌───┐ ┌───┐ ┌───┐                              │    │
│  │              │ 1 │ │ 2 │ │ 3 │                              │    │
│  │              ├───┤ ├───┤ ├───┤                              │    │
│  │              │ 4 │ │ 5 │ │ 6 │                              │    │
│  │              ├───┤ ├───┤ ├───┤                              │    │
│  │              │ 7 │ │ 8 │ │ 9 │                              │    │
│  │              ├───┤ ├───┤ ├───┤                              │    │
│  │              │ ⌫ │ │ 0 │ │ ✓ │                              │    │
│  │              └───┘ └───┘ └───┘                              │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.2 Returning User Login

Based on [Binariks banking security research](https://binariks.com/blog/biometric-security-onilne-banking/):

```
┌─────────────────────────────────────────────────────────────────────┐
│                      RETURNING USER LOGIN                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Primary: Biometric (Face ID / Touch ID / Fingerprint)             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │                    [Face ID Animation]                      │   │
│   │                                                             │   │
│   │                  Yüzünüzü Tarayın                           │   │
│   │                  Scan Your Face                             │   │
│   │                                                             │   │
│   │              Hoş geldiniz, Ahmet                            │   │
│   │                                                             │   │
│   │          [ PIN ile Giriş / Use PIN Instead ]                │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Fallback: PIN Code (after biometric fails 3x)                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │              PIN Kodunuzu Girin                             │   │
│   │              Enter Your PIN                                 │   │
│   │                                                             │   │
│   │              ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐          │   │
│   │              │ ● │ │ ● │ │ ○ │ │ ○ │ │ ○ │ │ ○ │          │   │
│   │              └───┘ └───┘ └───┘ └───┘ └───┘ └───┘          │   │
│   │                                                             │   │
│   │              (Numpad)                                       │   │
│   │                                                             │   │
│   │          Şifremi Unuttum / Forgot Password                  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Security: Password Required After                                  │
│   • 7 days of no password entry                                     │
│   • App reinstall                                                    │
│   • Device change                                                    │
│   • 5 failed biometric + PIN attempts                               │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 3.3 Demo Mode (Backend Not Ready)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DEMO MODE FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   When Demo Mode is Enabled:                                         │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │  ┌─────────────────────────────────────────────────────┐   │   │
│   │  │  ⚠️  DEMO MODU / DEMO MODE                          │   │   │
│   │  │  Veriler yerel olarak saklanır                      │   │   │
│   │  │  Data is stored locally                             │   │   │
│   │  └─────────────────────────────────────────────────────┘   │   │
│   │                                                             │   │
│   │  • All features work with mock data                        │   │
│   │  • Face enrollment stores locally                          │   │
│   │  • Verification uses local face matching                   │   │
│   │  • No network required                                     │   │
│   │  • Data persists on device                                 │   │
│   │                                                             │   │
│   │  Demo Accounts:                                            │   │
│   │  • admin@demo.local / Demo123!                             │   │
│   │  • user@demo.local / Demo123!                              │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Switching to Live Mode:                                            │
│   Settings > Backend Connection > Enter Server URL > Connect        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. App 1: FIVUCSAS ID - Complete Screen Specification

### 4.1 Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FIVUCSAS ID - NAVIGATION                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Bottom Navigation Bar:                                             │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │   🏠          📝          📄          👤                    │   │
│   │   Ana Sayfa   Kayıt      Belgeler    Profil                │   │
│   │   Home        Enroll     Documents   Profile               │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Screen Hierarchy:                                                  │
│                                                                      │
│   🏠 Home                                                            │
│   ├── Quick Verify (Button)                                         │
│   ├── Recent Activity (List)                                        │
│   └── Status Card (Enrollment Status)                               │
│                                                                      │
│   📝 Enroll                                                          │
│   ├── Start Enrollment                                              │
│   │   ├── Personal Info Form                                        │
│   │   ├── Document Scan (NFC)                                       │
│   │   ├── Face Capture                                              │
│   │   ├── Liveness Check (Biometric Puzzle)                         │
│   │   └── Confirmation                                              │
│   └── Re-Enroll (if already enrolled)                               │
│                                                                      │
│   📄 Documents                                                       │
│   ├── Scan Document (NFC Reader)                                    │
│   │   ├── Auto Detect Mode                                          │
│   │   └── Manual Select Mode                                        │
│   │       ├── TC Kimlik                                             │
│   │       ├── Pasaport                                              │
│   │       ├── Ehliyet                                               │
│   │       └── Other Cards                                           │
│   └── Scanned Documents (History)                                   │
│                                                                      │
│   👤 Profile                                                         │
│   ├── Personal Information                                          │
│   ├── Security Settings                                             │
│   │   ├── Change PIN                                                │
│   │   ├── Biometric Settings                                        │
│   │   └── Active Sessions                                           │
│   ├── Verification History                                          │
│   ├── App Settings                                                  │
│   │   ├── Language                                                  │
│   │   ├── Theme                                                     │
│   │   └── Notifications                                             │
│   ├── Backend Connection                                            │
│   └── Logout                                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Home Screen

```
┌─────────────────────────────────────────────────────────────────────┐
│  ≡  FIVUCSAS ID                              🔔  ⚙️                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Merhaba, Ahmet 👋                                                 │
│   Hello, Ahmet                                                       │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  ╔═══════════════════════════════════════════════════════╗  │   │
│   │  ║                                                       ║  │   │
│   │  ║              ✓ KAYITLI / ENROLLED                     ║  │   │
│   │  ║                                                       ║  │   │
│   │  ║   Kimlik doğrulama için hazırsınız                   ║  │   │
│   │  ║   Ready for identity verification                     ║  │   │
│   │  ║                                                       ║  │   │
│   │  ║   Son Doğrulama: 2 saat önce ✓                       ║  │   │
│   │  ║   Last Verification: 2 hours ago                      ║  │   │
│   │  ║                                                       ║  │   │
│   │  ╚═══════════════════════════════════════════════════════╝  │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                                                             │   │
│   │              [ 📷 HIZLI DOĞRULAMA ]                        │   │
│   │              [    QUICK VERIFY    ]                        │   │
│   │                                                             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│   Son Aktiviteler / Recent Activity                                 │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  ✓  Doğrulama Başarılı    Bugün 14:32    %94.5            │   │
│   │  ✓  Doğrulama Başarılı    Dün 09:15      %97.2            │   │
│   │  ✗  Doğrulama Başarısız   12 Kas 16:45   Canlılık Hatası  │   │
│   │  ✓  Kayıt Tamamlandı      10 Kas 11:20   -                │   │
│   │                                                             │   │
│   │              Tümünü Gör / View All →                       │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
├─────────────────────────────────────────────────────────────────────┤
│   🏠          📝          📄          👤                            │
│   Home       Enroll     Documents   Profile                         │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Enrollment Flow (KYC-Standard)

Based on [Onfido](https://documentation.onfido.com/getting-started/quick-start-guide/) and [Jumio](https://www.jumio.com/benefits-mobile-sdk/) patterns:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ENROLLMENT FLOW (5 STEPS)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1/5: Consent & Introduction                                    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  Kimlik Kayıt / Identity Enrollment                      │    │
│  │                                                             │    │
│  │              [Shield Icon]                                  │    │
│  │                                                             │    │
│  │         Kimlik Doğrulama Başlıyor                          │    │
│  │         Identity Verification Starting                      │    │
│  │                                                             │    │
│  │   Bu işlem için şunlar gerekecek:                          │    │
│  │   This process will require:                                │    │
│  │                                                             │    │
│  │   ✓ Kimlik belgesi (TC Kimlik veya Pasaport)               │    │
│  │   ✓ Kamera erişimi                                         │    │
│  │   ✓ İyi aydınlatılmış ortam                                │    │
│  │                                                             │    │
│  │   ┌───────────────────────────────────────────────────┐    │    │
│  │   │  ☑️  KVKK/GDPR kapsamında kişisel verilerimin     │    │    │
│  │   │     işlenmesini kabul ediyorum                     │    │    │
│  │   │     I accept processing of my personal data       │    │    │
│  │   │                                                   │    │    │
│  │   │     Gizlilik Politikası | Kullanım Koşulları     │    │    │
│  │   └───────────────────────────────────────────────────┘    │    │
│  │                                                             │    │
│  │              [ Devam Et / Continue ]                        │    │
│  │                                                             │    │
│  │              ● ○ ○ ○ ○                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 2/5: Personal Information                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  Kişisel Bilgiler / Personal Information                 │    │
│  │                                                             │    │
│  │   👤 Ad Soyad / Full Name (Resmi / Legal)                  │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  Ahmet Yılmaz                                       │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │   ⚠️ Kimlik belgesindeki isimle aynı olmalı               │    │
│  │                                                             │    │
│  │   🆔 TC Kimlik No / ID Number                              │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  12345678901                                        │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   📧 E-posta / Email                                       │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  ahmet@example.com                                  │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   📱 Telefon / Phone (Opsiyonel)                           │    │
│  │   ┌──────┐ ┌────────────────────────────────────────────┐   │    │
│  │   │ +90  │ │  555 123 4567                              │   │    │
│  │   └──────┘ └────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │              [ Devam Et / Continue ]                        │    │
│  │                                                             │    │
│  │              ● ● ○ ○ ○                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 3/5: Document Verification (NFC)                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  Belge Doğrulama / Document Verification                 │    │
│  │                                                             │    │
│  │         Belge Türü Seçin / Select Document Type             │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  🪪  TC Kimlik Kartı                      ▶        │   │    │
│  │   │      Turkish ID Card                                │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  🛂  Pasaport                             ▶        │   │    │
│  │   │      Passport                                       │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  🚗  Ehliyet                              ▶        │   │    │
│  │   │      Driver's License                               │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  ⏭️  NFC'siz Devam Et                     ▶        │   │    │
│  │   │      Continue without NFC                           │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │              ● ● ● ○ ○                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 3b: NFC Scanning                                               │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  TC Kimlik Okuma / Reading TC ID Card                    │    │
│  │                                                             │    │
│  │   MRZ Bilgilerini Girin / Enter MRZ Information             │    │
│  │                                                             │    │
│  │   Belge No / Document Number                                │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  A12B34567                                          │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   Doğum Tarihi / Date of Birth                              │    │
│  │   ┌─────┐ ┌─────┐ ┌─────┐                                   │    │
│  │   │ 15  │ │ 03  │ │1990 │  (GG/AA/YYYY)                    │    │
│  │   └─────┘ └─────┘ └─────┘                                   │    │
│  │                                                             │    │
│  │   Son Geçerlilik / Expiry Date                              │    │
│  │   ┌─────┐ ┌─────┐ ┌─────┐                                   │    │
│  │   │ 20  │ │ 05  │ │2030 │  (GG/AA/YYYY)                    │    │
│  │   └─────┘ └─────┘ └─────┘                                   │    │
│  │                                                             │    │
│  │              [ NFC ile Tara / Scan with NFC ]               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 3c: NFC Reading Animation                                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │              [NFC Wave Animation]                           │    │
│  │                                                             │    │
│  │         Kimlik Kartını Telefonun Arkasına                  │    │
│  │         Yaklaştırın ve Bekleyin                            │    │
│  │                                                             │    │
│  │         Hold ID Card to the back of phone                   │    │
│  │                                                             │    │
│  │              ████████████░░░░░░░░  60%                      │    │
│  │              Fotoğraf okunuyor...                           │    │
│  │              Reading photo...                               │    │
│  │                                                             │    │
│  │   ⚠️ Kartı çekmeyin / Don't remove the card                │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 4/5: Face Capture                                              │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  Yüz Fotoğrafı / Face Photo                              │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │                                                     │   │    │
│  │   │                 [Camera Preview]                    │   │    │
│  │   │                                                     │   │    │
│  │   │            ┌─────────────────────┐                  │   │    │
│  │   │            │                     │                  │   │    │
│  │   │            │    (Oval Guide)     │                  │   │    │
│  │   │            │                     │                  │   │    │
│  │   │            │     😊              │                  │   │    │
│  │   │            │                     │                  │   │    │
│  │   │            └─────────────────────┘                  │   │    │
│  │   │                                                     │   │    │
│  │   │   ✓ Yüz algılandı / Face detected                  │   │    │
│  │   │                                                     │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   💡 İpuçları / Tips:                                      │    │
│  │   • İyi aydınlatılmış ortam kullanın                       │    │
│  │   • Gözlük ve şapka çıkarın                                │    │
│  │   • Doğrudan kameraya bakın                                │    │
│  │                                                             │    │
│  │              [ 📷 Fotoğraf Çek / Capture ]                 │    │
│  │                                                             │    │
│  │              ● ● ● ● ○                                      │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 5/5: Liveness Check (Biometric Puzzle)                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  Canlılık Testi / Liveness Check                         │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │                                                     │   │    │
│  │   │                 [Camera Preview]                    │   │    │
│  │   │                                                     │   │    │
│  │   │                                                     │   │    │
│  │   │                     😊                              │   │    │
│  │   │                                                     │   │    │
│  │   │                                                     │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │                                                     │   │    │
│  │   │         😊 GÜLÜMSEYIN / SMILE                      │   │    │
│  │   │                                                     │   │    │
│  │   │              Adım 1/4                               │   │    │
│  │   │                                                     │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │              ● ● ● ● ●                                      │    │
│  │                                                             │    │
│  │   Sonraki: 😉 Göz Kırpın | 👈 Sola Bakın | 👉 Sağa Bakın   │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  SUCCESS: Enrollment Complete                                        │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │              [Success Checkmark Animation]                  │    │
│  │                       ✓                                     │    │
│  │                                                             │    │
│  │              Kayıt Tamamlandı!                              │    │
│  │              Enrollment Complete!                           │    │
│  │                                                             │    │
│  │         Artık kimliğinizi doğrulayabilirsiniz              │    │
│  │         You can now verify your identity                    │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  📋 Kayıt Özeti / Enrollment Summary                │   │    │
│  │   │                                                     │   │    │
│  │   │  Ad: Ahmet Yılmaz                                   │   │    │
│  │   │  TC: 123****901                                     │   │    │
│  │   │  Belge: TC Kimlik ✓                                 │   │    │
│  │   │  Canlılık: Başarılı ✓                               │   │    │
│  │   │  Kayıt ID: ENR-2024-001234                          │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │              [ Ana Sayfaya Dön / Go to Home ]               │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.4 Quick Verification Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QUICK VERIFICATION FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  STEP 1: Camera + Face Detection                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  Hızlı Doğrulama / Quick Verify                          │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │                                                     │   │    │
│  │   │                 [Camera Preview]                    │   │    │
│  │   │                                                     │   │    │
│  │   │            ┌─────────────────────┐                  │   │    │
│  │   │            │                     │                  │   │    │
│  │   │            │    (Oval Guide)     │                  │   │    │
│  │   │            │       GREEN         │                  │   │    │
│  │   │            │                     │                  │   │    │
│  │   │            └─────────────────────┘                  │   │    │
│  │   │                                                     │   │    │
│  │   │              ✓ Yüz Algılandı                        │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │         Yüzünüzü çerçeveye yerleştirin                     │    │
│  │         Position your face in the frame                     │    │
│  │                                                             │    │
│  │              [ 📷 Doğrula / Verify ]                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 2: Liveness Check (Biometric Puzzle)                           │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │                 [Camera Preview]                    │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │          👈 SOLA BAKIN / LOOK LEFT                 │   │    │
│  │   │                                                     │   │    │
│  │   │     ✓ Gülümse  ✓ Göz Kırp  ◉ Sola Bak  ○ Sağa Bak │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 3a: Success Result                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │   ╔═══════════════════════════════════════════════════════╗ │    │
│  │   ║                     ✓                                 ║ │    │
│  │   ║                                                       ║ │    │
│  │   ║            DOĞRULAMA BAŞARILI                         ║ │    │
│  │   ║            VERIFICATION SUCCESSFUL                    ║ │    │
│  │   ║                                                       ║ │    │
│  │   ║   ┌─────────┐                                         ║ │    │
│  │   ║   │  [Photo]│   Ahmet Yılmaz                          ║ │    │
│  │   ║   │         │   TC: 123****901                        ║ │    │
│  │   ║   └─────────┘                                         ║ │    │
│  │   ║                                                       ║ │    │
│  │   ║            Güven Skoru: %94.5                         ║ │    │
│  │   ║            Confidence: 94.5%                          ║ │    │
│  │   ║                                                       ║ │    │
│  │   ║   ████████████████████████░░░░░░                      ║ │    │
│  │   ║                                                       ║ │    │
│  │   ╚═══════════════════════════════════════════════════════╝ │    │
│  │                                                             │    │
│  │              [ Tamam / Done ]                               │    │
│  │                                                             │    │
│  │         3 saniye sonra ana sayfaya dönülecek               │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  STEP 3b: Failure Result                                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │   ╔═══════════════════════════════════════════════════════╗ │    │
│  │   ║                     ✗                                 ║ │    │
│  │   ║                                                       ║ │    │
│  │   ║            DOĞRULAMA BAŞARISIZ                        ║ │    │
│  │   ║            VERIFICATION FAILED                        ║ │    │
│  │   ║                                                       ║ │    │
│  │   ║   Sebep / Reason:                                     ║ │    │
│  │   ║   Canlılık testi geçilemedi                          ║ │    │
│  │   ║   Liveness check failed                               ║ │    │
│  │   ║                                                       ║ │    │
│  │   ║   💡 Öneri: İyi aydınlatılmış ortamda                ║ │    │
│  │   ║      tekrar deneyin                                   ║ │    │
│  │   ║                                                       ║ │    │
│  │   ╚═══════════════════════════════════════════════════════╝ │    │
│  │                                                             │    │
│  │   [ Tekrar Dene / Try Again ]   [ İptal / Cancel ]          │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.5 NFC Document Reader

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NFC DOCUMENT READER                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Main Screen                                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  ←  Belge Tarayıcı / Document Scanner                       │    │
│  │                                                             │    │
│  │   Okuma Modu / Reading Mode                                 │    │
│  │   ┌────────────────────┐ ┌────────────────────┐             │    │
│  │   │   🔄 OTOMATİK     │ │   📋 MANUEL        │             │    │
│  │   │      AUTO          │ │      MANUAL        │             │    │
│  │   └────────────────────┘ └────────────────────┘             │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │                                                     │   │    │
│  │   │                 [NFC Animation]                     │   │    │
│  │   │                     📱                              │   │    │
│  │   │                    ╱   ╲                            │   │    │
│  │   │                   ╱  ●  ╲                           │   │    │
│  │   │                  ╱       ╲                          │   │    │
│  │   │                                                     │   │    │
│  │   │         Belgeyi telefonun arkasına tutun           │   │    │
│  │   │         Hold document to back of phone              │   │    │
│  │   │                                                     │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   Son Taranan / Recently Scanned                            │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  🪪 TC Kimlik - A. Yılmaz         Bugün 14:32      │   │    │
│  │   │  🛂 Pasaport - M. Demir           Dün 09:15        │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Manual Selection (When MANUEL selected)                             │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │   Belge Türü Seçin / Select Document Type                   │    │
│  │                                                             │    │
│  │   Kimlik Belgeleri / ID Documents                           │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  🪪 TC Kimlik Kartı                    [Şifre Gerek]│   │    │
│  │   │  🛂 Pasaport                           [Şifre Gerek]│   │    │
│  │   │  🚗 Ehliyet                            [Şifre Gerek]│   │    │
│  │   │  🏠 İkamet İzni                        [Şifre Gerek]│   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   Diğer Kartlar / Other Cards                               │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │  🚇 Ulaşım Kartı (İstanbulkart vb.)                 │   │    │
│  │   │  💳 Banka Kartı (EMV)                               │   │    │
│  │   │  🏷️ NFC Tag (NDEF)                                  │   │    │
│  │   │  📦 Mifare Classic                                  │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  Read Result                                                         │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                                                             │    │
│  │   ✓ Belge Okundu / Document Read                            │    │
│  │                                                             │    │
│  │   ┌─────────────────────────────────────────────────────┐   │    │
│  │   │                                                     │   │    │
│  │   │   [Photo]    TC KİMLİK KARTI                        │   │    │
│  │   │              Turkish ID Card                        │   │    │
│  │   │                                                     │   │    │
│  │   │   Ad Soyad:  Ahmet Yılmaz                           │   │    │
│  │   │   TC No:     12345678901                            │   │    │
│  │   │   Doğum:     15.03.1990                             │   │    │
│  │   │   Geçerlilik: 20.05.2030                            │   │    │
│  │   │   Cinsiyet:  Erkek                                  │   │    │
│  │   │                                                     │   │    │
│  │   │   ✓ Pasif Kimlik Doğrulama Başarılı                │   │    │
│  │   │   ✓ Passive Authentication Passed                   │   │    │
│  │   │                                                     │   │    │
│  │   └─────────────────────────────────────────────────────┘   │    │
│  │                                                             │    │
│  │   [ Kayıta Kullan ]  [ Paylaş ]  [ Yeni Tara ]             │    │
│  │                                                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. App 2: FIVUCSAS Admin - Screen Specification

### 5.1 Navigation Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FIVUCSAS ADMIN - NAVIGATION                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   Navigation Rail (Tablet/Desktop) or Bottom Nav (Phone):           │
│                                                                      │
│   ┌───────┐                                                          │
│   │  👥   │  Kullanıcılar / Users                                   │
│   ├───────┤                                                          │
│   │  📊   │  Analitik / Analytics                                   │
│   ├───────┤                                                          │
│   │  🔒   │  Güvenlik / Security                                    │
│   ├───────┤                                                          │
│   │  ⚙️   │  Ayarlar / Settings                                     │
│   └───────┘                                                          │
│                                                                      │
│   Screen Hierarchy:                                                  │
│                                                                      │
│   👥 Users                                                           │
│   ├── User List (Table with search/filter)                          │
│   ├── Add User Dialog                                               │
│   ├── Edit User Dialog                                              │
│   ├── User Detail Screen                                            │
│   └── Bulk Operations                                               │
│                                                                      │
│   📊 Analytics                                                       │
│   ├── Dashboard Overview                                            │
│   ├── Enrollment Analytics                                          │
│   ├── Verification Analytics                                        │
│   └── Export Reports                                                │
│                                                                      │
│   🔒 Security                                                        │
│   ├── Security Overview                                             │
│   ├── Active Sessions                                               │
│   ├── Security Alerts                                               │
│   └── Audit Logs                                                    │
│                                                                      │
│   ⚙️ Settings                                                        │
│   ├── Profile Settings                                              │
│   ├── Security Settings                                             │
│   ├── Biometric Settings                                            │
│   ├── System Settings                                               │
│   ├── Notification Settings                                         │
│   └── Appearance Settings                                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Admin Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│  ≡  FIVUCSAS Admin                    🔔 3   👤 Admin ▼            │
├───────┬─────────────────────────────────────────────────────────────┤
│       │                                                              │
│  👥   │   KULLANICI YÖNETİMİ / USER MANAGEMENT                      │
│ Users │                                                              │
│       │   ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│ ───── │   │ 👥  1,234  │ │ ✓   892    │ │ ○   287    │ │ ⏳  55   │ │
│       │   │ Toplam     │ │ Aktif      │ │ Pasif      │ │ Bekleyen │ │
│  📊   │   │ Total      │ │ Active     │ │ Inactive   │ │ Pending  │ │
│Analiz │   └────────────┘ └────────────┘ └────────────┘ └──────────┘ │
│       │                                                              │
│ ───── │   ┌──────────────────────────────────────────────────────┐  │
│       │   │ 🔍 Ara / Search...                    [ + Yeni Ekle ] │  │
│  🔒   │   ├──────────────────────────────────────────────────────┤  │
│Güvenl │   │ [ Aktif ] [ Pasif ] [ Bekleyen ] [ Tümü ]  📥 Export │  │
│       │   └──────────────────────────────────────────────────────┘  │
│ ───── │                                                              │
│       │   ┌──────────────────────────────────────────────────────┐  │
│  ⚙️   │   │ Ad Soyad        │ E-posta          │ Durum  │ İşlem  │  │
│Ayarlar│   ├──────────────────────────────────────────────────────┤  │
│       │   │ Ahmet Yılmaz    │ ahmet@mail.com   │ ✓ Aktif│ ✏️ 🗑️ │  │
│       │   │ Mehmet Demir    │ mehmet@mail.com  │ ✓ Aktif│ ✏️ 🗑️ │  │
│       │   │ Ayşe Kaya       │ ayse@mail.com    │ ○ Pasif│ ✏️ 🗑️ │  │
│       │   │ ...             │ ...              │ ...    │ ...    │  │
│       │   └──────────────────────────────────────────────────────┘  │
│       │                                                              │
│       │   ◀ 1 2 3 ... 10 ▶                          20 / sayfa ▼   │
│       │                                                              │
└───────┴──────────────────────────────────────────────────────────────┘
```

---

## 6. Technical Architecture

### 6.1 Kotlin Multiplatform Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│                    KMP PROJECT STRUCTURE                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   fivucsas-mobile/                                                   │
│   ├── shared/                        # Shared KMP code (90%)        │
│   │   ├── commonMain/                                               │
│   │   │   ├── domain/                # Business logic               │
│   │   │   │   ├── model/             # Data classes                 │
│   │   │   │   ├── repository/        # Repository interfaces        │
│   │   │   │   └── usecase/           # Use cases                    │
│   │   │   │                                                         │
│   │   │   ├── data/                  # Data layer                   │
│   │   │   │   ├── repository/        # Repository implementations   │
│   │   │   │   ├── remote/            # API clients                  │
│   │   │   │   ├── local/             # Local storage                │
│   │   │   │   └── mapper/            # Data mappers                 │
│   │   │   │                                                         │
│   │   │   ├── presentation/          # ViewModels                   │
│   │   │   │   ├── auth/                                             │
│   │   │   │   ├── enrollment/                                       │
│   │   │   │   ├── verification/                                     │
│   │   │   │   ├── nfc/                                              │
│   │   │   │   └── admin/                                            │
│   │   │   │                                                         │
│   │   │   └── util/                  # Utilities                    │
│   │   │                                                             │
│   │   ├── androidMain/               # Android-specific             │
│   │   │   ├── nfc/                   # Android NFC implementation   │
│   │   │   ├── camera/                # CameraX integration          │
│   │   │   ├── biometric/             # Android BiometricPrompt      │
│   │   │   └── storage/               # EncryptedSharedPreferences   │
│   │   │                                                             │
│   │   └── iosMain/                   # iOS-specific                 │
│   │       ├── nfc/                   # CoreNFC implementation       │
│   │       ├── camera/                # AVFoundation integration     │
│   │       ├── biometric/             # LocalAuthentication          │
│   │       └── storage/               # Keychain storage             │
│   │                                                                 │
│   ├── androidApp/                    # Android app module           │
│   │   ├── id/                        # FIVUCSAS ID app              │
│   │   └── admin/                     # FIVUCSAS Admin app           │
│   │                                                                 │
│   └── iosApp/                        # iOS app module               │
│       ├── id/                        # FIVUCSAS ID app              │
│       └── admin/                     # FIVUCSAS Admin app           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Authentication Architecture

Based on [secure token storage best practices](https://capgo.app/blog/secure-token-storage-best-practices-for-mobile-developers/):

```kotlin
// Token Storage Strategy
interface TokenStorage {
    suspend fun saveAccessToken(token: String)
    suspend fun saveRefreshToken(token: String)
    suspend fun getAccessToken(): String?
    suspend fun getRefreshToken(): String?
    suspend fun clearTokens()
}

// Android Implementation
class AndroidTokenStorage(context: Context) : TokenStorage {
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        "fivucsas_secure_prefs",
        MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    // Implementation...
}

// iOS Implementation
class IosTokenStorage : TokenStorage {
    // Uses Keychain with kSecAttrAccessibleWhenUnlockedThisDeviceOnly
    // Implementation...
}
```

### 6.3 Offline-First Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OFFLINE-FIRST DATA FLOW                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌─────────────┐                                                    │
│   │   UI Layer  │                                                    │
│   │ (Compose)   │                                                    │
│   └──────┬──────┘                                                    │
│          │                                                           │
│          ▼                                                           │
│   ┌─────────────┐                                                    │
│   │  ViewModel  │  ◄── Observes local DB changes                    │
│   └──────┬──────┘                                                    │
│          │                                                           │
│          ▼                                                           │
│   ┌─────────────┐                                                    │
│   │ Repository  │  ◄── Single source of truth                       │
│   └──────┬──────┘                                                    │
│          │                                                           │
│    ┌─────┴─────┐                                                     │
│    │           │                                                     │
│    ▼           ▼                                                     │
│   ┌───────┐  ┌────────────┐                                         │
│   │ Local │  │   Remote   │                                         │
│   │  DB   │  │    API     │                                         │
│   │(Room) │  │ (Retrofit) │                                         │
│   └───────┘  └────────────┘                                         │
│                                                                      │
│   SYNC STRATEGY:                                                     │
│   1. Always read from local DB first                                │
│   2. Fetch from remote in background                                │
│   3. Update local DB with remote data                               │
│   4. UI automatically updates via Flow                              │
│   5. Queue offline actions for later sync                           │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.4 Demo Mode Implementation

```kotlin
// Configuration
object AppConfig {
    var mode: AppMode = AppMode.DEMO

    enum class AppMode {
        DEMO,       // No backend, all local
        DEVELOPMENT,// Local backend
        STAGING,    // Staging server
        PRODUCTION  // Production server
    }
}

// Repository with Demo Mode Support
class UserRepositoryImpl(
    private val localDataSource: UserLocalDataSource,
    private val remoteDataSource: UserRemoteDataSource,
    private val appConfig: AppConfig
) : UserRepository {

    override suspend fun getUsers(): Flow<List<User>> {
        return when (appConfig.mode) {
            AppMode.DEMO -> localDataSource.getAllUsers()
            else -> {
                // Try remote first, fallback to local
                try {
                    val remoteUsers = remoteDataSource.getUsers()
                    localDataSource.saveUsers(remoteUsers)
                } catch (e: Exception) {
                    // Network error, use local
                }
                localDataSource.getAllUsers()
            }
        }
    }
}

// Demo Data Seeding
object DemoDataSeeder {
    fun seedDemoData(database: AppDatabase) {
        val demoUsers = listOf(
            User(
                id = "demo-1",
                name = "Demo User",
                email = "user@demo.local",
                status = UserStatus.ACTIVE
            ),
            User(
                id = "demo-2",
                name = "Demo Admin",
                email = "admin@demo.local",
                status = UserStatus.ACTIVE,
                role = Role.TENANT_ADMIN
            )
        )
        database.userDao().insertAll(demoUsers)
    }
}
```

---

## 7. Security Implementation

### 7.1 Biometric Authentication

Based on [Android fintech biometric best practices](https://www.pragmaticcoders.com/blog/biometric-authentication-in-android-fintech-apps):

```kotlin
class BiometricAuthenticator(private val activity: FragmentActivity) {

    private val executor = ContextCompat.getMainExecutor(activity)

    fun authenticate(
        onSuccess: (BiometricPrompt.AuthenticationResult) -> Unit,
        onError: (Int, String) -> Unit,
        onFailed: () -> Unit
    ) {
        val biometricManager = BiometricManager.from(activity)
        when (biometricManager.canAuthenticate(BIOMETRIC_STRONG or DEVICE_CREDENTIAL)) {
            BiometricManager.BIOMETRIC_SUCCESS -> {
                showBiometricPrompt(onSuccess, onError, onFailed)
            }
            BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> {
                onError(-1, "No biometric hardware")
            }
            BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                onError(-2, "No biometrics enrolled")
            }
            else -> {
                onError(-3, "Biometric not available")
            }
        }
    }

    private fun showBiometricPrompt(
        onSuccess: (BiometricPrompt.AuthenticationResult) -> Unit,
        onError: (Int, String) -> Unit,
        onFailed: () -> Unit
    ) {
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("FIVUCSAS Giriş")
            .setSubtitle("Biyometrik ile giriş yapın")
            .setNegativeButtonText("PIN Kullan")
            .setAllowedAuthenticators(BIOMETRIC_STRONG)
            .build()

        val biometricPrompt = BiometricPrompt(
            activity,
            executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: AuthenticationResult) {
                    onSuccess(result)
                }
                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onError(errorCode, errString.toString())
                }
                override fun onAuthenticationFailed() {
                    onFailed()
                }
            }
        )

        biometricPrompt.authenticate(promptInfo)
    }
}
```

### 7.2 PIN Storage with Cryptography

```kotlin
class PinManager(private val context: Context) {

    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()

    private val sharedPrefs = EncryptedSharedPreferences.create(
        context,
        "pin_storage",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    fun setPin(pin: String) {
        val hashedPin = hashPin(pin)
        sharedPrefs.edit().putString("user_pin", hashedPin).apply()
    }

    fun verifyPin(pin: String): Boolean {
        val storedHash = sharedPrefs.getString("user_pin", null) ?: return false
        return hashPin(pin) == storedHash
    }

    private fun hashPin(pin: String): String {
        // Use Argon2 for PIN hashing
        val argon2 = Argon2Factory.create()
        return argon2.hash(10, 65536, 1, pin.toCharArray())
    }
}
```

---

## 8. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
- [ ] Setup KMP project structure
- [ ] Implement secure token storage
- [ ] Create demo mode infrastructure
- [ ] Basic navigation and routing
- [ ] Theme and design system

### Phase 2: Authentication (Weeks 3-4)
- [ ] Login/Register screens
- [ ] Biometric setup flow
- [ ] PIN fallback
- [ ] Demo mode authentication
- [ ] Session management

### Phase 3: Core Features (Weeks 5-8)
- [ ] Enrollment flow with all steps
- [ ] Face capture with ML Kit
- [ ] Liveness detection (Biometric Puzzle)
- [ ] Quick verification flow
- [ ] NFC document reading integration

### Phase 4: Admin App (Weeks 9-10)
- [ ] User management screens
- [ ] Analytics dashboard
- [ ] Security monitoring
- [ ] Settings screens

### Phase 5: Polish & Testing (Weeks 11-12)
- [ ] UI/UX refinements
- [ ] Error handling improvements
- [ ] Performance optimization
- [ ] Testing on multiple devices
- [ ] Backend integration (when ready)

---

## 9. Sources & References

### Identity Verification Best Practices
- [Mitek Mobile UX Best Practices](https://www.miteksystems.com/innovation-hub/best-practices-in-mobile-ux-design-how-to-integrate-mobile-id-verification-a-qa)
- [Cognito 6 Tips for ID Verification UX](https://cognitohq.com/blog/6-tips-to-maximize-identity-verification-ux)
- [Smashing Magazine Authentication UX](https://www.smashingmagazine.com/2022/08/authentication-ux-design-guidelines/)

### KYC & Liveness Detection
- [Smile ID KYC Liveness Guide](https://usesmileid.com/blog/kyc-liveness-check-guide/)
- [Veriff KYC Onboarding](https://www.veriff.com/product/kyc-onboarding)
- [AU10TIX Liveness Detection](https://www.au10tix.com/blog/au10tix-offers-strong-liveness-detection-for-online-and-mobile-face-matching/)

### Banking & Fintech Security
- [Binariks Biometric Banking](https://binariks.com/blog/biometric-security-onilne-banking/)
- [nextAuth Mobile Authentication Best Practices](https://www.nextauth.com/mobile-authentication-fintech-7-best-practices/)
- [Pragmatic Coders Biometric Auth in Android](https://www.pragmaticcoders.com/blog/biometric-authentication-in-android-fintech-apps)

### Multi-Tenant Architecture
- [Microsoft Azure Multi-Tenant Identity](https://learn.microsoft.com/en-us/azure/architecture/guide/multitenant/considerations/identity)
- [Auth0 Multi-Tenant Best Practices](https://auth0.com/docs/get-started/auth0-overview/create-tenants/multi-tenant-apps-best-practices)
- [BIO-key Enterprise Biometrics](https://www.bio-key.com/biometrics/)

### Secure Token Storage
- [Capgo Secure Token Storage](https://capgo.app/blog/secure-token-storage-best-practices-for-mobile-developers/)
- [Curity OAuth for Mobile Apps](https://curity.io/resources/learn/oauth-for-mobile-apps-best-practices/)

### SDK References
- [Onfido Android SDK](https://github.com/onfido/onfido-android-sdk)
- [Onfido Quick Start Guide](https://documentation.onfido.com/getting-started/quick-start-guide/)
- [Jumio Mobile SDK Benefits](https://www.jumio.com/benefits-mobile-sdk/)

### Turkish ID & e-Devlet
- [Turkish Electronic ID Card Paper](https://www.researchgate.net/publication/221506894_Turkish_national_electronic_identity_card)
- [e-Devlet Portal](https://www.turkiye.gov.tr)
- [Turkish ID Card Wikipedia](https://en.wikipedia.org/wiki/Turkish_identity_card)
