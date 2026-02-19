import { motion } from 'framer-motion'

function App() {
  return (
    <div className="min-h-screen gradient-bg text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <span className="text-xl font-semibold">FIVUCSAS</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">Features</a>
              <a href="#architecture" className="text-slate-300 hover:text-white transition-colors">Architecture</a>
              <a href="#team" className="text-slate-300 hover:text-white transition-colors">Team</a>
              <a
                href="https://ica-fivucsas.rollingcatsoftware.com"
                className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 transition-colors"
              >
                Admin Dashboard
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-2 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm mb-6">
              Marmara University - Engineering Project
            </span>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="gradient-text">Face & Identity</span>
              <br />
              Verification Platform
            </h1>

            <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-10">
              A multi-tenant biometric authentication SaaS platform built with modern microservices architecture.
              Secure, scalable, and production-ready.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://ica-fivucsas.rollingcatsoftware.com"
                className="px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 font-semibold transition-all shadow-lg shadow-primary-500/25"
              >
                Try Admin Dashboard
              </a>
              <a
                href="https://github.com/Rollingcat-Software/FIVUCSAS"
                className="px-8 py-4 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 border border-slate-600 font-semibold transition-all"
              >
                View on GitHub
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
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
                className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-primary-500/30 transition-all"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture Section */}
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
                className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="text-4xl mb-3">{tech.icon}</div>
                <h3 className="font-semibold mb-1">{tech.name}</h3>
                <p className="text-sm text-slate-400">{tech.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
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
                className="p-8 rounded-2xl bg-gradient-to-br from-slate-800/80 to-slate-800/40 border border-slate-700/50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{service.icon}</span>
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

      {/* Team Section */}
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

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {team.map((member, index) => (
              <motion.div
                key={member.name}
                className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 mx-auto mb-4 flex items-center justify-center">
                  <span className="text-2xl font-bold">{member.initials}</span>
                </div>
                <h3 className="font-semibold">{member.name}</h3>
                <p className="text-sm text-slate-400">{member.role}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="mt-12 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <p className="text-slate-400">
              <strong>Supervisor:</strong> Prof. Dr. Advisor Name
            </p>
            <p className="text-sm text-slate-500 mt-2">
              CSE4297/CSE4197 Engineering Project - 2025-2026
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
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
              <a href="https://ica-fivucsas.rollingcatsoftware.com" className="hover:text-white transition-colors">
                Admin Dashboard
              </a>
              <a href="https://github.com/Rollingcat-Software/FIVUCSAS" className="hover:text-white transition-colors">
                GitHub
              </a>
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

const features = [
  {
    icon: '🔐',
    title: 'Biometric Authentication',
    description: 'Advanced face recognition with liveness detection and anti-spoofing measures.',
  },
  {
    icon: '🏢',
    title: 'Multi-Tenant Architecture',
    description: 'Isolated data and configurations per tenant with row-level security.',
  },
  {
    icon: '👥',
    title: 'User Management',
    description: 'Comprehensive user lifecycle management with RBAC permissions.',
  },
  {
    icon: '📊',
    title: 'Audit Logging',
    description: 'Complete audit trail for compliance and security monitoring.',
  },
  {
    icon: '🔑',
    title: 'JWT Authentication',
    description: 'Secure token-based authentication with refresh token rotation.',
  },
  {
    icon: '📱',
    title: 'Cross-Platform SDKs',
    description: 'Native support for Android, iOS, and Desktop applications.',
  },
]

const techStack = [
  { icon: '☕', name: 'Spring Boot', description: 'Identity Core API' },
  { icon: '🐍', name: 'FastAPI', description: 'Biometric Processor' },
  { icon: '⚛️', name: 'React', description: 'Admin Dashboard' },
  { icon: '🎯', name: 'Kotlin', description: 'Mobile/Desktop Apps' },
  { icon: '🐘', name: 'PostgreSQL', description: 'Primary Database' },
  { icon: '🔴', name: 'Redis', description: 'Cache & Queue' },
  { icon: '🐳', name: 'Docker', description: 'Containerization' },
  { icon: '☁️', name: 'GCP', description: 'Cloud Platform' },
]

const services = [
  {
    icon: '🔐',
    name: 'Identity Core API',
    description: 'Central authentication and identity management service handling users, tenants, and permissions.',
    tech: ['Spring Boot 3.2', 'Java 21', 'PostgreSQL', 'Redis'],
  },
  {
    icon: '👁️',
    name: 'Biometric Processor',
    description: 'ML-powered face recognition engine with 46+ endpoints for enrollment, verification, and analysis.',
    tech: ['FastAPI', 'Python 3.11', 'InsightFace', 'pgvector'],
  },
  {
    icon: '🖥️',
    name: 'Admin Dashboard',
    description: 'Feature-rich web application for tenant administrators to manage users and monitor activity.',
    tech: ['React 18', 'TypeScript', 'MUI', 'Redux Toolkit'],
  },
]

const team = [
  { name: 'Student 1', initials: 'S1', role: 'Backend Developer' },
  { name: 'Student 2', initials: 'S2', role: 'ML Engineer' },
  { name: 'Student 3', initials: 'S3', role: 'Frontend Developer' },
  { name: 'Student 4', initials: 'S4', role: 'DevOps Engineer' },
]

export default App
