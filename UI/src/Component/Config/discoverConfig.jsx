// src/config/discover.config.js

export const discoverConfig = {
  // LIGHT GALLERY THEME (Distinct from Dark Walks Section)
  theme: {
    sectionBackground: "#F4F1EA",  // Warm Alabaster (Light)
    textColor: "#0F161E",          // Deep Charcoal (Dark Text)
    accentColor: "#C19D60",        // Antique Bronze
    
    // Card Styles
    storyCardBackground: "#0F161E", // Dark Cards for Stories (High Contrast)
    storyCardText: "#F4F1EA",       // Light Text on Dark Card
    
    shopCardBackground: "#FFFFFF",  // Pure White for Shop Items
    shopCardText: "#0F161E",
    
    borderColor: "rgba(193, 157, 96, 0.2)", // Bronze border
    inactiveTabColor: "#9CA3AF",    // Grey for inactive tabs
  },

  content: {
    badge: "COMMUNITY & CULTURE",
    title: "Discover More",
    tabs: [
      { id: "gallery", label: "Gallery" },
      { id: "stories", label: "Stories" },
      { id: "shop", label: "Shop" }
    ],
  },

  data: {
    gallery: [
      { id: 1, title: "Sunset at Fort", image: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800" },
      { id: 2, title: "Ancient Arch", image: "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=800" },
      { id: 3, title: "Stone Carvings", image: "https://images.unsplash.com/photo-1582564286939-400a311013a2?auto=format&fit=crop&w=800" },
      { id: 4, title: "Market Chaos", image: "https://images.unsplash.com/photo-1541436402096-3c00438a0c25?auto=format&fit=crop&w=800" },
      { id: 5, title: "Temple Bells", image: "https://images.unsplash.com/photo-1605634648729-197e4293f06b?auto=format&fit=crop&w=800" },
      { id: 6, title: "Desert Trail", image: "https://images.unsplash.com/photo-1516934024742-b461fba47600?auto=format&fit=crop&w=800" },
    ],
    stories: [
      { id: 1, name: "Sarah J.", rating: 5, text: "I lived here for 10 years but never knew this alley existed!", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100" },
      { id: 2, name: "Amit V.", rating: 4, text: "Great walk, but wear comfortable shoes. The history is mind-blowing.", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100" },
      { id: 3, name: "Chen L.", rating: 5, text: "The best way to see the city. Loved the food stops!", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100" },
    ],
    shop: [
      { id: 1, name: "Vintage Map", price: "₹1200", image: "https://images.unsplash.com/photo-1526772662000-3f88f107f611?auto=format&fit=crop&w=400" },
      { id: 2, name: "Clay Pot", price: "₹850", image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=400" },
      { id: 3, name: "Postcards (Set)", price: "₹250", image: "https://images.unsplash.com/photo-1583306346215-055ea5025d2c?auto=format&fit=crop&w=400" },
      { id: 4, name: "Heritage Tee", price: "₹600", image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=400" },
    ]
  }
};