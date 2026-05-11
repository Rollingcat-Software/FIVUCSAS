# FIVUCSAS — Face and Identity Verification Using Cloud-based SaaS — Landing Website

Official landing page for **FIVUCSAS** (Face and Identity Verification Using Cloud-based SaaS), a multi-tenant biometric authentication platform.

**Live**: [fivucsas.com](https://fivucsas.com)

## Tech Stack

- React 18 + TypeScript
- Tailwind CSS 3
- Framer Motion (animations)
- Vite 6

## Development

```bash
npm install
npm run dev
```

## Build & Deploy

```bash
npm run build
```

Output is written to `dist/`. Deploy this folder to your web server.

## SEO

This is a Vite + React SPA, so the production HTML payload at `dist/index.html` does not contain any React-rendered content. Crawlers that don't execute JavaScript (Bingbot, social-card scrapers, some legacy bots) only see what's literally in `index.html`. To stay crawlable we keep three things directly in `index.html`:

1. **A static `<h1>`** in `<body>` outside `#root`, visually hidden via the `sr-only` pattern (inline `clip: rect(0,0,0,0)` etc.). Screen readers still announce it; sighted users see the animated React hero instead.
2. **Three JSON-LD blocks** — `Organization`, `WebSite`, and `SoftwareApplication` — with `alternateName: "Face and Identity Verification Using Cloud-based SaaS"` so search engines associate the brand token with its expansion.
3. **Trimmed meta description** (≤160 chars) leading with `FIVUCSAS — Face and Identity Verification Using Cloud-based SaaS`. Don't let descriptions creep beyond ~160 chars — Bing truncates and flags them.

Sitemap + robots live in `public/` and get copied to `dist/` by Vite. When adding a new public surface (subdomain, marketing page), add a `<url>` entry to `public/sitemap.xml` and rebuild.

## License

MIT — See parent [FIVUCSAS](https://github.com/Rollingcat-Software/FIVUCSAS) repo.
