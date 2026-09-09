// src/Component/Config/templeView.config.jsx
//
// Copy/theme for the immersive "drag to explore, scroll/pinch to zoom"
// temple viewer. Follows the section + config split used elsewhere
// (see Contact.jsx / contact.config.jsx).

export const templeViewConfig = {
  theme: {
    pageBackground: "#0b1720", // matches Layout's bg-[#0b1720]
    accentColor: "#FFD050",
    textColor: "#F4F1EA",
    secondaryText: "rgba(244,241,234,0.65)",
    panelBackground: "rgba(11,23,32,0.55)",
  },

  content: {
    eyebrow: "IMMERSIVE VIEW",
    title: "Brihadeeswarar Temple",
    subtitle: "Thanjavur Big Temple",
    description:
      "Drag to explore the great vimana, scroll or pinch to zoom in on the carvings Raja Raja Chola's architects left behind over a thousand years ago.",
    backLabel: "← Back",
    hintText: "Drag to look around  ·  Scroll or pinch to zoom",
    resetLabel: "Reset View",
    missingImageTitle: "Add the temple photo",
    missingImageBody:
      'Drop a high-resolution photo (3000px+ wide recommended) at "UI/public/images/big-temple-panorama.jpg", or point content.image below at another path/URL.',

    // TODO(temple-view): replace with a real high-resolution photo of the
    // Big Temple. A single wide/tall photo works best — the viewer pans
    // and zooms into it, it does not need to be a 360 panorama.
    image: "/images/big-temple-panorama.jpg",
    imageAlt: "Brihadeeswarar Temple, Thanjavur — the Big Temple",
  },

  viewer: {
    minZoom: 1,
    maxZoom: 4,
    wheelZoomStep: 0.35, // scale change per wheel notch
    buttonZoomStep: 0.5, // scale change per +/- button press
    doubleClickZoom: 2.2,
  },
};
