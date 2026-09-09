// src/config/walk.config.js

export const walkConfig = {
  // MUSEUM DISPLAY PALETTE (High Contrast)
  theme: {
    sectionBackground: "#0F161E",  // Deep Charcoal (The Room)
    headerTextColor: "#F4F1EA",    // Alabaster (Title)
    
    // SOLID CARDS (Rich & Clean)
    cardBackground: "#F4F1EA",     // Alabaster Stone
    cardTextColor: "#0F161E",      // Deep Charcoal Text
    cardSecondaryText: "#4A5568",  // Slate Grey
    cardBorderColor: "transparent", 
    
    accentColor: "#C19D60",        // Antique Bronze
    dividerColor: "rgba(193, 157, 96, 0.3)", // Bronze divider
    
    modalBackground: "#F4F1EA",
  },

  content: {
    sectionBadge: "JOIN THE EXPEDITION",
    sectionTitle: "Upcoming Heritage Trails",
    sectionSubtitle: "Select a trail below to uncover the stories of the past.",
    
    currencySymbol: "₹",
    viewButton: "View Details",
    confirmButton: "Confirm Booking",
    
    scanTitle: "Scan to Pay",
    scanSubtitle: "Use any UPI app (GPay, PhonePe, Paytm)",
    backText: "← Back to Details",
    whatsappButton: "Send Screenshot"
  }
};