// src/config/hero.config.js

export const heroConfig = {
  // 1. ASSETS
  assets: {
    // bgImage: "/images/GoldenTemple.png", // <--- Change your image path here
    bgImage: "/images/GoldenTemple.png",
    logo: "/images/new.png",
    noisePattern: "data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E",
  },

  // 2. COLORS (The "Brain" for Styles)
  // We use these here for inline styles if needed, 
  // but mostly we will map these in tailwind.config.js
  colors: {
    primary: "#0b1720",   // Dark Navy Background
    accent: "#FFD050",    // Gold Highlight
    text: "#ffffff",      // White Text
  },

  // 3. TEXT CONTENT
  content: {
    badge: "Est. 2023 • Tamil Nadu",
    titleLine1: "Every Site Holds a Story,",
    titleLine2: "Every Story Needs a Seeker.",
    subtitle: "Transforming archaeology from an academic study into an interactive and meaningful experience for everyone.",
    primaryButton: "Explore Our Trails",
    secondaryButton: "View Seminars",
  },

  // 4. ANIMATION SETTINGS
  animation: {
    scrollSpeedBg: 0.4,   // How fast the background moves
    scrollSpeedText: 0.1, // How fast the text moves
  }
};