/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0d12',
        panel: '#13161d',
        edge: '#222732',
        accent: '#5b8cff',
      },
    },
  },
  plugins: [],
};
