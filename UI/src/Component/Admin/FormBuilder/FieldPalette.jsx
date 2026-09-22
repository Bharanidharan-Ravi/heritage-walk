// src/Component/Admin/FormBuilder/FieldPalette.jsx
//
// Left rail of the builder. Each block can be clicked (appends to the end) or
// dragged onto the canvas at a specific slot — the same gesture Google Forms /
// Zoho Forms users expect.
//
// Blocks render as a 2-column grid of icon tiles rather than a list of text
// rows: with the predefined catalogue there are ~25 of them, and a single
// column would be nothing but scrolling. Sections collapse, and the search box
// filters across all of them at once — which is the fastest way in once you
// know the name of the block you want.

import React, { useMemo, useState } from "react";
import { formBuilderConfig, paletteSections } from "../../Config/formBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import FieldIcon from "../../Config/fieldIcons";

// `hiddenKeys`: block keys to leave out of the palette (e.g. the experience
// registration form drops "registrationType", which the booking cart owns).
export default function FieldPalette({ onAdd, onDragStartNew, onDragEnd, hiddenKeys = [] }) {
  const { theme, content } = formBuilderConfig;
  const { text } = adminUi;

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(paletteSections.map((s) => [s.group, !s.open]))
  );

  const searching = query.trim().length > 0;

  const visibleSections = useMemo(
    () => paletteSections
      .map((section) => ({ ...section, blocks: section.blocks.filter((b) => !hiddenKeys.includes(b.key)) }))
      .filter((section) => section.blocks.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hiddenKeys.join(",")]
  );

  // While searching, sections that match nothing disappear entirely and the
  // rest are force-expanded — otherwise a hit could be hidden behind a
  // collapsed header.
  const sections = useMemo(() => {
    if (!searching) return visibleSections;
    const q = query.trim().toLowerCase();

    return visibleSections
      .map((section) => ({
        ...section,
        blocks: section.blocks.filter((b) =>
          `${b.paletteLabel} ${b.field.label || ""} ${b.keywords || ""} ${b.group}`
            .toLowerCase()
            .includes(q)
        ),
      }))
      .filter((section) => section.blocks.length > 0);
  }, [query, searching, visibleSections]);

  const toggle = (group) => setCollapsed((c) => ({ ...c, [group]: !c[group] }));

  return (
    <aside
      className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4`}
      style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}
    >
      <div className="relative mb-2">
        <span
          className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: theme.mutedColor }}
        >
          <FieldIcon name="search" className="w-3 h-3" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={content.paletteSearchPlaceholder}
          aria-label={content.paletteSearchPlaceholder}
          className={`${adminUi.control.inputSm} pl-6`}
        />
      </div>

      {sections.length === 0 && (
        <p className={text.body} style={{ color: theme.mutedColor }}>
          No blocks match “{query.trim()}”.
        </p>
      )}

      <div className="space-y-1.5">
        {sections.map((section) => {
          const isOpen = searching || !collapsed[section.group];

          return (
            <div key={section.group}>
              <button
                type="button"
                onClick={() => toggle(section.group)}
                aria-expanded={isOpen}
                className="w-full flex items-center gap-1 py-0.5 hover:opacity-100 transition-opacity"
                style={{ color: theme.mutedColor }}
              >
                <span
                  className="shrink-0 transition-transform"
                  style={{ transform: isOpen ? "none" : "rotate(-90deg)" }}
                >
                  <FieldIcon name="chevron" className="w-3 h-3" />
                </span>
                <span className={`${text.micro} font-normal`}>{section.group}</span>
              </button>

              {isOpen && (
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {section.blocks.map((block) => (
                    <BlockTile
                      key={block.key}
                      block={block}
                      theme={theme}
                      onAdd={onAdd}
                      onDragStartNew={onDragStartNew}
                      onDragEnd={onDragEnd}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function BlockTile({ block, theme, onAdd, onDragStartNew, onDragEnd }) {
  // A div rather than a <button>: Firefox won't reliably start a native drag
  // from a button element.
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
        // Firefox refuses to begin a drag unless some data is set.
        e.dataTransfer.setData("text/plain", block.key);
        e.dataTransfer.effectAllowed = "copy";
        onDragStartNew(block.key);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onAdd(block.key)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAdd(block.key);
        }
      }}
      title={`${block.field.label || block.paletteLabel} — click to add, or drag onto the canvas`}
      className="flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-md border
                 cursor-grab active:cursor-grabbing transition-colors hover:border-[rgba(193,157,96,0.55)]"
      style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
    >
      <span style={{ color: theme.accentColor }}>
        <FieldIcon name={block.icon} className="w-4 h-4" />
      </span>
      <span
        className="text-[10px] leading-tight text-center w-full truncate"
        style={{ color: theme.textColor }}
      >
        {block.paletteLabel}
      </span>
    </div>
  );
}
