// src/Component/Admin/ExperienceBuilder/ExperienceBlockPalette.jsx
//
// Left rail — same collapsible-sections + search + drag-or-click-to-add
// mechanics as Admin/FormBuilder/FieldPalette.jsx, sourced from the active
// experience type's block catalogue (Config/experienceBuilder.config.jsx).

import React, { useMemo, useState } from "react";
import { experienceBuilderConfig, getPaletteSections } from "../../Config/experienceBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import FieldIcon from "../../Config/fieldIcons";

export default function ExperienceBlockPalette({ experienceType, onAdd, onDragStartNew, onDragEnd }) {
  const { theme, content } = experienceBuilderConfig;
  const { text } = adminUi;

  const allSections = useMemo(() => getPaletteSections(experienceType), [experienceType]);

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState(() =>
    Object.fromEntries(allSections.map((s) => [s.group, !s.open]))
  );

  const searching = query.trim().length > 0;

  const sections = useMemo(() => {
    if (!searching) return allSections;
    const q = query.trim().toLowerCase();
    return allSections
      .map((section) => ({
        ...section,
        blocks: section.blocks.filter((b) =>
          `${b.paletteLabel} ${b.label || ""} ${b.group}`.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.blocks.length > 0);
  }, [allSections, query, searching]);

  const toggle = (group) => setCollapsed((c) => ({ ...c, [group]: !c[group] }));

  return (
    <aside
      className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4`}
      style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}
    >
      <div className="relative mb-2">
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: theme.mutedColor }}>
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
        <p className={text.body} style={{ color: theme.mutedColor }}>No blocks match “{query.trim()}”.</p>
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
                <span className="shrink-0 transition-transform" style={{ transform: isOpen ? "none" : "rotate(-90deg)" }}>
                  <FieldIcon name="chevron" className="w-3 h-3" />
                </span>
                <span className={`${text.micro} font-normal`}>{section.group}</span>
              </button>

              {isOpen && (
                <div className="grid grid-cols-2 gap-1 mt-1">
                  {section.blocks.map((block) => (
                    <BlockTile key={block.key} block={block} theme={theme} onAdd={onAdd} onDragStartNew={onDragStartNew} onDragEnd={onDragEnd} />
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
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onDragStart={(e) => {
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
      title={`${block.label || block.paletteLabel} — click to add, or drag onto the canvas`}
      className="flex flex-col items-center justify-center gap-1 px-1 py-1.5 rounded-md border
                 cursor-grab active:cursor-grabbing transition-colors hover:border-[rgba(193,157,96,0.55)]"
      style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
    >
      <span style={{ color: theme.accentColor }}>
        <FieldIcon name={block.icon} className="w-4 h-4" />
      </span>
      <span className="text-[10px] leading-tight text-center w-full truncate" style={{ color: theme.textColor }}>
        {block.paletteLabel}
      </span>
    </div>
  );
}
