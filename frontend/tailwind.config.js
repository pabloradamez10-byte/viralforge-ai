/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcdaff',
          300: '#8ec2ff',
          400: '#599fff',
          500: '#3076ff',
          600: '#1d57f0',
          700: '#1845d6',
          800: '#193cad',
          900: '#1a3689',
        },
      },
    },
  },
  plugins: [],
};
