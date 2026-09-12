// src/Component/Config/experiencePublic.config.jsx
//
// Copy + theme for the PUBLIC-facing Experience pages (ExperienceList.jsx /
// ExperienceDetail.jsx) — the "second page" a visitor lands on after picking
// a Walk / Seminar / Course, plus its booking hand-off. Distinct from
// experienceBuilder.config.jsx (that one is the admin builder's block
// catalogue + dark theme); this one is the light, public-site palette
// matching WalkDetail.jsx's cream/gold look.
//
// Content on these pages is NEVER hardcoded per field — ExperienceDetail.jsx
// renders whatever ContentBlocks the Experience Builder produced, generically,
// keyed off each block's `shape`. This file only holds copy/labels/theme that
// apply regardless of what blocks a given experience happens to have.

export const experiencePublicConfig = {
  theme: {
    pageBackground: "#f6f2ea",
    cardBackground: "#ffffff",
    textColor: "#0b1720",
    mutedColor: "#6b7280",
    accentColor: "#caa863",
    borderColor: "rgba(11, 23, 32, 0.1)",
    dangerColor: "#b3453d",
  },

  content: {
    loadingMessage: "Loading experience…",
    notFoundTitle: "Experience Not Found",
    notFoundBody: "This experience may have been closed, or the link is incorrect.",
    genericErrorMessage: "Something went wrong loading this page. Please try again.",

    backToListLabel: "← Back to All Experiences",

    typeLabels: { walk: "Heritage Walk", seminar: "Seminar", course: "Course" },

    breadcrumbHome: "Home",
    breadcrumbExperiences: "Experiences",

    detailsCardTitle: "Experience Details",
    priceLabel: "Price",
    startingFromLabel: "Starting from",
    freeLabel: "Free",
    perPersonSuffix: "per person",
    perGuestSuffix: "/ guest",
    spotsLeftLabel: (n) => `${n} spot${n === 1 ? "" : "s"} left`,
    unlimitedSpotsLabel: "Open registration",
    soldOutLabel: "Sold out",

    // Cart / group-size widget — embedded directly on this page (not a
    // separate page) so a visitor picks their headcount before ever leaving
    // for checkout. The choice still only travels along as a prefill
    // (?qty=&registrationType=) to /forms/{slug} — the Form Generator (see
    // Config/predefinedFields.config.jsx: "registrationType" /
    // "numberOfAttendees") remains the one place that actually records it.
    registrationTypeLabel: "Registration type",
    individualLabel: "Individual",
    groupLabel: "Group",
    ticketsLabel: "Number of people",
    experienceDateLabel: "Experience date",
    totalLabel: "Total",
    dateNotSetLabel: "Date to be announced",

    bookNowLabel: "Book Now",
    checkAvailabilityLabel: "Book Now",
    bookingClosedLabel: "Bookings Closed",
    bookingComingSoonLabel: "Bookings Opening Soon",
    bookingHint: "You'll review your details and pay securely on the next step.",

    mapCardTitle: "Location Details",
    startingPointLabel: "Starting point",
    endingPointLabel: "Ending point",
    getDirectionsLabel: "Get directions ↗",

    galleryCardTitle: "Gallery",
    overviewCardTitle: "Overview",

    // Admin "Live Preview" only (ExperiencePreviewModal → ExperiencePageView
    // previewMode) — price/capacity/booking aren't set until after Admin
    // approval, and there's no hero image yet on a brand-new draft.
    heroPlaceholderLabel: "Hero image — add one from the block settings panel to see it here",
    previewPriceNote: "Price & capacity are set by an Admin after approval.",
    previewBookLabel: "Book Now",
    previewBookNote: "Booking becomes active once this experience is published.",

    // Listing page (ExperienceList.jsx)
    listTitle: "Our Experiences",
    listSubtitle: "Heritage walks, seminars and courses — pick one to see the full itinerary and book your spot.",
    listEmptyMessage: "No experiences are open for booking right now — check back soon.",
    filterAllLabel: "All",
    viewDetailsLabel: "View Details",
  },

  // Labels shown above a block's rendered value when the block itself has no
  // (or a too-terse) label — keyed by blockKey, falls back to block.label.
  sectionLabels: {
    fullDescription: "About This Experience",
    activities: "Activities",
    itinerary: "Full Itinerary / Roadmap",
    tableOfContents: "Table of Contents",
    courseModules: "Course Modules",
    accommodation: "Accommodation",
    food: "Food & Refreshments",
    faq: "Frequently Asked Questions",
    highlights: "Highlights",
    whatToBring: "What to Bring",
    whatParticipantsGet: "What You Get",
    materials: "Materials Provided",
    rules: "Rules",
    prohibitedItems: "Prohibited Items / Activities",
    eligibility: "Eligibility",
    prerequisites: "Prerequisites",
    learningObjectives: "Learning Objectives",
    learningOutcomes: "Learning Outcomes",
    whoCanAttend: "Who Can Attend",
    instructorBio: "About Your Guide",
  },

  // Block keys pulled out into their own dedicated layout spots rather than
  // the generic content stream — everything else falls through to the
  // generic renderer automatically, which is what keeps a brand-new block
  // type (added later to experienceBuilder.config.jsx) showing up here with
  // zero changes to this page.
  layoutKeys: {
    heroImage: "heroImage",
    title: "title",
    shortDescription: "shortDescription",
    fullDescription: "fullDescription",
    location: "location",
    meetingPoint: "meetingPoint",
    gallery: "gallery",
    instructorName: "instructorName",
    difficulty: "difficulty",
    distance: "distance",
    duration: "duration",
    courseDuration: "courseDuration",
  },

  // repeatableList blocks that read better as a tick/cross list (like
  // "Inclusions"/"What to bring" on a typical booking page) than as plain
  // bullets. Anything not listed here still renders — just as plain bullets
  // via the generic renderer — so a new repeatableList block type is never
  // left unstyled, only less decorated.
  positiveListKeys: ["highlights", "whatParticipantsGet", "materials", "whatToBring", "activities"],
  negativeListKeys: ["prohibitedItems"],
};
