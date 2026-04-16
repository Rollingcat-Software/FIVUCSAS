import { motion, useScroll, useTransform } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

// ── Animated counter hook ──
function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const step = (now: number) => {
            const elapsed = now - start
            const progress = Math.min(elapsed / duration, 1)
            setCount(Math.floor(progress * target))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 },
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target, duration])

  return { count, ref }
}

// ── Stat card ──
function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { count, ref } = useCounter(value)
  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl md:text-5xl font-bold gradient-text mb-2">
        {count}
        {suffix}
      </div>
      <div className="text-slate-400 text-sm">{label}</div>
    </div>
  )
}

// ── Mobile menu state ──
function App() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80])

  // Close mobile menu on nav click
  const navClick = () => setMobileOpen(false)

  return (
    <div className="min-h-screen gradient-bg text-white">
      {/* ─── Skip to content (a11y) ─── */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:rounded">Skip to content</a>

      {/* ─── Navigation ─── */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-semibold">FIVUCSAS</span>
            </div>

            {/* Desktop links */}
            <div className="hidden lg:flex items-center space-x-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="text-slate-300 hover:text-white transition-colors">How It Works</a>
              <a href="#architecture" className="text-slate-300 hover:text-white transition-colors">Architecture</a>
              <a href="#team" className="text-slate-300 hover:text-white transition-colors">Team</a>
              <a href="#contact" className="text-slate-300 hover:text-white transition-colors">Contact</a>
              <a href="https://demo.fivucsas.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">Demo</a>
              <a href="https://status.fivucsas.com" target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-white transition-colors">Status</a>
              <a
                href="https://app.fivucsas.com"
                className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 transition-colors"
              >
                Admin Dashboard
              </a>
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
              onClick={() => setMobileOpen(prev => !prev)}
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden pb-4 space-y-2"
            >
              {[
                ['#features', 'Features'],
                ['#how-it-works', 'How It Works'],
                ['#architecture', 'Architecture'],
                ['#team', 'Team'],
                ['#contact', 'Contact'],
              ].map(([href, label]) => (
                <a key={href} href={href} onClick={navClick} className="block px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors">
                  {label}
                </a>
              ))}
              <a
                href="https://app.fivucsas.com"
                className="block px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-center transition-colors"
              >
                Admin Dashboard
              </a>
            </motion.div>
          )}
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section id="main" ref={heroRef} className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
        </div>

        <motion.div style={{ opacity: heroOpacity, y: heroY }} className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm mb-6">
              Marmara University - Engineering Project
            </span>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="gradient-text">Face &amp; Identity</span>
              <br />
              Verification Platform
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10">
              A multi-tenant biometric authentication SaaS platform built with modern microservices architecture.
              Secure, scalable, and production-ready.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://app.fivucsas.com"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 font-semibold transition-all shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40"
              >
                Try Admin Dashboard
              </a>
              <a
                href="https://demo.fivucsas.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 font-semibold transition-all"
              >
                Live Demo
              </a>
              <a
                href="https://github.com/Rollingcat-Software/FIVUCSAS"
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 rounded-xl bg-slate-700/20 hover:bg-slate-700/40 border border-slate-700 font-semibold transition-all text-slate-300"
              >
                View on GitHub
              </a>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Statistics ─── */}
      <section className="py-16 px-4 border-y border-slate-700/30">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard value={10} suffix="" label="Auth Methods" />
          <StatCard value={180} suffix="+" label="API Endpoints" />
          <StatCard value={1800} suffix="+" label="Tests Passing" />
          <StatCard value={6} suffix="" label="Services" />
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Core Features</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Enterprise-grade biometric authentication with comprehensive identity management
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/30 hover:bg-slate-800/70 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 group-hover:from-primary-500/30 group-hover:to-accent-500/30 flex items-center justify-center mb-4 transition-all duration-300">
                  <span className="text-2xl" role="img" aria-label={feature.iconLabel}>{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">How It Works</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Three simple steps to secure biometric authentication
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {howItWorks.map((step, index) => (
              <motion.div
                key={step.title}
                className="relative text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                {/* Step number */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-500 mx-auto mb-6 flex items-center justify-center text-2xl font-bold shadow-lg shadow-primary-500/20">
                  {index + 1}
                </div>
                {/* Connector line */}
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-px bg-gradient-to-r from-primary-500/40 to-transparent"></div>
                )}
                <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                <p className="text-slate-400">{step.description}</p>
                <div className="mt-4 text-3xl" role="img" aria-label={step.iconLabel}>{step.icon}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Demo Section ─── */}
      <section id="demo" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">See It in Action</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Explore our live admin dashboard and authentication test page
            </p>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-slate-700/50 overflow-hidden bg-slate-800/50 p-2"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            {/* Browser chrome mockup */}
            <div className="rounded-xl bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800/80 border-b border-slate-700/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/60"></div>
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-slate-700/50 rounded-md px-3 py-1 text-xs text-slate-400 text-center">
                    app.fivucsas.com
                  </div>
                </div>
              </div>
              <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center space-y-6 max-w-lg px-4">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mx-auto flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Live Admin Dashboard</h3>
                    <p className="text-slate-400 text-sm mb-6">
                      Manage tenants, users, auth flows, devices, and monitor audit logs in real-time.
                      Supports 10 different authentication methods with a multi-step auth flow builder.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <a
                      href="https://app.fivucsas.com"
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 font-medium transition-all text-sm"
                    >
                      Open Dashboard
                    </a>
                    <a
                      href="https://api.fivucsas.com/swagger-ui.html"
                      className="px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 font-medium transition-all text-sm"
                    >
                      API Documentation
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Architecture / Tech Stack ─── */}
      <section id="architecture" className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Technology Stack</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Built with modern technologies and best practices
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {techStack.map((tech, index) => (
              <motion.div
                key={tech.name}
                className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center hover:border-primary-500/20 transition-all duration-300"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.08 }}
              >
                <div className="w-14 h-14 rounded-xl mx-auto mb-3 flex items-center justify-center bg-slate-700/50 group-hover:bg-slate-700/80 transition-colors duration-300">
                  <img src={tech.logo} alt={tech.name} className="w-8 h-8 object-contain" loading="lazy" />
                </div>
                <h3 className="font-semibold mb-1">{tech.name}</h3>
                <p className="text-sm text-slate-400">{tech.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Services Section ─── */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Microservices</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Hexagonal architecture with clear separation of concerns
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.name}
                className="p-8 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50 hover:border-primary-500/20 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl" role="img" aria-label={service.iconLabel}>{service.icon}</span>
                  <h3 className="text-xl font-semibold">{service.name}</h3>
                </div>
                <p className="text-slate-400 mb-4">{service.description}</p>
                <div className="flex flex-wrap gap-2">
                  {service.tech.map(t => (
                    <span key={t} className="px-3 py-1 rounded-full bg-slate-700/50 text-xs text-slate-300">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Team Section ─── */}
      <section id="team" className="py-20 px-4 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Project Team</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Marmara University - Computer Engineering Department
            </p>
          </motion.div>

          {/* Team Members */}
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {teamMembers.map((member, index) => (
              <motion.div
                key={member.name}
                className={`p-8 rounded-2xl text-center ${
                  member.lead
                    ? 'bg-slate-800/50 border border-primary-500/20'
                    : 'bg-slate-800/50 border border-slate-700/50'
                }`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center ${
                    member.lead
                      ? 'bg-gradient-to-br from-primary-500 to-accent-500'
                      : 'bg-gradient-to-br from-slate-700 to-slate-600'
                  }`}
                >
                  <span className="text-3xl font-bold">{member.initials}</span>
                </div>
                <h3 className="text-xl font-semibold">{member.name}</h3>
                <p className="text-primary-400 text-sm mt-1">{member.role}</p>
                <p className="text-slate-500 text-xs mt-3">{member.scope}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-slate-400">
              <strong>Supervisor:</strong> Assoc. Prof. Dr. Mustafa Ağaoğlu
            </p>
            <p className="text-sm text-slate-500 mt-2">
              CSE4297/CSE4197 Engineering Project - 2025-2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* ─── Contact Section ─── */}
      <section id="contact" className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold mb-4">Get in Touch</h2>
            <p className="text-slate-400 mb-10">
              Interested in the project or want to learn more? Reach out through any of these channels.
            </p>
          </motion.div>

          <motion.div
            className="grid sm:grid-cols-3 gap-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <a
              href="https://github.com/Rollingcat-Software/FIVUCSAS"
              className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/30 transition-all duration-300 group"
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-slate-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <div className="font-medium text-sm">GitHub</div>
              <div className="text-xs text-slate-500 mt-1">Source Code</div>
            </a>
            <a
              href="https://api.fivucsas.com/swagger-ui.html"
              className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/30 transition-all duration-300 group"
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="font-medium text-sm">API Docs</div>
              <div className="text-xs text-slate-500 mt-1">Swagger UI</div>
            </a>
            <a
              href="mailto:rollingcat.help@gmail.com"
              className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/30 transition-all duration-300 group"
            >
              <svg className="w-8 h-8 mx-auto mb-3 text-slate-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <div className="font-medium text-sm">Email</div>
              <div className="text-xs text-slate-500 mt-1">Get in Touch</div>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="py-12 px-4 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-semibold">FIVUCSAS</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="https://app.fivucsas.com" className="hover:text-white transition-colors">Dashboard</a>
              <a href="https://demo.fivucsas.com" className="hover:text-white transition-colors">Demo</a>
              <a href="https://status.fivucsas.com" className="hover:text-white transition-colors">Status</a>
              <a href="https://api.fivucsas.com/swagger-ui.html" className="hover:text-white transition-colors">API Docs</a>
              <a href="https://github.com/Rollingcat-Software/FIVUCSAS" className="hover:text-white transition-colors">GitHub</a>
            </div>

            <p className="text-sm text-slate-500">
              2026 FIVUCSAS. Marmara University.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

// ── Data ──

const features = [
  {
    icon: '\u{1F510}',
    iconLabel: 'Locked padlock',
    title: 'Biometric Authentication',
    description: 'Advanced face recognition with liveness detection and anti-spoofing measures.',
  },
  {
    icon: '\u{1F3E2}',
    iconLabel: 'Office building',
    title: 'Multi-Tenant Architecture',
    description: 'Isolated data and configurations per tenant with row-level security.',
  },
  {
    icon: '\u{1F465}',
    iconLabel: 'People',
    title: 'User Management',
    description: 'Comprehensive user lifecycle management with RBAC permissions.',
  },
  {
    icon: '\u{1F4CA}',
    iconLabel: 'Bar chart',
    title: 'Audit Logging',
    description: 'Complete audit trail for compliance and security monitoring.',
  },
  {
    icon: '\u{1F511}',
    iconLabel: 'Key',
    title: 'JWT Authentication',
    description: 'Secure token-based authentication with refresh token rotation.',
  },
  {
    icon: '\u{1F4F1}',
    iconLabel: 'Mobile phone',
    title: 'Cross-Platform SDKs',
    description: 'Native support for Android, iOS, and Desktop applications.',
  },
]

const howItWorks = [
  {
    title: 'Register',
    description: 'Create a tenant account and configure your authentication flow with the methods you need.',
    icon: '\u{1F4DD}',
    iconLabel: 'Memo',
  },
  {
    title: 'Enroll Biometric',
    description: 'Users enroll their face, voice, or other biometric data through secure capture.',
    icon: '\u{1F9D1}',
    iconLabel: 'Person',
  },
  {
    title: 'Authenticate',
    description: 'Verify identity in real-time using multi-step flows combining any of 10 auth methods.',
    icon: '\u{2705}',
    iconLabel: 'Check mark',
  },
]

const techStack = [
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg', name: 'Spring Boot', description: 'Identity Core API' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/fastapi/fastapi-original.svg', name: 'FastAPI', description: 'Biometric Processor' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg', name: 'React', description: 'Admin Dashboard' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kotlin/kotlin-original.svg', name: 'Kotlin', description: 'Mobile/Desktop Apps' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg', name: 'PostgreSQL', description: 'Primary Database' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/redis/redis-original.svg', name: 'Redis', description: 'Cache & Queue' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg', name: 'Docker', description: 'Containerization' },
  { logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/traefikproxy/traefikproxy-original.svg', name: 'Traefik', description: 'API Gateway + TLS' },
]

const services = [
  {
    icon: '\u{1F510}',
    iconLabel: 'Locked padlock',
    name: 'Identity Core API',
    description: 'Central authentication and identity management service handling users, tenants, and permissions.',
    tech: ['Spring Boot 3.4.7', 'Java 21', 'PostgreSQL', 'Redis'],
  },
  {
    icon: '\u{1F441}\uFE0F',
    iconLabel: 'Eye',
    name: 'Biometric Processor',
    description: 'ML-powered face recognition engine with 46+ endpoints for enrollment, verification, and analysis.',
    tech: ['FastAPI', 'Python 3.12', 'InsightFace', 'pgvector'],
  },
  {
    icon: '\u{1F5A5}\uFE0F',
    iconLabel: 'Desktop computer',
    name: 'Admin Dashboard',
    description: 'Feature-rich web application for tenant administrators to manage users and monitor activity.',
    tech: ['React 18', 'TypeScript', 'MUI', 'Redux Toolkit'],
  },
]

const teamMembers = [
  {
    lead: true,
    initials: 'AG',
    name: 'Ahmet Abdullah Gültekin',
    role: 'Project Lead & Full-Stack Engineer',
    scope: 'Architecture · Backend · Frontend · Face · Voice · MRZ · DevOps',
  },
  {
    lead: false,
    initials: 'AE',
    name: 'Ayşe Gülsüm Eren',
    role: 'Mobile & Biometric Puzzle Developer',
    scope: 'Kotlin Multiplatform · Hand & Finger Tracking · Biometric Puzzles',
  },
  {
    lead: false,
    initials: 'AA',
    name: 'Ayşenur Arıcı',
    role: 'Computer Vision & ML Research',
    scope: 'YOLO Card Detector · Liveness · Anti-Spoofing · Model Training',
  },
]

export default App
