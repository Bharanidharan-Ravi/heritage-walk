/** @type {import('tailwindcss').Config} */

// tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // We define a dedicated "hero" namespace in colors
      colors: {
        hero: {
          bg: "#0b1720",      // Matches config.primary
          accent: "#FFD050",  // Matches config.accent
          text: "#ffffff",    // Matches config.text
          overlay: "rgba(11, 23, 32, 0.5)", // Semi-transparent version of bg
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
      // Custom Animation for the text fade-in
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in-up': 'fadeInUp 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      },
    },
  },
  plugins: [],
}


// export default {
//     darkMode: "class", // ⭐ enable dark mode (manual class-based)

//     content: [
//         "./index.html",
//         "./src/**/*.{js,jsx,ts,tsx}",
//     ],

//     theme: {
//         extend: {
//             colors: {
//                 "primary-blue": { DEFAULT: "#12314a" },
//                 // and
//                 primaryBlue: { DEFAULT: "#12314a" },
//                 primaryCream: {
//                     DEFAULT: "#6b4a2f",
//                 },
//                 "primary-cream": {
//                     DEFAULT: "#6b4a2f",
//                 },
//                 accentGold: {
//                     DEFAULT: "#caa863",
//                 },
//                 "accent-gold": {
//                     DEFAULT: "#caa863",
//                 },
//                 accentBrown: {
//                     DEFAULT: "#a57c44",
//                 },
//                 "accent-brown": {
//                     DEFAULT: "#a57c44",
//                 },
//                 paperBg: {
//                     DEFAULT: "#f6f2ea",
//                 },
//                 "paper-bg": {
//                     DEFAULT: "#f6f2ea",
//                 },
//                 creamBg: {
//                     DEFAULT: "#fbf7ef",
//                 },
//                 "cream-bg": {
//                     DEFAULT: "#fbf7ef",
//                 },

//                 // dark
//                 darkBg: { DEFAULT: "#0f1214" },
//                 "dark-bg": { DEFAULT: "#0f1214" },
//                 darkCard: { DEFAULT: "#1a1f23" },
//                 "dark-card": { DEFAULT: "#1a1f23" },
//                 darkText: { DEFAULT: "#d6d9dc" },
//                 "dark-text": { DEFAULT: "#d6d9dc" },
//                 darkPrimary: { DEFAULT: "#0c1e2e" },
//                 "dark-primary": { DEFAULT: "#0c1e2e" }
//             },

//             fontFamily: {
//                 serif: ["Georgia", "serif"],
//             },

//             container: {
//                 center: true,
//                 padding: "1.5rem",
//             },

//             keyframes: {
//                 fadeUp: {
//                     "0%": { opacity: 0, transform: "translateY(20px)" },
//                     "100%": { opacity: 1, transform: "translateY(0)" },
//                 },
//                 zoomIn: {
//                     "0%": { opacity: 0, transform: "scale(0.96)" },
//                     "100%": { opacity: 1, transform: "scale(1)" },
//                 },
//             },

//             animation: {
//                 fadeUp: "fadeUp 0.7s ease-out forwards",
//                 zoomIn: "zoomIn 0.6s ease-out forwards",
//             },
//         },
//     },

//     plugins: [],
// };
