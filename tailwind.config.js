/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#050505',
          900: '#0D0D0D',
          800: '#222222',
          700: '#2E2E2E',
          600: '#3A3A3A',
          500: '#5A5A5A',
          400: '#8E8E93',
          300: '#C7C7CC',
          200: '#E5E5EA',
          100: '#F2F2F7',
          50: '#FFFFFF',
        },
        zinc: {
          950: '#050505',
          900: '#0D0D0D',
          800: '#222222',
          700: '#2E2E2E',
          600: '#3A3A3A',
          500: '#5A5A5A',
          400: '#8E8E93',
        },
        neutral: {
          950: '#050505',
          900: '#0D0D0D',
          800: '#222222',
          700: '#2E2E2E',
          600: '#3A3A3A',
          500: '#5A5A5A',
          400: '#8E8E93',
        },
        gray: {
          950: '#050505',
          900: '#0D0D0D',
          800: '#222222',
          700: '#2E2E2E',
          600: '#3A3A3A',
          500: '#5A5A5A',
          400: '#8E8E93',
        },
        dark: {
          950: '#000000',
          900: '#000000',
          850: '#0A0A0A',
          800: '#121212',
          750: '#161616',
          700: '#1A1A1A',
          600: '#222222',
          500: '#2C2C2C',
          400: '#383838'
        },
        brand: {
          yellow: '#FFDF00',
          cyan: '#00F2FE',
          purple: '#8B5CF6',
          pink: '#EC4899',
          green: '#10B981',
          orange: '#F97316'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 20px -3px rgba(0, 242, 254, 0.25)',
        'glow-purple': '0 0 20px -3px rgba(139, 92, 246, 0.25)',
        'glow-yellow': '0 0 20px -3px rgba(255, 223, 0, 0.25)',
        'glow-green': '0 0 20px -3px rgba(16, 185, 129, 0.25)',
      },
      keyframes: {
        fadeInScale: {
          '0%': { opacity: '0', transform: 'scale(0.985) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleUp: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeInScale 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        slideDown: 'slideDown 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        scaleUp: 'scaleUp 0.38s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }
    },
  },
  plugins: [],
}
