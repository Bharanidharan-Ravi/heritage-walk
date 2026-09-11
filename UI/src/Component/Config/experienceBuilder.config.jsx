// src/Component/Config/experienceBuilder.config.jsx
//
// Copy + theme + content-block catalogue for the Experience Builder — the
// content-side counterpart to formBuilder.config.jsx, but for experience
// CONTENT (title, description, gallery, itinerary, FAQ, ...), never form
// FIELDS. Nothing here is imported by, or imports from, formBuilder.config.jsx
// or predefinedFields.config.jsx — see CLAUDE.md's "don't touch the Form
// Generator" rule and the Experiences module plan.
//
// One builder engine, several experience types: WALK_BLOCKS / SEMINAR_BLOCKS /
// COURSE_BLOCKS are each an ordered list of block KEYS drawn from one shared
// pool (BLOCK_POOL) plus a handful of type-only additions — adding a future
// type (Workshop, Field Trip, ...) is a new entry in EXPERIENCE_TYPE_BLOCKS,
// never a redesign.

export const experienceBuilderConfig = {
  // Same dark-museum palette as the rest of /admin (adminConfig/formBuilderConfig).
  theme: {
    pageBackground: "#141C26",
    panelBackground: "#161E29",
    cardBackground: "#1A202C",
    canvasBackground: "#111823",
    textColor: "#F4F1EA",
    mutedColor: "rgba(244, 241, 234, 0.55)",
    accentColor: "#C19D60",
    borderColor: "rgba(193, 157, 96, 0.2)",
    strongBorderColor: "rgba(193, 157, 96, 0.55)",
    dangerColor: "#E06C6C",
    successColor: "#6CC19D",
  },

  content: {
    builderTitle: (typeLabel) => `Experience Builder — ${typeLabel}`,
    builderSubtitle: "Drag a block in from the left, then arrange it on the canvas.",
    emptyCanvasTitle: "This experience is empty",
    emptyCanvasBody: "Pick a block from the left, or drag one onto this canvas.",
    previewTitle: "Preview",
    paletteSearchPlaceholder: "Search blocks…",
    saveDraftLabel: "Save draft",
    savingLabel: "Saving…",
    submitLabel: "Submit for approval",
    submittingLabel: "Submitting…",
    cancelLabel: "Cancel",
  },

  widths: [
    { value: 12, label: "Full", hint: "Whole row" },
    { value: 6, label: "Half", hint: "Two per row" },
    { value: 4, label: "Third", hint: "Three per row" },
  ],

  spanClasses: {
    4: "col-span-12 sm:col-span-4",
    6: "col-span-12 sm:col-span-6",
    12: "col-span-12",
  },
};

// The three experience types the builder supports today. Each has an icon (for
// CreateExperienceModal) and a display label.
export const EXPERIENCE_TYPES = [
  { type: "walk", label: "Walk", icon: "location", description: "A heritage walk — activities, timing, meeting point." },
  { type: "seminar", label: "Seminar", icon: "instructor", description: "A talk or seminar — speaker, topics, eligibility." },
  { type: "course", label: "Course", icon: "modules", description: "A multi-session course — modules, syllabus, certificate." },
];

// ---------------------------------------------------------------- shapes ----
// The small set of generic editors every block reuses (see
// ExperienceBlockSettings.jsx). `empty()` gives a fresh value/items for a
// newly-dropped block.
export const BLOCK_SHAPES = {
  text: { empty: () => "" },
  richtext: { empty: () => "" },
  imageUrl: { empty: () => "" },
  videoUrl: { empty: () => "" },
  date: { empty: () => "" },
  time: { empty: () => "" },
  number: { empty: () => "" },
  toggle: { empty: () => false },
  select: { empty: () => "" },
  gallery: { itemsBased: true, empty: () => [] },
  repeatableList: { itemsBased: true, empty: () => [] },
  faqList: { itemsBased: true, empty: () => [] },
  modules: { itemsBased: true, empty: () => [] },
};

export const isItemsBased = (shapeType) => Boolean(BLOCK_SHAPES[shapeType]?.itemsBased);

// ------------------------------------------------------------- block pool ---
// Shared across every experience type. `group` is the palette section label.
const BLOCK_POOL = [
  { key: "title", group: "Basic", paletteLabel: "Title", icon: "heading", shape: "text", label: "Title", width: 12 },
  { key: "shortDescription", group: "Basic", paletteLabel: "Short desc.", icon: "text", shape: "text", label: "Short Description", width: 12 },
  { key: "fullDescription", group: "Basic", paletteLabel: "Full desc.", icon: "textarea", shape: "richtext", label: "Full Description", width: 12 },
  { key: "heroImage", group: "Basic", paletteLabel: "Hero image", icon: "image", shape: "imageUrl", label: "Hero Image", width: 12 },
  { key: "gallery", group: "Basic", paletteLabel: "Gallery", icon: "gallery", shape: "gallery", label: "Image Gallery", width: 12 },
  { key: "video", group: "Basic", paletteLabel: "Video", icon: "video", shape: "videoUrl", label: "Video", width: 12 },

  { key: "location", group: "Location", paletteLabel: "Location", icon: "location", shape: "text", label: "Location", width: 6 },
  { key: "meetingPoint", group: "Location", paletteLabel: "Meeting pt.", icon: "location", shape: "text", label: "Meeting Point", width: 6 },

  { key: "startDate", group: "Schedule", paletteLabel: "Start date", icon: "date", shape: "date", label: "Start Date", width: 6 },
  { key: "endDate", group: "Schedule", paletteLabel: "End date", icon: "date", shape: "date", label: "End Date", width: 6 },
  { key: "startTime", group: "Schedule", paletteLabel: "Start time", icon: "clock", shape: "time", label: "Start Time", width: 6 },
  { key: "endTime", group: "Schedule", paletteLabel: "End time", icon: "clock", shape: "time", label: "End Time", width: 6 },
  { key: "duration", group: "Schedule", paletteLabel: "Duration", icon: "clock", shape: "text", label: "Duration", width: 6 },
  { key: "bookingEndDate", group: "Schedule", paletteLabel: "Booking ends", icon: "date", shape: "date", label: "Booking End Date", width: 6 },

  { key: "instructorName", group: "Details", paletteLabel: "Instructor", icon: "instructor", shape: "text", label: "Guide / Instructor / Speaker", width: 6 },
  { key: "instructorBio", group: "Details", paletteLabel: "Bio", icon: "text", shape: "richtext", label: "Instructor Bio", width: 12 },
  { key: "whatParticipantsGet", group: "Details", paletteLabel: "What you get", icon: "list", shape: "repeatableList", label: "What Participants Get", width: 12 },
  { key: "eligibility", group: "Details", paletteLabel: "Eligibility", icon: "list", shape: "richtext", label: "Eligibility", width: 12 },
  { key: "prerequisites", group: "Details", paletteLabel: "Prereqs.", icon: "list", shape: "richtext", label: "Prerequisites", width: 12 },
  { key: "certificate", group: "Details", paletteLabel: "Certificate", icon: "certificate", shape: "toggle", label: "Certificate Provided", width: 6 },
  { key: "materials", group: "Details", paletteLabel: "Materials", icon: "list", shape: "repeatableList", label: "Materials Provided", width: 12 },

  { key: "faq", group: "Repeatable", paletteLabel: "FAQ", icon: "faq", shape: "faqList", label: "FAQ", width: 12 },
  { key: "highlights", group: "Repeatable", paletteLabel: "Highlights", icon: "list", shape: "repeatableList", label: "Highlights", width: 12 },
  { key: "rules", group: "Repeatable", paletteLabel: "Rules", icon: "list", shape: "repeatableList", label: "Rules", width: 12 },
  { key: "prohibitedItems", group: "Repeatable", paletteLabel: "Prohibited", icon: "list", shape: "repeatableList", label: "Prohibited Items / Activities", width: 12 },
];

// ------------------------------------------------------- type-only blocks ---
const WALK_ONLY = [
  { key: "activities", group: "Walk Info", paletteLabel: "Activities", icon: "list", shape: "repeatableList", label: "Activities", width: 12 },
  { key: "itinerary", group: "Walk Info", paletteLabel: "Itinerary", icon: "modules", shape: "modules", label: "Itinerary / Plan", width: 12 },
  { key: "difficulty", group: "Walk Info", paletteLabel: "Difficulty", icon: "difficulty", shape: "select", label: "Difficulty", width: 4, options: ["Easy", "Moderate", "Difficult"] },
  { key: "distance", group: "Walk Info", paletteLabel: "Distance", icon: "distance", shape: "text", label: "Distance", width: 4 },
  { key: "ageRequirement", group: "Walk Info", paletteLabel: "Age req.", icon: "text", shape: "text", label: "Age Requirement", width: 4 },
  { key: "kidsFriendly", group: "Walk Info", paletteLabel: "Kids OK", icon: "toggle", shape: "toggle", label: "Kids Friendly", width: 6 },
  { key: "accessibility", group: "Walk Info", paletteLabel: "Accessible", icon: "accessibility", shape: "toggle", label: "Accessibility", width: 6 },
  { key: "languages", group: "Walk Info", paletteLabel: "Languages", icon: "languages", shape: "repeatableList", label: "Languages", width: 12 },
  { key: "whatToBring", group: "Walk Info", paletteLabel: "What to bring", icon: "luggage", shape: "repeatableList", label: "What to Bring", width: 12 },
  { key: "accommodation", group: "Walk Info", paletteLabel: "Accommodation", icon: "text", shape: "richtext", label: "Accommodation", width: 12 },
  { key: "food", group: "Walk Info", paletteLabel: "Food", icon: "text", shape: "richtext", label: "Food / Refreshments", width: 12 },
];

const SEMINAR_ONLY = [
  { key: "topics", group: "Seminar Details", paletteLabel: "Topics", icon: "list", shape: "repeatableList", label: "Topics", width: 12 },
  { key: "learningObjectives", group: "Seminar Details", paletteLabel: "Objectives", icon: "list", shape: "repeatableList", label: "Learning Objectives", width: 12 },
  { key: "whoCanAttend", group: "Seminar Details", paletteLabel: "Who can attend", icon: "list", shape: "richtext", label: "Who Can Attend", width: 12 },
  { key: "tableOfContents", group: "Seminar Details", paletteLabel: "Contents", icon: "modules", shape: "modules", label: "Table of Contents", width: 12 },
];

const COURSE_ONLY = [
  { key: "courseDuration", group: "Course Details", paletteLabel: "Duration", icon: "clock", shape: "text", label: "Course Duration", width: 6 },
  { key: "numberOfDays", group: "Course Details", paletteLabel: "No. of days", icon: "number", shape: "number", label: "Number of Days", width: 6 },
  { key: "learningOutcomes", group: "Course Details", paletteLabel: "Outcomes", icon: "list", shape: "repeatableList", label: "Learning Outcomes", width: 12 },
  { key: "courseModules", group: "Course Details", paletteLabel: "Modules", icon: "modules", shape: "modules", label: "Course Modules", width: 12 },
];

const EXPERIENCE_TYPE_BLOCKS = {
  walk: [...BLOCK_POOL, ...WALK_ONLY],
  seminar: [...BLOCK_POOL, ...SEMINAR_ONLY],
  course: [...BLOCK_POOL, ...COURSE_ONLY],
};

/** Catalogue keys a brand-new experience starts with, whatever its type. */
export const DEFAULT_EXPERIENCE_BLOCKS = ["title", "shortDescription"];

export function getBlockCatalog(experienceType) {
  return EXPERIENCE_TYPE_BLOCKS[experienceType] || BLOCK_POOL;
}

export function getBlockByKey(experienceType) {
  return Object.fromEntries(getBlockCatalog(experienceType).map((b) => [b.key, b]));
}

/** Group order per type — Basic first, the type's own section next, Repeatable last. */
const GROUP_ORDER = {
  walk: ["Basic", "Location", "Schedule", "Walk Info", "Details", "Repeatable"],
  seminar: ["Basic", "Seminar Details", "Schedule", "Location", "Details", "Repeatable"],
  course: ["Basic", "Course Details", "Schedule", "Details", "Repeatable"],
};

export function getPaletteSections(experienceType) {
  const catalog = getBlockCatalog(experienceType);
  const order = GROUP_ORDER[experienceType] || ["Basic", "Repeatable"];

  return order
    .map((group, i) => ({ group, open: i < 2, blocks: catalog.filter((b) => b.group === group) }))
    .filter((section) => section.blocks.length > 0);
}

export function blockMetaFor(experienceType, block) {
  if (!block) return {};
  const byKey = getBlockByKey(experienceType);
  return byKey[block.blockKey] || {};
}
