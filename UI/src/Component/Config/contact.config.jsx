// src/config/contact.config.js

export const contactConfig = {
  // DARK MUSEUM THEME
  theme: {
    sectionBackground: "#0F161E",   // Deep Charcoal
    textColor: "#F4F1EA",           // Alabaster White
    accentColor: "#C19D60",         // Antique Bronze
    
    // Form Styles
    inputBackground: "rgba(255, 255, 255, 0.05)",
    inputBorder: "rgba(193, 157, 96, 0.3)",
    inputFocusBorder: "#C19D60",
    placeholderColor: "rgba(244, 241, 234, 0.4)",
    
    buttonBackground: "#C19D60",
    buttonText: "#0F161E",
  },

  content: {
    badge: "GET IN TOUCH",
    title: "Start Your Journey",
    subtitle: "Have questions about our trails or want to book a private tour? We'd love to hear from you.",
    
    // Contact Info
    email: "infos@archaeotrails.com",
    phone: "+91 8870705836",
    address: "MIG - 156 Chinthamani, Tamil University Campus, Medical College Road, Thanjavur, Tamil Nadu- 613010",
    
    // Social Links
    socials: [
      { name: "Instagram", url: "https://instagram.com", icon: "instagram" },
      { name: "WhatsApp", url: "https://wa.me/918870705836", icon: "whatsapp" },
      { name: "Facebook", url: "https://facebook.com", icon: "facebook" },
    ],

    // Form Labels
    form: {
      nameLabel: "Your Name",
      emailLabel: "Email Address",
      subjectLabel: "Subject",
      messageLabel: "Your Message",
      buttonText: "Send Message",
      successMessage: "Thank you! We have received your message.",
      errorMessage: "Something went wrong. Please try again.",
    }
  }
};