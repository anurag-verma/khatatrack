/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#050505',
        card: '#121212',
        'upi-blue': '#00baf2',
        'income-green': '#22c55e',
        'expense-red': '#ef4444',
      },
    },
  },
  plugins: [],
};
