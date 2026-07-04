/** @type {import('tailwindcss').Config} */
/*
  Os nomes de paleta (slate/teal/rose/emerald/amber) usados nas telas são
  remapeados para os tokens monocromáticos definidos em src/global.css.
  Apenas emerald (positivo) e rose (negativo) carregam cor de verdade.
  O formato rgb(var(--x) / <alpha-value>) mantém o suporte a opacidade (ex.: /20).
*/
const token = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

module.exports = {
  darkMode: 'class',
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/features/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'on-accent': token('on-accent'),
        slate: {
          950: token('bg'),
          900: token('card'),
          880: token('border'),
          850: token('border'),
          800: token('border-light'),
          500: token('text-sec'),
          400: token('text-sec'),
          300: token('text-sec'),
          200: token('text'),
          100: token('text'),
          50: token('text'),
        },
        emerald: {
          400: token('emerald'),
          500: token('emerald'),
        },
        teal: {
          400: token('text'),
          500: token('border'),
          600: token('accent'),
          650: token('accent'),
          700: token('border'),
        },
        rose: {
          300: token('rose'),
          400: token('rose'),
          500: token('rose'),
          600: token('rose'),
          900: token('border'),
          950: token('border-light'),
        },
        amber: {
          400: token('text'),
          500: token('border'),
          900: token('border'),
          950: token('border-light'),
        }
      }
    },
  },
  plugins: [],
}
