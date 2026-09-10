// src/Component/Config/adminUi.config.jsx
//
// The single type/spacing scale for everything under /admin. The admin console
// is a dense data tool, not the marketing site — it deliberately runs much
// smaller than the public pages, which keep their own larger scale.
//
// Every admin page/section imports `adminUi` and composes these class strings
// instead of writing `text-3xl` / `py-3` inline, so the console stays visually
// consistent and can be rescaled from this one file. Follows the same
// section + config-object split as the rest of Component/Config.
//
// Type scale (as agreed):
//   header        18–20px  page titles
//   subheader     16–18px  card / panel titles
//   bodyHeader    14–16px  group titles, table headers, emphasised body
//   bodySub       12–14px  secondary body, form labels, buttons
//   body          10–12px  default reading size, table cells, inputs
//   micro         10px     uppercase eyebrow labels, badges, hints
//
// Spacing scale: controls sit at 2–5px vertical / 2–10px horizontal padding.
// Containers (cards, panels, the page shell) get a little more so content
// doesn't touch their borders — they are surfaces, not controls.

const BORDER = "border-[rgba(193,157,96,0.2)]";
const FOCUS = "focus:outline-none focus:border-[#C19D60] transition-colors";

export const adminUi = {
  // ---------------------------------------------------------------- type ----
  text: {
    header: "text-[19px] leading-[1.25] font-bold",
    subheader: "text-[16px] leading-[1.3] font-semibold",
    bodyHeader: "text-[14px] leading-[1.35] font-semibold",
    bodySub: "text-[13px] leading-[1.4]",
    body: "text-[12px] leading-[1.5]",
    micro: "text-[10px] leading-[1.4] uppercase font-bold tracking-widest",
  },

  // ------------------------------------------------------------- spacing ----
  pad: {
    // Control padding — the 2–5px / 2–10px scale.
    yXs: "py-0.5",     // 2px
    ySm: "py-1",       // 4px
    yMd: "py-[5px]",   // 5px
    xXs: "px-0.5",     // 2px
    xSm: "px-1.5",     // 6px
    xMd: "px-2.5",     // 10px

    // Container padding — surfaces need a touch more than controls.
    page: "p-4",
    card: "p-3",
    panel: "p-2.5",
    cell: "py-1.5 pr-3",
  },

  gap: {
    xs: "gap-1",
    sm: "gap-2",
    md: "gap-3",
  },

  stack: {
    xs: "space-y-1",
    sm: "space-y-2",
    md: "space-y-3",
    lg: "space-y-4",
  },

  radius: {
    control: "rounded-md",
    card: "rounded-lg",
    pill: "rounded-full",
  },

  // ------------------------------------------------------------ controls ----
  // Colour still comes from the section's `theme` object via inline style (per
  // CLAUDE.md); these strings only carry size, spacing and shape.
  control: {
    input: `w-full bg-black/25 border ${BORDER} rounded-md px-2.5 py-[5px] text-[12px] ${FOCUS}`,
    inputSm: `w-full bg-black/20 border ${BORDER} rounded-md px-1.5 py-0.5 text-[11px] ${FOCUS}`,
    checkbox: "w-3 h-3 accent-[#C19D60]",

    // Filled call-to-action. Colours supplied by the caller's theme.
    btnPrimary:
      "inline-flex items-center justify-center px-2.5 py-[5px] rounded-md " +
      "text-[11px] font-bold uppercase tracking-widest disabled:opacity-50 transition-opacity",
    // Outlined secondary action.
    btnGhost:
      "inline-flex items-center justify-center px-2.5 py-[5px] rounded-md border " +
      "text-[11px] font-bold uppercase tracking-widest disabled:opacity-50 transition-opacity",
    // Text-only action inside tables and cards.
    btnLink: "text-[11px] font-bold uppercase tracking-widest hover:opacity-80 transition-opacity",
    // Status chip.
    pill: "inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
    // Square icon button (builder card actions).
    iconBtn: "w-5 h-5 grid place-items-center rounded text-[11px] disabled:opacity-25 hover:bg-white/5",

    label: "block text-[10px] uppercase font-bold tracking-widest mb-1 opacity-70",
    help: "text-[10px] leading-[1.4] mt-1 opacity-60",
  },

  // -------------------------------------------------------------- tables ----
  table: {
    root: "w-full text-[12px] border-collapse",
    head: "text-left opacity-60 text-[10px] uppercase font-bold tracking-widest",
    th: "py-1.5 pr-3",
    td: "py-1.5 pr-3",
  },
};

export default adminUi;
