/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        accent: {
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        trust: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        // custom canvas tokens
        canvas: {
          DEFAULT: '#070713',
          sub: '#0c0c1a',
          card: '#11112099',
          border: '#1e1e2f',
          borderStrong: '#2e2e44',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 10px 40px rgba(99, 102, 241, 0.35)',
        'glow-accent': '0 10px 40px rgba(139, 92, 246, 0.35)',
        'soft': '0 8px 32px rgba(0, 0, 0, 0.25)',
      },
      backgroundImage: {
        'grid-slate': "linear-gradient(rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.05) 1px, transparent 1px)",
        'radial-primary': "radial-gradient(circle at center, rgba(99,102,241,0.2) 0%, transparent 60%)",
      },
      animation: {
        'pulse-slow': 'pulse-slow 6s ease-in-out infinite',
        'float': 'float 8s ease-in-out infinite',
        'scan': 'scan 2.4s ease-in-out infinite',
        'shimmer': 'shimmer 3s linear infinite',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '0.55', transform: 'scale(1)' },
          '50%': { opacity: '0.95', transform: 'scale(1.08)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-110%)' },
          '50%': { transform: 'translateY(110%)' },
          '100%': { transform: 'translateY(-110%)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
