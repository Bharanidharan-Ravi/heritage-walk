// src/config/about.config.js

export const aboutConfig = {
  // 1. THEME: "Museum & Excavation" Palette
  theme: {
    background: "#F4F1EA",       // Warm Alabaster (Stone)
    textColor: "#0F161E",        // Deep Earthen Charcoal
    cardBackground: "#FFFFFF",   // Pure White (for main cards)
    accentColor: "#C19D60",      // Antique Bronze
    darkCard: "#1A202C",         // Dark Slate (for contrast cards)
    secondaryBg: "#E8E4D9",      // Darker Stone/Beige
  },

  // 2. TEXT CONTENT
  content: {
    badge: "WHO WE ARE",
    titleLine1: "Bridging the gap between",
    titleLine2: "textbooks & the terrain.",
    
    // Main large card
    missionTitle: "History Beyond Textbooks",
    missionText: "Archaeo Trails was born from a realization: there is a lack of hands-on opportunities to truly know our cultural past. We transform history from a static academic study into an interactive, field-based experience.",
    
    // Vision card
    visionTitle: "Our Vision",
    visionText: "To extend the reach of our culture beyond academic institutions and nurture the next generation of heritage custodians.",
    visionQuote: "\"Every Story Needs a Seeker.\"",
    
    footerQuote: "\"We aspire to preserve and promote cultural heritage by inspiring curiosity, encouraging authentic learning, and nurturing the next generation.\"",
    footerButton: "Join Our Next Trail",
  },

  // 3. FEATURES (The 3 Curated Boxes)
  // Each feature now has a 'style' object to define its unique look
  features: [
    {
      id: 1,
      title: "Field Visits",
      description: "Structured study visits for schools and colleges, focusing on site-based learning and excavation methods.",
      iconPath: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064",
      // STYLE: White Card with Bronze Accents
      style: {
        bg: "#FFFFFF",
        text: "#0F161E",
        border: "#C19D60", // Bronze border
        iconBg: "#C19D60",
        iconColor: "#FFFFFF"
      }
    },
    {
      id: 2,
      title: "Workshops",
      description: "Hands-on training in epigraphy, ceramics, and conservation to promote practical skills.",
      iconPath: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
      // STYLE: Dark Slate Card (High Contrast)
      style: {
        bg: "#1A202C",
        text: "#FFFFFF",
        border: "transparent",
        iconBg: "transparent", // Outline icon style
        iconColor: "#C19D60",
        iconBorder: "#C19D60" 
      }
    },
    {
      id: 3,
      title: "Seminars",
      description: "Academic sessions featuring experts in museology, history, and cultural studies.",
      iconPath: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253",
      // STYLE: Stone/Beige Minimalist Card
      style: {
        bg: "#E8E4D9",
        text: "#0F161E",
        border: "transparent",
        iconBg: "#0F161E",
        iconColor: "#FFFFFF"
      }
    }
  ]
};