/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"BigStage"', 'Georgia', 'serif'],
        body: ['"TTSquares"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        auction: {
          gold: '#3A86FF',
          'gold-light': '#6AA3FF',
          'gold-dark': '#1A66DF',
          dark: '#FFFFFF',
          surface: '#F5F5F5',
          card: '#FFFFFF',
          border: '#E5E5E5',
          muted: '#6B7280',
          text: '#111111',
        },
      },
      animation: {
        'bid-flash': 'bidFlash 0.6s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s infinite',
      },
      keyframes: {
        bidFlash: {
          '0%': { backgroundColor: 'rgba(201,168,76,0.3)' },
          '100%': { backgroundColor: 'transparent' },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(201,168,76,0)' },
        }
      }
    }
  },
  plugins: []
}

