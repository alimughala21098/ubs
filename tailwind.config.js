/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F172A',
        surface: '#1A1A1A',
        surface2: '#1E1E1E',
        border: '#333333',
        accent: {
          DEFAULT: '#2563EB',
          light: '#29A7F2'
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        muted: '#9A9A9A'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        xl: '14px',
        '2xl': '20px'
      },
      boxShadow: {
        panel: '0 1px 0 rgba(255,255,255,0.03), 0 8px 24px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};
