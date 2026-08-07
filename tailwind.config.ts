import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Dark base: paper is the page background, ink is the near-white foreground/text
        // color (also used as the solid "filled" surface for primary buttons — see
        // Button.tsx, which pairs bg-ink with text-paper, not text-white, precisely because
        // ink is light in this theme).
        ink: '#f2f4f4',
        paper: '#090e0f',
        mist: '#141b1d',
        line: '#232b2d',
        muted: '#98a1a3',
        accent: '#f2f4f4',
        danger: '#ff6b6b',
        success: '#3ddc84',
        // Accent palette — used for gradient "cover art" tiles and small chips, never as a
        // page background. Keeps the shell black-and-white/minimal while content reads colorful.
        coral: '#FF6B4A',
        violet: '#8B5CF6',
        teal: '#14B8A6',
        gold: '#F5B942',
        bubblegum: '#EC4899',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      maxWidth: {
        content: '1120px',
      },
    },
  },
  plugins: [],
};

export default config;
