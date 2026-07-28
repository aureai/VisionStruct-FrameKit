/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark PixelFold system (default)
        ink: '#0a0f0d',
        paper: '#eef5f1',
        'ink-soft': '#91a59a',
        mist: '#16201b',
        leaf: '#3dcc8c',
        'leaf-deep': '#2a9d6f',
        gold: '#e8a14a',
        accent: '#3dcc8c',
        // Solid dark elevated surface (not translucent — avoids washed-out light glass)
        panel: '#141f1a',
        edge: '#2a3830',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Outfit', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        panel: '22px',
      },
      boxShadow: {
        // Named "elevated" — avoid "panel" which collides with Tailwind shadow-{color}
        elevated: '0 24px 60px rgba(0, 0, 0, 0.55)',
      },
    },
  },
  plugins: [],
};
