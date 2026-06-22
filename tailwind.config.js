/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FAF7F2',
          100: '#F3EDE4',
          200: '#E6DED3',
          300: '#D5C9BC',
          400: '#B0A090',
          500: '#1C1C1C',
          600: '#1C1C1C',
          700: '#2A221A',
          800: '#3D342C',
          900: '#1C1C1C',
          950: '#0E0E0E',
        },
        navy: {
          50: '#FAF7F2',
          100: '#F3EDE4',
          200: '#E6DED3',
          300: '#D5C9BC',
          400: '#B0A090',
          500: '#7A6F66',
          600: '#5C5248',
          700: '#3D342C',
          800: '#2A221A',
          900: '#1C1C1C',
          950: '#0E0E0E',
        },
        surface: {
          50: '#FAF7F2',
          100: '#F3EDE4',
          200: '#E6DED3',
          300: '#D5C9BC',
          400: '#B0A090',
          500: '#7A6F66',
          600: '#5C5248',
          700: '#3D342C',
          800: '#2A221A',
          900: '#1C1C1C',
          950: '#0E0E0E',
        },
        accent: {
          DEFAULT: '#C9A24D',
          light: '#F0E4C4',
          dark: '#8B6E2A',
        },
        success: { DEFAULT: '#10B981', light: '#D1FAE5', dark: '#065F46' },
        warning: { DEFAULT: '#F59E0B', light: '#FEF3C7', dark: '#92400E' },
        danger: { DEFAULT: '#EF4444', light: '#FEE2E2', dark: '#991B1B' },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(201, 162, 77, 0.2)',
        'glow-lg': '0 0 40px -10px rgba(201, 162, 77, 0.25)',
        'card': '0 1px 3px rgba(28,28,28,0.04), 0 4px 12px rgba(28,28,28,0.05)',
        'card-hover': '0 4px 16px rgba(28,28,28,0.07), 0 8px 32px rgba(28,28,28,0.05)',
        'elevated': '0 8px 30px rgba(28,28,28,0.07), 0 2px 8px rgba(28,28,28,0.04)',
        'float': '0 20px 60px rgba(28,28,28,0.09), 0 4px 16px rgba(28,28,28,0.05)',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'bounce-in': 'bounceIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceIn: {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
