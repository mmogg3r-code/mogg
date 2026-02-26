import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#090C16',
        glass: 'rgba(255,255,255,0.08)',
        neon: '#22D3EE'
      },
      boxShadow: {
        neon: '0 0 24px rgba(34,211,238,0.35)'
      }
    }
  },
  plugins: []
};

export default config;
