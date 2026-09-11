// src/Component/Config/formBuilder.config.jsx
//
// Copy + theme + block catalogue for the admin form builder, kept out of the
// JSX per the section+config split in CLAUDE.md. Shares the admin panel's
// dark-museum palette (see admin.config.jsx) but adds the surfaces the
// three-pane builder needs.
//
// The palette is keyed by BLOCK, not by field type: several blocks can share a
// type (both "Phone" and "Emergency Contact" are type "phone", differing only
// in their preset label/validation). Generic blocks use their type as their
// key; predefined ones come from predefinedFields.config.jsx.

import { predefinedBlocks } from "./predefinedFields.config";

export const formBuilderConfig = {
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
    builderTitle: "Form builder",
    builderSubtitle: "Drag a block in from the left, then drag it around the canvas to lay it out.",
    emptyCanvasTitle: "Your form is empty",
    emptyCanvasBody: "Pick a block from the left, or drag one onto this canvas.",
    previewTitle: "Preview",
    previewNote: "This is exactly what the recipient sees. Nothing is submitted from here.",
    freeFormNote: "Free — no payment is collected.",
    paidFormNote: (price, currency) => `Paid — ${currency} ${price} is collected before the form is saved.`,
    saveLabel: "Publish form",
    savingLabel: "Publishing…",
    cancelLabel: "Cancel",
    paletteSearchPlaceholder: "Search blocks…",
    noSubmitterEmailWarning:
      "No email block — the person filling this in won't get a confirmation email.",
  },

  // Span options within the 12-column canvas grid. This is how several fields
  // end up side by side on one row: two Halves fill a row, three Thirds fill a
  // row, and so on. Everything collapses to full width on small screens.
  widths: [
    { value: 12, label: "Full", hint: "Whole row" },
    { value: 6, label: "Half", hint: "Two per row" },
    { value: 4, label: "Third", hint: "Three per row" },
    { value: 3, label: "Quarter", hint: "Four per row" },
  ],

  // Tailwind needs to see these class strings literally, so they're spelled out
  // rather than built with template strings at render time.
  spanClasses: {
    3: "col-span-12 sm:col-span-3",
    4: "col-span-12 sm:col-span-4",
    6: "col-span-12 sm:col-span-6",
    12: "col-span-12",
  },

  // Order the palette renders its sections in. Predefined groups come first —
  // they're the ones that make building fast. `open` is the default
  // expanded/collapsed state.
  paletteGroups: [
    { group: "Personal", open: true },
    { group: "Event", open: true },
    { group: "Consent", open: false },
    { group: "Text", open: false },
    { group: "Choice", open: false },
    { group: "Date & time", open: false },
    { group: "Layout", open: false },
  ],
};

// The plain, unconfigured blocks — the ones that were here before predefined
// blocks existed. Shape matches predefinedBlocks so both merge into one
// catalogue.
const genericBlocks = [
  { key: "text", group: "Text", paletteLabel: "Short", icon: "text", keywords: "short answer single line input", field: { type: "text", label: "Short answer" } },
  { key: "textarea", group: "Text", paletteLabel: "Paragraph", icon: "textarea", keywords: "long answer multiline notes comments", field: { type: "textarea", label: "Long answer", width: 12 } },
  { key: "email", group: "Text", paletteLabel: "Email", icon: "email", keywords: "mail", field: { type: "email", label: "Email address" } },
  { key: "phone", group: "Text", paletteLabel: "Phone", icon: "phone", keywords: "telephone mobile", field: { type: "phone", label: "Phone number" } },
  { key: "number", group: "Text", paletteLabel: "Number", icon: "number", keywords: "numeric quantity amount", field: { type: "number", label: "Number" } },

  { key: "select", group: "Choice", paletteLabel: "Dropdown", icon: "select", keywords: "select list choose one", field: { type: "select", label: "Choose one" } },
  { key: "radio", group: "Choice", paletteLabel: "One of", icon: "radio", keywords: "radio single choice option", field: { type: "radio", label: "Pick one", width: 12 } },
  { key: "checkbox", group: "Choice", paletteLabel: "Any of", icon: "checkbox", keywords: "checkbox multi choice multiple", field: { type: "checkbox", label: "Pick any", width: 12 } },

  { key: "date", group: "Date & time", paletteLabel: "Date", icon: "date", keywords: "calendar day", field: { type: "date", label: "Date" } },
  { key: "time", group: "Date & time", paletteLabel: "Time", icon: "time", keywords: "clock hour", field: { type: "time", label: "Time" } },

  { key: "heading", group: "Layout", paletteLabel: "Heading", icon: "heading", keywords: "section title", field: { type: "heading", label: "Section heading", width: 12 } },
  { key: "paragraph", group: "Layout", paletteLabel: "Text", icon: "paragraph", keywords: "description helper note", field: { type: "paragraph", label: "Some helper text for this section.", width: 12 } },
  { key: "divider", group: "Layout", paletteLabel: "Divider", icon: "divider", keywords: "separator line break", field: { type: "divider", label: "", width: 12 } },
];

/** Every block the palette can offer, predefined first. */
export const blockCatalog = [...predefinedBlocks, ...genericBlocks];

export const blockByKey = Object.fromEntries(blockCatalog.map((b) => [b.key, b]));

/** Blocks bucketed into the palette's sections, in `paletteGroups` order. */
export const paletteSections = formBuilderConfig.paletteGroups
  .map(({ group, open }) => ({
    group,
    open,
    blocks: blockCatalog.filter((b) => b.group === group),
  }))
  .filter((section) => section.blocks.length > 0);

// ---------------------------------------------------------------- type rules

/** Blocks that collect no answer, and so can never be "required". */
const DISPLAY_ONLY = new Set(["heading", "paragraph", "divider"]);

/** Blocks whose editor shows a choices list. */
const WITH_OPTIONS = new Set(["select", "radio", "checkbox"]);

/** Blocks that are a tick-box agreement rather than an input. */
const CONSENT_TYPES = new Set(["terms", "consent"]);

export const isDisplayOnly = (type) => DISPLAY_ONLY.has(type);
export const hasOptions = (type) => WITH_OPTIONS.has(type);
export const isConsent = (type) => CONSENT_TYPES.has(type);
export const isGroup = (type) => type === "group";

/**
 * Descriptive label for a field on the canvas / settings pane. Prefers the
 * exact block it was dropped from, falling back to the first block sharing its
 * type (fields loaded from the API carry no blockKey).
 */
export function blockMetaFor(field) {
  if (!field) return {};
  return (
    blockByKey[field.blockKey] ||
    blockCatalog.find((b) => b.field.type === field.type) ||
    {}
  );
}

// Back-compat: a few call sites still look a block up by bare type name.
export const fieldTypeCatalog = Object.fromEntries(
  genericBlocks.map((b) => [b.field.type, { ...b, label: b.paletteLabel }])
);
