export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      navy: '#0F172A',
      emerald: '#10B981',
      slate: {
        DEFAULT: '#1E293B',
        900: '#0f172a',
      },
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      gray: '#94A3B8',
      white: '#FFFFFF',
      red: '#EF4444',
      green: '#34D399',
      amber: '#F59E0B',
      teal: '#14B8A6',
      cyan: '#06B6D4',
      gold: '#D97706',
      charcoal: '#0F172A',
      steel: '#568CA3',
      black: '#000000',
    },
    fontFamily: {
      sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
    },
    extend: {
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
