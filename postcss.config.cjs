// Same pipeline as the product (Storico uses @tailwindcss/postcss), so the
// copied globals.css compiles to the same output here.
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
