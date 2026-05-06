# FIVUCSAS Landing Website

![React](https://img.shields.io/badge/React-18-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Vite](https://img.shields.io/badge/Vite-6-purple.svg)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Overview

Marketing landing page served at [`fivucsas.com`](https://fivucsas.com). Single-page React + Tailwind site with framer-motion scroll animations, animated counters, and a hero / features / footer layout.

This is **not** the admin dashboard (`app.fivucsas.com`, see `web-app/`) and **not** the hosted login (`verify.fivucsas.com`, also `web-app/`). This is the public-facing brochure site only.

## Stack

- React 18 + TypeScript 5
- Vite 6 (build + dev server)
- Tailwind CSS 3
- framer-motion (scroll-driven animations)

## Local Development

```bash
cd landing-website
npm install
npm run dev
```

Vite dev server starts on `http://localhost:5173` by default.

## Build

```bash
npm run build
```

Outputs static assets to `landing-website/dist/`. Served as plain HTML/CSS/JS — no SSR, no Node runtime required at the edge.

## Deploy

Continuous deploy to Hostinger via `.github/workflows/deploy-landing.yml` in the parent repo. The workflow builds `dist/` and rsyncs it to Hostinger over SSH on every push to `main` that touches `landing-website/`.

For an emergency manual deploy, build locally and rsync `dist/` to the same Hostinger target documented in the workflow.

## Folder Structure

```
landing-website/
├── index.html              # Vite entry HTML
├── public/
│   └── favicon.svg         # static assets copied verbatim into dist/
├── src/
│   ├── main.tsx            # React root
│   ├── App.tsx             # all sections inline (Hero, Features, Stats, Footer)
│   └── index.css           # Tailwind directives + custom CSS
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── package.json
```

## Where to Edit Content

All copy lives in `src/App.tsx`:

- **Hero section** — search for `{/* ─── Hero Section ─── */}`
- **Features grid** — `{/* ─── Features Section ─── */}` plus the `features` array near the top of the component
- **Stats / counters** — `StatCard` instances inside the stats section
- **Footer** — `{/* ─── Footer ─── */}`

Site-wide styles (gradient-text, custom utilities) live in `src/index.css`. Theme colors are configured in `tailwind.config.js`.

## License

MIT — see [LICENSE](./LICENSE) at repo root.
