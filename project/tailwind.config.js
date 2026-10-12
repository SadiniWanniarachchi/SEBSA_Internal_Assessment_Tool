/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // SEBSA brand colours — update with actual brand guidelines
      colors: {
        brand: {
          primary: "#5c4cf4",      // Stitch vibrant purple
          primaryDark: "#4a3bd9",
          primaryLight: "#f4f2ff",
          purpleBadge: "#7c3aed",
          accent: "#6366f1",
          muted: "#6B7280",
        },
      },
      boxShadow: {
        glossy: "0 20px 40px -15px rgba(92, 76, 244, 0.1), 0 0 20px -2px rgba(92, 76, 244, 0.05)",
        card: "0 10px 30px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(92, 76, 244, 0.05)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
