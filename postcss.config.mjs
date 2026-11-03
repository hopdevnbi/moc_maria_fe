// Tailwind v4 must run as a PostCSS plugin in production Webpack builds.
// The existing @tailwindcss/turbopack loader alone does not generate utilities for Webpack.
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
