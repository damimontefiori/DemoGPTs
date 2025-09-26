/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ai-blue': '#2E86AB',
        'ai-purple': '#A23B72', 
        'ai-orange': '#F18F01',
        'ai-green': '#C73E1D'
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'typing': 'typing 2s steps(40) infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        typing: {
          '0%, 50%': { borderColor: 'transparent' },
          '51%, 100%': { borderColor: '#2E86AB' }
        }
      }
    },
  },
  plugins: [],
}