/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        coop: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        khata: {
          asset: '#0284c7',    // Blue for Assets-04
          expense: '#e11d48',  // Rose/Red for Expenses-02
          liability: '#d97706',// Amber for Liabilities 05
          income: '#059669',   // Emerald for Income-03
        }
      },
    },
  },
  plugins: [],
};
