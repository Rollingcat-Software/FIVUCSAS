import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// The FIVUCSAS Book — docs.fivucsas.com
// Static guide chapters (with inline Mermaid) + Reference (API refs + diagram gallery,
// served verbatim from public/). English-first v1; TR is a follow-up.
export default withMermaid(
  defineConfig({
    title: 'FIVUCSAS',
    description:
      'Face & Identity Verification using Cloud-based SaaS — architecture, auth, biometrics, security & integration docs.',
    lang: 'en-US',
    cleanUrls: true,
    ignoreDeadLinks: true, // the API-ref dirs + gallery live in public/, not as VitePress routes
    head: [
      ['link', { rel: 'icon', href: '/favicon.svg' }],
      // Shared FIVUCSAS suite launcher (cross-site app switcher + global EN/TR toggle).
      // Auto-injects its UI; restores docs parity with the rest of the suite.
      ['script', { src: 'https://app.fivucsas.com/launcher.js?v=2026-06-03', defer: '' }],
    ],
    themeConfig: {
      logo: '/favicon.svg',
      nav: [
        { text: 'Guide', link: '/guide/overview' },
        {
          text: 'API Reference',
          items: [
            { text: 'Identity Core API', link: '/identity/', target: '_blank' },
            { text: 'Biometric Processor API', link: '/biometric/', target: '_blank' },
            { text: 'Widget SDK', link: '/sdk/', target: '_blank' },
          ],
        },
        { text: 'Diagram Gallery', link: '/diagrams.html', target: '_blank' },
        {
          text: 'Live',
          items: [
            { text: 'Landing — fivucsas.com', link: 'https://fivucsas.com' },
            { text: 'Hosted login — verify', link: 'https://verify.fivucsas.com' },
            { text: 'Status', link: 'https://status.fivucsas.com' },
          ],
        },
      ],
      sidebar: {
        '/guide/': [
          {
            text: 'Introduction',
            items: [
              { text: 'Overview', link: '/guide/overview' },
              { text: 'Architecture', link: '/guide/architecture' },
            ],
          },
          {
            text: 'Platform',
            items: [
              { text: 'Authentication & OIDC', link: '/guide/authentication' },
              { text: 'Biometrics & Liveness', link: '/guide/biometrics' },
              { text: 'Multi-Tenancy & Flows', link: '/guide/multi-tenancy' },
            ],
          },
          {
            text: 'Trust',
            items: [
              { text: 'Security & Threat Model', link: '/guide/security' },
              { text: 'Data Model & Compliance', link: '/guide/data-compliance' },
            ],
          },
          {
            text: 'Build & Run',
            items: [
              { text: 'Integrate', link: '/guide/integrate' },
              { text: 'Operations', link: '/guide/operations' },
            ],
          },
          {
            text: 'Reference',
            items: [
              { text: 'API & Gallery', link: '/reference/' },
            ],
          },
        ],
        '/reference/': [
          {
            text: 'Reference',
            items: [
              { text: 'API & Gallery', link: '/reference/' },
              { text: 'Identity Core API ↗', link: '/identity/', target: '_blank' },
              { text: 'Biometric Processor API ↗', link: '/biometric/', target: '_blank' },
              { text: 'Widget SDK ↗', link: '/sdk/', target: '_blank' },
              { text: 'Diagram Gallery ↗', link: '/diagrams.html', target: '_blank' },
            ],
          },
        ],
      },
      socialLinks: [
        { icon: 'github', link: 'https://github.com/Rollingcat-Software' },
      ],
      search: { provider: 'local' },
      footer: {
        message:
          'FIVUCSAS — Marmara University CSE4297/CSE4298 graduation project. MIT-licensed.',
        copyright: 'Production-deployed multi-tenant biometric identity SaaS.',
      },
      outline: { level: [2, 3] },
    },
    mermaid: { theme: 'dark' },
  })
)
