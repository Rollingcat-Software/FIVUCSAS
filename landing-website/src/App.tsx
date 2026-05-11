import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

// ────────────────────────────────────────────────────────────
//  i18n
// ────────────────────────────────────────────────────────────

type Lang = 'en' | 'tr'

const t = {
  nav: {
    features:     { en: 'Features',     tr: 'Özellikler' },
    methods:      { en: 'Auth Methods', tr: 'Yöntemler' },
    howItWorks:   { en: 'How It Works', tr: 'Nasıl Çalışır' },
    architecture: { en: 'Architecture', tr: 'Mimari' },
    team:         { en: 'Team',         tr: 'Ekip' },
    demo:         { en: 'Demo',         tr: 'Demo' },
    status:       { en: 'Status',       tr: 'Durum' },
    signIn:       { en: 'Admin Console',tr: 'Yönetici Paneli' },
  },
  hero: {
    badge:      { en: 'v1 shipped · 1,800+ tests · production-ready', tr: 'v1 yayında · 1.800+ test · üretime hazır' },
    titleA:     { en: 'Identity verification',                      tr: 'Kimlik doğrulama' },
    titleB:     { en: 'for the modern internet.',                   tr: 'modern internet için.' },
    subtitle:   { en: 'Face & Identity Verification Platform',      tr: 'Yüz & Kimlik Doğrulama Platformu' },
    acronym:    {
      en: 'FIVUCSAS — Face and Identity Verification Using Cloud-based SaaS.',
      tr: 'FIVUCSAS — Bulut Tabanlı SaaS ile Yüz ve Kimlik Doğrulama (Face and Identity Verification Using Cloud-based SaaS).',
    },
    lede:       {
      en: 'FIVUCSAS is an end-to-end biometric authentication platform. Ten auth methods, an N-step MFA dispatcher, OAuth 2.0 / OIDC hosted login, and a drop-in verification widget — for any web, mobile, or desktop app.',
      tr: 'FIVUCSAS, uçtan uca biyometrik kimlik doğrulama platformudur. On doğrulama yöntemi, N-adımlı MFA akışı, OAuth 2.0 / OIDC barındırılan giriş ve her web, mobil veya masaüstü uygulamaya eklenebilen doğrulama widget’ı.',
    },
    ctaPrimary: { en: 'Try the live demo',        tr: 'Canlı demoyu dene' },
    ctaGhost:   { en: 'Read the docs',            tr: 'Belgeleri oku' },
    ctaGit:     { en: 'View on GitHub',           tr: 'GitHub’da gör' },
  },
  stats: {
    methods:   { en: 'Auth methods',   tr: 'Doğrulama yöntemi' },
    endpoints: { en: 'API endpoints',  tr: 'API uç noktası' },
    tests:     { en: 'Tests passing',  tr: 'Geçen test' },
    services:  { en: 'Microservices',  tr: 'Mikroservis' },
  },
  features: {
    heading: { en: 'Built like infrastructure should be built.', tr: 'Altyapı nasıl kurulmalıysa öyle.' },
    sub:     { en: 'Security, compliance, and developer experience — not a pick-two.', tr: 'Güvenlik, uyumluluk ve geliştirici deneyimi — üçü birden.' },
    items: [
      {
        icon: 'shield',
        title: { en: 'Liveness & anti-spoof',      tr: 'Canlılık & spoof koruması' },
        body:  { en: 'On-device liveness detection, screen-replay checks, rPPG pulse cues, and NFC document cross-reference.', tr: 'Cihaz üstü canlılık tespiti, ekran tekrarı kontrolleri, rPPG nabız sinyalleri ve NFC belge çapraz doğrulaması.' },
      },
      {
        icon: 'lock',
        title: { en: 'OAuth 2.0 · OIDC · PKCE',     tr: 'OAuth 2.0 · OIDC · PKCE' },
        body:  { en: 'Hosted-first login with full PKCE, discovery, JWKS, and refresh-token rotation. Works like Auth0 or Entra.', tr: 'Tam PKCE, keşif, JWKS ve yenileme jetonu rotasyonu ile barındırılan giriş. Auth0 veya Entra gibi çalışır.' },
      },
      {
        icon: 'cube',
        title: { en: 'Multi-tenant by design',      tr: 'Çok kiracılı tasarım' },
        body:  { en: 'Isolated data, per-tenant auth flows, and row-level security. Configure each tenant’s MFA independently.', tr: 'İzole veri, kiracı başına doğrulama akışları ve satır düzeyi güvenlik. Her kiracının MFA’sını bağımsız yapılandırın.' },
      },
      {
        icon: 'bolt',
        title: { en: 'N-step MFA dispatcher',       tr: 'N-adımlı MFA dağıtıcısı' },
        body:  { en: 'Chain any combination of the ten methods. JWT is deferred until every step clears. RFC 8176 amr claims emitted.', tr: 'On yöntemin herhangi bir kombinasyonunu zincirleyin. Tüm adımlar tamamlanmadan JWT verilmez. RFC 8176 amr talepleri.' },
      },
      {
        icon: 'doc',
        title: { en: 'Data export & KVKK/GDPR',     tr: 'Veri dışa aktarma & KVKK/GDPR' },
        body:  { en: 'Full personal-data export and purge per request. Audit logs are partitioned monthly for retention control.', tr: 'Talep üzerine tam kişisel veri dışa aktarımı ve silme. Denetim günlükleri aylık bölümlere ayrılmıştır.' },
      },
      {
        icon: 'globe',
        title: { en: 'Cross-platform SDKs',         tr: 'Çapraz platform SDK’ları' },
        body:  { en: 'Web iframe widget, Android & iOS via Kotlin Multiplatform, desktop via loopback (RFC 8252), and CLI.', tr: 'Web iframe widget’ı, Kotlin Multiplatform ile Android & iOS, loopback ile masaüstü (RFC 8252) ve CLI.' },
      },
    ],
  },
  methods: {
    heading: { en: 'Ten authentication methods, one platform.', tr: 'On kimlik doğrulama yöntemi, tek platform.' },
    sub:     { en: 'Pick any subset — the flow builder composes them into a single verified session.', tr: 'İstediğiniz alt kümeyi seçin — akış düzenleyici bunları tek bir doğrulanmış oturumda birleştirir.' },
    items: [
      { key: 'face',      icon: 'face',    label: { en: 'Face recognition',  tr: 'Yüz tanıma' } },
      { key: 'voice',     icon: 'voice',   label: { en: 'Voice verification',tr: 'Ses doğrulama' } },
      { key: 'finger',    icon: 'finger',  label: { en: 'Fingerprint / WebAuthn', tr: 'Parmak izi / WebAuthn' } },
      { key: 'hwkey',     icon: 'key',     label: { en: 'Hardware key',      tr: 'Donanım anahtarı' } },
      { key: 'nfc',       icon: 'nfc',     label: { en: 'NFC document',      tr: 'NFC belge' } },
      { key: 'totp',      icon: 'totp',    label: { en: 'TOTP / authenticator', tr: 'TOTP / kimlik doğrulayıcı' } },
      { key: 'sms',       icon: 'sms',     label: { en: 'SMS OTP',           tr: 'SMS OTP' } },
      { key: 'email',     icon: 'email',   label: { en: 'Email OTP',         tr: 'E-posta OTP' } },
      { key: 'qr',        icon: 'qr',      label: { en: 'QR code',           tr: 'QR kod' } },
      { key: 'password',  icon: 'pw',      label: { en: 'Password',          tr: 'Parola' } },
    ],
  },
  how: {
    heading: { en: 'Integrate in minutes. Ship the same day.', tr: 'Dakikalar içinde entegre edin. Aynı gün yayınlayın.' },
    sub:     { en: 'Three redirects and a token exchange — no custom SDK required.', tr: 'Üç yönlendirme ve bir jeton takası — özel SDK gerekmez.' },
    steps: [
      { icon: 'sparkle',   title: { en: 'Register tenant',   tr: 'Kiracıyı kaydet' },
        body: { en: 'Create a tenant, pick your MFA flow, and copy the client_id + redirect URI.', tr: 'Bir kiracı oluşturun, MFA akışınızı seçin ve client_id + redirect URI’yi kopyalayın.' } },
      { icon: 'arrow',     title: { en: 'Redirect users',    tr: 'Kullanıcıları yönlendir' },
        body: { en: 'Call loginRedirect() from web, iOS, Android, desktop, or CLI. Your users land on verify.fivucsas.com.', tr: 'Web, iOS, Android, masaüstü veya CLI’dan loginRedirect() çağırın. Kullanıcılar verify.fivucsas.com’a gelir.' } },
      { icon: 'check',     title: { en: 'Exchange & done',   tr: 'Takas & bitir' },
        body: { en: 'Receive the authorization code at your callback. Exchange it for an access + ID token at /oauth2/token.', tr: 'Geri aramanızda yetkilendirme kodunu alın. /oauth2/token üzerinden access + ID jetonuyla takas edin.' } },
    ],
  },
  architecture: {
    heading: { en: 'Architecture, at a glance.',     tr: 'Bir bakışta mimari.' },
    sub:     { en: 'Hexagonal services, clean boundaries.', tr: 'Hexagonal servisler, net sınırlar.' },
    legendClients:  { en: 'Clients',  tr: 'İstemciler' },
    legendGateway:  { en: 'Gateway',  tr: 'Ağ Geçidi' },
    legendBackend:  { en: 'Backend',  tr: 'Arka Uç' },
    legendStorage:  { en: 'Storage',  tr: 'Depolama' },
    nodes: {
      web:       { en: 'Web SPA',          tr: 'Web SPA' },
      mobile:    { en: 'Mobile (KMP)',     tr: 'Mobil (KMP)' },
      widget:    { en: 'Verify Widget',    tr: 'Doğrulama Widget’ı' },
      traefik:   { en: 'Traefik v3.6 · TLS · routing', tr: 'Traefik v3.6 · TLS · yönlendirme' },
      identity:  { en: 'Identity Core · Spring Boot · Java 21', tr: 'Identity Core · Spring Boot · Java 21' },
      biometric: { en: 'Biometric Processor · FastAPI · Python 3.12', tr: 'Biometric Processor · FastAPI · Python 3.12' },
      postgres:  { en: 'PostgreSQL 17 + pgvector', tr: 'PostgreSQL 17 + pgvector' },
      redis:     { en: 'Redis 7.4 · cache · sessions', tr: 'Redis 7.4 · önbellek · oturum' },
    },
  },
  services: {
    heading: { en: 'Three services. Clear boundaries.', tr: 'Üç servis. Net sınırlar.' },
    sub:     { en: 'Hexagonal architecture, ports and adapters throughout.', tr: 'Hexagonal mimari, uçtan uca ports & adapters.' },
    items: [
      { icon: 'lock', name: 'Identity Core API',
        description: { en: 'Central authentication and identity service. Users, tenants, permissions, OAuth 2.0 / OIDC provider, MFA dispatcher.', tr: 'Merkezi kimlik doğrulama ve kimlik servisi. Kullanıcılar, kiracılar, izinler, OAuth 2.0 / OIDC sağlayıcı, MFA dağıtıcı.' },
        tech: ['Spring Boot 3.4.7', 'Java 21', 'PostgreSQL', 'Redis'] },
      { icon: 'eye', name: 'Biometric Processor',
        description: { en: 'ML-powered face and voice recognition engine. 46+ endpoints for enrollment, verification, and anti-spoofing.', tr: 'ML destekli yüz ve ses tanıma motoru. Kayıt, doğrulama ve spoof önleme için 46+ uç nokta.' },
        tech: ['FastAPI', 'Python 3.12', 'InsightFace', 'pgvector'] },
      { icon: 'dash', name: 'Admin Dashboard',
        description: { en: 'React app for tenants to manage users, flows, devices, and review real-time audit logs.', tr: 'Kiracıların kullanıcı, akış, cihaz yönetimi ve gerçek zamanlı denetim günlüklerini incelemesi için React uygulaması.' },
        tech: ['React 18', 'TypeScript', 'MUI', 'Redux Toolkit'] },
    ],
  },
  tech: {
    heading: { en: 'Built on proven foundations.', tr: 'Kanıtlanmış temeller üzerine inşa edildi.' },
    sub:     { en: 'Boring where it counts, modern where it matters.', tr: 'Önemli yerde sıradan, gerekli yerde modern.' },
  },
  trust: {
    heading: { en: 'Trust signals.', tr: 'Güven göstergeleri.' },
    items: [
      { k: { en: 'OIDC certified ready',        tr: 'OIDC’e hazır' }, v: { en: 'RFC 6749 / OpenID Connect', tr: 'RFC 6749 / OpenID Connect' } },
      { k: { en: 'JWT signing',                 tr: 'JWT imzalama' },     v: { en: 'RS256 default + JWKS',        tr: 'Varsayılan RS256 + JWKS' } },
      { k: { en: 'At-rest encryption',          tr: 'Depoda şifreleme' }, v: { en: 'AES-GCM-256 per tenant',      tr: 'Kiracı başına AES-GCM-256' } },
      { k: { en: 'Audit retention',             tr: 'Denetim saklama' },  v: { en: 'Monthly partitioned logs',    tr: 'Aylık bölümlenmiş günlükler' } },
      { k: { en: 'Data export & purge',         tr: 'Veri dışa aktarma & silme' }, v: { en: 'KVKK / GDPR compliant', tr: 'KVKK / GDPR uyumlu' } },
      { k: { en: 'MFA rate-limiting',           tr: 'MFA hız sınırı' },   v: { en: 'Retry-After + lockout',       tr: 'Retry-After + kilitleme' } },
    ],
  },
  team: {
    heading: { en: 'Project team.', tr: 'Proje ekibi.' },
    sub:     { en: 'Marmara University — Computer Engineering · CSE4297 / CSE4197', tr: 'Marmara Üniversitesi — Bilgisayar Mühendisliği · CSE4297 / CSE4197' },
    supervisor: { en: 'Supervisor: Assoc. Prof. Dr. Mustafa Ağaoğlu', tr: 'Danışman: Doç. Dr. Mustafa Ağaoğlu' },
    year:       { en: 'Engineering Project · 2025–2026', tr: 'Mühendislik Projesi · 2025–2026' },
  },
  cta: {
    heading: { en: 'Ready to ship real MFA?', tr: 'Gerçek MFA’yı yayınlamaya hazır mısınız?' },
    sub:     { en: 'Try the admin console, explore the widget, or read the Swagger spec. Everything below is live.', tr: 'Yönetici konsolunu deneyin, widget’ı keşfedin veya Swagger spesifikasyonunu okuyun. Aşağıdaki her şey canlıdır.' },
    primary: { en: 'Open Admin Console', tr: 'Yönetici Konsolunu Aç' },
    ghost:   { en: 'Swagger UI',          tr: 'Swagger UI' },
  },
  footer: {
    rights: { en: 'All rights reserved.', tr: 'Tüm hakları saklıdır.' },
    by:     { en: 'A project by', tr: 'Bir' },
    byEnd:  { en: ' · Marmara University', tr: ' projesi · Marmara Üniversitesi' },
  },
}

const useText = (lang: Lang) => (v: { en: string; tr: string }) => v[lang]

// ────────────────────────────────────────────────────────────
//  Icons (inline SVG, 24×24)
// ────────────────────────────────────────────────────────────

const icons: Record<string, JSX.Element> = {
  shield: (<path d="M12 2 4 5v6c0 5 3.5 9.3 8 11 4.5-1.7 8-6 8-11V5l-8-3Z" />),
  lock:   (<><rect x="4.5" y="10" width="15" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>),
  cube:   (<><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></>),
  bolt:   (<path d="M13 2 3 14h8l-1 8 10-12h-8l1-8Z"/>),
  doc:    (<><path d="M7 2h8l4 4v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M15 2v6h4"/></>),
  globe:  (<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18"/></>),
  face:   (<><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1.1"/><circle cx="15" cy="10" r="1.1"/><path d="M8.5 15c1 1.2 2.2 1.8 3.5 1.8s2.5-.6 3.5-1.8"/></>),
  voice:  (<><rect x="10" y="3" width="4" height="12" rx="2"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4"/></>),
  finger: (<path d="M12 4a7 7 0 0 0-7 7c0 3 .6 6 2 9M8 12a4 4 0 0 1 8 0c0 2.4.3 4.7 1 7M12 12v4M16 21c-.7-2.4-1-4.7-1-7"/>),
  key:    (<><circle cx="8" cy="14" r="4"/><path d="M12 14h10l-3 3M19 14v3"/></>),
  nfc:    (<><path d="M3 12a9 9 0 0 1 18 0M7 12a5 5 0 0 1 10 0M11 12a1 1 0 1 1 2 0"/></>),
  totp:   (<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>),
  sms:    (<><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M7 10h10M7 13h6"/></>),
  email:  (<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></>),
  qr:     (<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14v7M14 20h7"/></>),
  pw:     (<><circle cx="7" cy="14" r="3"/><path d="M10 14h11M18 14v3M15 14v2"/></>),
  sparkle:(<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4M5 17v3M3.5 18.5h3"/></>),
  arrow:  (<path d="M5 12h14M13 6l6 6-6 6"/>),
  check:  (<path d="m4 12 5 5L20 6"/>),
  eye:    (<><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>),
  dash:   (<><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></>),
  github: (<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>),
}

const Icon = ({ name, className = 'w-5 h-5', fill = false }: { name: keyof typeof icons; className?: string; fill?: boolean }) => (
  <svg className={className} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {icons[name]}
  </svg>
)

// ────────────────────────────────────────────────────────────
//  Counter
// ────────────────────────────────────────────────────────────

function useCounter(target: number, duration = 1400) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) { setCount(target); return }
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true
        const start = performance.now()
        const step = (now: number) => {
          const progress = Math.min((now - start) / duration, 1)
          const eased = 1 - Math.pow(1 - progress, 3)
          setCount(Math.floor(eased * target))
          if (progress < 1) requestAnimationFrame(step)
          else setCount(target)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.4 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration, reduce])

  return { count, ref }
}

function Stat({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(value)
  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl md:text-5xl font-bold tracking-tight gradient-text">
        {count}{suffix}
      </div>
      <div className="text-slate-400 text-xs md:text-sm mt-2 font-mono uppercase tracking-wider">{label}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  App
// ────────────────────────────────────────────────────────────

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lang, setLang] = useState<Lang>('en')
  const text = useText(lang)

  // initial lang: localStorage, then browser, then en
  useEffect(() => {
    let initial: Lang = 'en'
    try {
      const saved = localStorage.getItem('fivucsas-lang') as Lang | null
      if (saved === 'en' || saved === 'tr') initial = saved
      else if ((navigator.language || 'en').toLowerCase().startsWith('tr')) initial = 'tr'
    } catch { /* noop */ }
    setLang(initial)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('lang', lang)
    document.documentElement.setAttribute('data-lang', lang)
    document.title = lang === 'tr'
      ? 'FIVUCSAS — Biyometrik Kimlik Doğrulama Platformu'
      : 'FIVUCSAS — Biometric Identity Verification Platform'
    try { localStorage.setItem('fivucsas-lang', lang) } catch { /* noop */ }
  }, [lang])

  const toggleLang = () => setLang(prev => prev === 'en' ? 'tr' : 'en')

  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(scrollYProgress, [0, 0.9], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80])

  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const navItems = useMemo(() => ([
    { href: '#features',     label: text(t.nav.features) },
    { href: '#methods',      label: text(t.nav.methods) },
    { href: '#how-it-works', label: text(t.nav.howItWorks) },
    { href: '#architecture', label: text(t.nav.architecture) },
    { href: '#team',         label: text(t.nav.team) },
  ]), [lang])

  return (
    <div className="relative min-h-screen text-slate-100 overflow-hidden">
      <div className="aurora" aria-hidden />

      {/* ─── Skip link ─── */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg">
        {lang === 'tr' ? 'İçeriğe geç' : 'Skip to content'}
      </a>

      {/* ─── NAV ─── */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-[#070713]/75 border-b border-white/5' : 'bg-transparent'}`}
        aria-label="Main"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="#hero" className="flex items-center gap-3 group" aria-label="FIVUCSAS home">
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-accent-500 flex items-center justify-center shadow-glow-primary">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9.3 8 11 4.5-1.7 8-6 8-11V5l-8-3Z"/><path d="M9 12l2 2 4-4" /></svg>
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-display text-base font-semibold tracking-tight">FIVUCSAS</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">identity · verified</span>
              </div>
            </a>

            <div className="hidden lg:flex items-center gap-1">
              {navItems.map(item => (
                <a key={item.href} href={item.href} className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                  {item.label}
                </a>
              ))}
              <a href="https://demo.fivucsas.com" target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors">
                {text(t.nav.demo)}
              </a>
              <a href="https://status.fivucsas.com" target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {text(t.nav.status)}
              </a>
              <button
                onClick={toggleLang}
                aria-label="Toggle language"
                className="ml-2 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:border-white/20 transition-colors"
              >
                {lang === 'en' ? 'TR' : 'EN'}
              </button>
              <a
                href="https://app.fivucsas.com"
                className="ml-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-sm font-semibold shadow-glow-primary transition-all"
              >
                {text(t.nav.signIn)}
                <Icon name="arrow" className="w-4 h-4" />
              </a>
            </div>

            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                {mobileOpen
                  ? <path d="M6 18 18 6M6 6l12 12" />
                  : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>

          {mobileOpen && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden py-3 space-y-1">
              {navItems.map(item => (
                <a key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className="block px-3 py-2 rounded-lg text-sm text-slate-300 hover:text-white hover:bg-white/5">
                  {item.label}
                </a>
              ))}
              <div className="flex gap-2 pt-2">
                <button onClick={toggleLang} className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-white/10 bg-white/5 text-slate-300">
                  {lang === 'en' ? 'Türkçe' : 'English'}
                </button>
                <a href="https://app.fivucsas.com" className="flex-1 text-center px-3 py-2 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-sm font-semibold shadow-glow-primary">
                  {text(t.nav.signIn)}
                </a>
              </div>
            </motion.div>
          )}
        </div>
      </nav>

      <main id="main" className="relative z-10">

        {/* ═══════ HERO ═══════ */}
        <section id="hero" ref={heroRef} className="relative pt-36 pb-24 px-4 overflow-hidden">
          {/* Decorative grid */}
          <div className="absolute inset-0 dot-grid mask-fade-b opacity-50 pointer-events-none" />
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-primary-500/15 blur-3xl animate-pulse-slow" />

          <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative max-w-6xl mx-auto text-center">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-mono text-primary-300">
                <span className="relative flex w-2 h-2">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
                </span>
                {text(t.hero.badge)}
              </span>

              <h1 className="mt-8 font-display font-bold leading-[1.02] tracking-[-0.04em] text-5xl md:text-7xl lg:text-[5.25rem]">
                <span className="gradient-text">FIVUCSAS</span><br />
                <span className="block text-3xl md:text-5xl lg:text-6xl text-slate-100/80 font-medium mt-3">
                  {text(t.hero.subtitle)}
                </span>
              </h1>

              <p className="mt-8 text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                {text(t.hero.lede)}
              </p>

              <p className="mt-4 text-sm text-slate-500 max-w-3xl mx-auto">
                <strong className="text-slate-300">FIVUCSAS</strong> — <strong className="text-slate-300">F</strong>ace and <strong className="text-slate-300">I</strong>dentity <strong className="text-slate-300">V</strong>erification <strong className="text-slate-300">U</strong>sing <strong className="text-slate-300">C</strong>loud-based <strong className="text-slate-300">S</strong>a<strong className="text-slate-300">a</strong>S.
              </p>

              <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://demo.fivucsas.com"
                  target="_blank" rel="noopener noreferrer"
                  className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 font-semibold text-[0.95rem] shadow-glow-primary transition-all hover:-translate-y-0.5"
                >
                  {text(t.hero.ctaPrimary)}
                  <Icon name="arrow" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </a>
                <a
                  href="https://docs.fivucsas.com"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 font-semibold text-[0.95rem] backdrop-blur-xl transition-all hover:-translate-y-0.5"
                >
                  {text(t.hero.ctaGhost)}
                </a>
                <a
                  href="https://github.com/Rollingcat-Software/FIVUCSAS"
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/5 border border-white/5 hover:border-white/15 font-semibold text-[0.95rem] text-slate-300 transition-all hover:-translate-y-0.5"
                >
                  <Icon name="github" className="w-4 h-4" fill />
                  {text(t.hero.ctaGit)}
                </a>
              </div>

              {/* Command mock */}
              <div className="mt-16 mx-auto max-w-2xl">
                <div className="glass rounded-2xl px-5 py-4 text-left font-mono text-sm text-slate-300 flex items-center gap-3">
                  <span className="text-emerald-400 select-none">$</span>
                  <span className="text-slate-500">FivucsasAuth.</span>
                  <span className="text-primary-300">loginRedirect</span>
                  <span className="text-slate-500">({'{'}</span>
                  <span className="text-accent-400">clientId</span>
                  <span className="text-slate-500">,</span>
                  <span className="text-accent-400">redirectUri</span>
                  <span className="text-slate-500">{'}'})</span>
                  <span className="ml-auto w-2 h-4 bg-primary-400 animate-pulse" />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* ═══════ STATS ═══════ */}
        <section className="px-4 border-y border-white/5 bg-white/[0.015]">
          <div className="max-w-6xl mx-auto py-14 grid grid-cols-2 md:grid-cols-4 gap-8">
            <Stat value={10}   suffix=""  label={text(t.stats.methods)} />
            <Stat value={250}  suffix="+" label={text(t.stats.endpoints)} />
            <Stat value={1800} suffix="+" label={text(t.stats.tests)} />
            <Stat value={3}    suffix=""  label={text(t.stats.services)} />
          </div>
        </section>

        {/* ═══════ FEATURES ═══════ */}
        <section id="features" className="px-4 py-28">
          <div className="max-w-7xl mx-auto">
            <SectionHead kicker={text({ en: 'Platform', tr: 'Platform' })} title={text(t.features.heading)} sub={text(t.features.sub)} />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {t.features.items.map((f, i) => (
                <motion.div
                  key={i}
                  className="group relative p-7 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary-500/30 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: (i % 3) * 0.08 }}
                >
                  <div className="pointer-events-none absolute -inset-x-20 -top-20 h-40 bg-gradient-to-b from-primary-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-primary-300 mb-5">
                    <Icon name={f.icon as keyof typeof icons} className="w-5 h-5" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2 tracking-tight">{text(f.title)}</h3>
                  <p className="text-slate-400 text-[0.92rem] leading-relaxed">{text(f.body)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ AUTH METHODS ═══════ */}
        <section id="methods" className="px-4 py-28 bg-gradient-to-b from-transparent via-white/[0.015] to-transparent border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <SectionHead kicker={text({ en: '10 factors', tr: '10 faktör' })} title={text(t.methods.heading)} sub={text(t.methods.sub)} />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {t.methods.items.map((m, i) => (
                <motion.div
                  key={m.key}
                  initial={{ opacity: 0, scale: 0.92 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: (i % 5) * 0.06 }}
                  className="group relative aspect-square flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-primary-500/40 hover:bg-gradient-to-br hover:from-primary-500/[0.08] hover:to-accent-500/[0.04] transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/15 to-accent-500/15 border border-primary-500/20 flex items-center justify-center text-primary-200 group-hover:text-white transition-colors">
                    <Icon name={m.icon as keyof typeof icons} className="w-6 h-6" />
                  </div>
                  <div className="text-[0.78rem] text-center font-medium text-slate-300 group-hover:text-white transition-colors">
                    {text(m.label)}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ HOW IT WORKS ═══════ */}
        <section id="how-it-works" className="px-4 py-28">
          <div className="max-w-6xl mx-auto">
            <SectionHead kicker={text({ en: 'Integration', tr: 'Entegrasyon' })} title={text(t.how.heading)} sub={text(t.how.sub)} />

            <div className="grid md:grid-cols-3 gap-5 relative">
              {/* connector line */}
              <div className="hidden md:block absolute left-0 right-0 top-11 mx-16 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent" />

              {t.how.steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.12 }}
                  className="relative p-7 rounded-2xl bg-white/[0.02] border border-white/5"
                >
                  <div className="relative w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shadow-glow-primary">
                    <Icon name={step.icon as keyof typeof icons} className="w-7 h-7" />
                    <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-[#070713] border border-primary-500/40 flex items-center justify-center text-xs font-mono font-semibold text-primary-300">
                      0{i + 1}
                    </div>
                  </div>
                  <h3 className="font-display text-lg font-semibold text-center mb-3 tracking-tight">{text(step.title)}</h3>
                  <p className="text-slate-400 text-center text-[0.92rem] leading-relaxed">{text(step.body)}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ ARCHITECTURE ═══════ */}
        <section id="architecture" className="px-4 py-28 bg-white/[0.015] border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <SectionHead kicker={text({ en: 'Architecture', tr: 'Mimari' })} title={text(t.architecture.heading)} sub={text(t.architecture.sub)} />

            <div className="relative">
              {/* Animated scan line */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-3xl">
                <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-primary-500/10 to-transparent animate-scan" />
              </div>

              <div className="relative rounded-3xl border border-white/10 bg-[#0a0a16]/60 backdrop-blur-md p-8 md:p-12">
                <ArchLayer label={text(t.architecture.legendClients)}>
                  <ArchNode icon="globe"  title={text(t.architecture.nodes.web)} />
                  <ArchNode icon="voice"  title={text(t.architecture.nodes.mobile)} />
                  <ArchNode icon="shield" title={text(t.architecture.nodes.widget)} />
                </ArchLayer>

                <div className="my-6 flex justify-center">
                  <div className="w-px h-10 bg-gradient-to-b from-transparent via-primary-500/60 to-transparent" />
                </div>

                <ArchLayer label={text(t.architecture.legendGateway)} single>
                  <ArchNode icon="bolt" title={text(t.architecture.nodes.traefik)} accent />
                </ArchLayer>

                <div className="my-6 flex justify-center">
                  <div className="w-px h-10 bg-gradient-to-b from-transparent via-primary-500/60 to-transparent" />
                </div>

                <ArchLayer label={text(t.architecture.legendBackend)}>
                  <ArchNode icon="lock" title={text(t.architecture.nodes.identity)} />
                  <ArchNode icon="eye"  title={text(t.architecture.nodes.biometric)} />
                </ArchLayer>

                <div className="my-6 flex justify-center">
                  <div className="w-px h-10 bg-gradient-to-b from-transparent via-primary-500/60 to-transparent" />
                </div>

                <ArchLayer label={text(t.architecture.legendStorage)}>
                  <ArchNode icon="cube" title={text(t.architecture.nodes.postgres)} />
                  <ArchNode icon="bolt" title={text(t.architecture.nodes.redis)} />
                </ArchLayer>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ SERVICES ═══════ */}
        <section className="px-4 py-28">
          <div className="max-w-7xl mx-auto">
            <SectionHead kicker={text({ en: 'Microservices', tr: 'Mikroservisler' })} title={text(t.services.heading)} sub={text(t.services.sub)} />
            <div className="grid md:grid-cols-3 gap-5">
              {t.services.items.map((s, i) => (
                <motion.div
                  key={s.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: i * 0.08 }}
                  className="group p-8 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 hover:border-primary-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500/20 to-accent-500/20 border border-primary-500/20 flex items-center justify-center text-primary-300">
                      <Icon name={s.icon as keyof typeof icons} className="w-5 h-5" />
                    </span>
                    <h3 className="font-display text-lg font-semibold tracking-tight">{s.name}</h3>
                  </div>
                  <p className="text-slate-400 text-[0.92rem] leading-relaxed mb-5">{text(s.description)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.tech.map(tech => (
                      <span key={tech} className="px-2.5 py-1 rounded-md text-xs font-mono text-slate-300 bg-white/[0.04] border border-white/5">
                        {tech}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ TRUST SIGNALS ═══════ */}
        <section className="px-4 py-20 bg-white/[0.015] border-y border-white/5">
          <div className="max-w-6xl mx-auto">
            <SectionHead kicker={text({ en: 'Compliance & security', tr: 'Uyum & güvenlik' })} title={text(t.trust.heading)} compact />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {t.trust.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-300 flex-shrink-0 mt-0.5">
                    <Icon name="check" className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[0.82rem] font-mono text-slate-400 uppercase tracking-wider mb-0.5">{text(item.k)}</div>
                    <div className="text-[0.95rem] font-medium">{text(item.v)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ TECH STACK ═══════ */}
        <section className="px-4 py-28">
          <div className="max-w-7xl mx-auto">
            <SectionHead kicker={text({ en: 'Stack', tr: 'Yığın' })} title={text(t.tech.heading)} sub={text(t.tech.sub)} />
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {techStack.map(t => (
                <div key={t.name} className="group p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary-500/30 hover:bg-white/[0.04] flex flex-col items-center gap-2 transition-all">
                  <div className="w-12 h-12 rounded-lg bg-white/[0.04] flex items-center justify-center">
                    <img src={t.logo} alt={t.name} className="w-7 h-7 object-contain" loading="lazy" />
                  </div>
                  <div className="text-[0.78rem] font-mono text-slate-400 group-hover:text-slate-200 transition-colors">{t.name}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ TEAM ═══════ */}
        <section id="team" className="px-4 py-28 bg-white/[0.015] border-y border-white/5">
          <div className="max-w-5xl mx-auto">
            <SectionHead kicker={text({ en: 'People', tr: 'İnsanlar' })} title={text(t.team.heading)} sub={text(t.team.sub)} />
            <div className="grid md:grid-cols-3 gap-5 items-stretch">
              {teamMembers.map((m, i) => (
                <motion.div
                  key={m.name}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: i * 0.08 }}
                  className="p-7 rounded-2xl bg-white/[0.02] border border-white/5 text-center flex flex-col items-center hover:border-primary-500/30 transition-colors"
                >
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${m.gradient} flex items-center justify-center font-display font-bold text-xl text-white shadow-soft mb-4`}>
                    {m.initials}
                  </div>
                  <h3 className="font-display text-lg font-semibold tracking-tight">{m.name}</h3>
                  <p className="text-primary-300 text-sm mt-1">{m.role}</p>
                  <p className="text-slate-400 text-xs mt-3 leading-relaxed">{m.scope}</p>
                </motion.div>
              ))}
            </div>
            <div className="text-center mt-10">
              <p className="text-slate-400 text-sm">{text(t.team.supervisor)}</p>
              <p className="text-slate-500 text-xs mt-1 font-mono">{text(t.team.year)}</p>
            </div>
          </div>
        </section>

        {/* ═══════ BIG CTA ═══════ */}
        <section className="px-4 py-28">
          <div className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0b0b1a] via-[#0a0f25] to-[#0b0b1a] border border-white/10 p-10 md:p-16 text-center">
            <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-primary-500/25 blur-3xl" />
            <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-accent-500/20 blur-3xl" />
            <div className="relative">
              <h2 className="font-display text-3xl md:text-5xl font-bold tracking-tight">{text(t.cta.heading)}</h2>
              <p className="mt-4 text-slate-400 max-w-2xl mx-auto">{text(t.cta.sub)}</p>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
                <a href="https://app.fivucsas.com" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 font-semibold shadow-glow-primary transition-all hover:-translate-y-0.5">
                  {text(t.cta.primary)}
                  <Icon name="arrow" className="w-4 h-4" />
                </a>
                <a href="https://api.fivucsas.com/swagger-ui.html" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 font-semibold transition-all hover:-translate-y-0.5">
                  {text(t.cta.ghost)}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ FOOTER ═══════ */}
        <footer className="px-4 py-12 border-t border-white/5">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.5 9.3 8 11 4.5-1.7 8-6 8-11V5l-8-3Z"/><path d="M9 12l2 2 4-4" /></svg>
              </div>
              <div className="text-sm text-slate-400">
                <span className="font-semibold text-slate-200">FIVUCSAS</span> © 2026 · {text(t.footer.rights)}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-sm text-slate-400">
              <a href="https://app.fivucsas.com" className="hover:text-white transition-colors">Dashboard</a>
              <a href="https://demo.fivucsas.com" className="hover:text-white transition-colors">Demo</a>
              <a href="https://verify.fivucsas.com" className="hover:text-white transition-colors">Widget</a>
              <a href="https://api.fivucsas.com/swagger-ui.html" className="hover:text-white transition-colors">API</a>
              <a href="https://status.fivucsas.com" className="hover:text-white transition-colors">Status</a>
              <a href="https://github.com/Rollingcat-Software/FIVUCSAS" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors inline-flex items-center gap-1.5">
                <Icon name="github" className="w-4 h-4" fill /> GitHub
              </a>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              {text(t.footer.by)} <a href="https://rollingcatsoftware.com" className="hover:text-slate-300 transition-colors">RollingCat Software</a>{text(t.footer.byEnd)}
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  Sub-components
// ────────────────────────────────────────────────────────────

function SectionHead({ kicker, title, sub, compact = false }: { kicker: string; title: string; sub?: string; compact?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      className={`text-center ${compact ? 'mb-10' : 'mb-16'}`}
    >
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-500/20 bg-primary-500/5 text-primary-300 text-xs font-mono tracking-wider uppercase mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
        {kicker}
      </span>
      <h2 className="font-display text-3xl md:text-5xl font-bold tracking-[-0.03em] leading-tight max-w-3xl mx-auto">
        {title}
      </h2>
      {sub && <p className="text-slate-400 mt-5 max-w-2xl mx-auto text-base md:text-lg leading-relaxed">{sub}</p>}
    </motion.div>
  )
}

function ArchLayer({ label, single, children }: { label: string; single?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[0.72rem] font-mono text-slate-500 uppercase tracking-[0.18em] mb-3">{label}</div>
      <div className={`grid gap-3 ${single ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'}`}>
        {children}
      </div>
    </div>
  )
}

function ArchNode({ icon, title, accent = false }: { icon: keyof typeof icons; title: string; accent?: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${accent ? 'bg-primary-500/10 border-primary-500/30' : 'bg-white/[0.03] border-white/5'} transition-colors`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${accent ? 'bg-primary-500/20 text-primary-200' : 'bg-white/5 text-slate-300'}`}>
        <Icon name={icon} className="w-4 h-4" />
      </div>
      <div className="text-[0.88rem] font-medium text-slate-200 leading-snug">{title}</div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────
//  Data
// ────────────────────────────────────────────────────────────

const techStack = [
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg',          name: 'Spring Boot' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg',        name: 'FastAPI' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg',            name: 'React' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg',          name: 'Kotlin' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg',  name: 'PostgreSQL' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg',            name: 'Redis' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg',          name: 'Docker' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/traefikproxy/traefikproxy-original.svg', name: 'Traefik' },
]

const teamMembers = [
  { initials: 'AG', name: 'Ahmet Abdullah Gültekin', role: 'Project Lead · Full-Stack',      scope: 'Architecture · Backend · Frontend · Mobile · Biometrics · ML · DevOps', gradient: 'from-primary-500 to-accent-500' },
  { initials: 'AE', name: 'Ayşe Gülsüm Eren',        role: 'Mobile & Puzzle Developer',     scope: 'Kotlin Multiplatform · Biometric Puzzles · Hand Tracking',             gradient: 'from-fuchsia-500 to-pink-500' },
  { initials: 'AA', name: 'Ayşenur Arıcı',           role: 'ML & Vision Researcher',        scope: 'YOLO Training · Liveness · Anti-Spoofing',                             gradient: 'from-emerald-500 to-teal-500' },
]
