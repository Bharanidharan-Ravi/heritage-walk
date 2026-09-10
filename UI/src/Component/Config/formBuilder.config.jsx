// src/Component/Config/formBuilder.config.jsx
//
// Copy + theme + field catalogue for the admin form builder, kept out of the
// JSX per the section+config split in CLAUDE.md. Shares the admin panel's
// dark-museum palette (see admin.config.jsx) but adds the surfaces the
// three-pane builder needs.

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

  // The palette, grouped the way the left rail renders it. `hasOptions` drives
  // the choices editor; `display` marks blocks that collect no answer and so
  // can never be "required".
  fieldGroups: [
    {
      group: "Text",
      types: [
        { type: "text", label: "Short answer", icon: "Ab", defaultLabel: "Short answer" },
        { type: "textarea", label: "Paragraph", icon: "¶", defaultLabel: "Long answer" },
        { type: "email", label: "Email", icon: "@", defaultLabel: "Email address" },
        { type: "phone", label: "Phone", icon: "☎", defaultLabel: "Phone number" },
        { type: "number", label: "Number", icon: "12", defaultLabel: "Number" },
      ],
    },
    {
      group: "Choice",
      types: [
        { type: "select", label: "Dropdown", icon: "▾", defaultLabel: "Choose one", hasOptions: true },
        { type: "radio", label: "Single choice", icon: "◉", defaultLabel: "Pick one", hasOptions: true },
        { type: "checkbox", label: "Multi choice", icon: "☑", defaultLabel: "Pick any", hasOptions: true },
      ],
    },
    {
      group: "Date & time",
      types: [
        { type: "date", label: "Date", icon: "📅", defaultLabel: "Date" },
        { type: "time", label: "Time", icon: "⏱", defaultLabel: "Time" },
      ],
    },
    {
      group: "Layout",
      types: [
        { type: "heading", label: "Section heading", icon: "H", defaultLabel: "Section heading", display: true },
        { type: "paragraph", label: "Description text", icon: "≡", defaultLabel: "Some helper text for this section.", display: true },
        { type: "divider", label: "Divider", icon: "—", defaultLabel: "", display: true },
      ],
    },
  ],
};

// Flat lookup by type, derived from the grouped catalogue above so the two can
// never drift apart.
export const fieldTypeCatalog = Object.fromEntries(
  formBuilderConfig.fieldGroups.flatMap((g) => g.types.map((t) => [t.type, t]))
);

export const isDisplayOnly = (type) => Boolean(fieldTypeCatalog[type]?.display);
export const hasOptions = (type) => Boolean(fieldTypeCatalog[type]?.hasOptions);
