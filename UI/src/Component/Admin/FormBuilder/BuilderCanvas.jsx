// src/Component/Admin/FormBuilder/BuilderCanvas.jsx
//
// The arrangeable middle pane. Fields sit in a 12-column grid in array order,
// each spanning `field.width` columns — so a row holds two Halves, three
// Thirds, or four Quarters, and that is how left/right side-by-side layout
// works without a free-floating absolute grid that would break on mobile.
//
// Dragging uses the native HTML5 drag events rather than a DnD library: the
// repo has no such dependency today and a reorder-with-insert-slot is the one
// case native DnD handles well. Every drag gesture also has a button
// equivalent (◀ ▶ to nudge, width picker to resize) so the builder stays
// usable by keyboard and on touch screens.

import React, { useState } from "react";
import { formBuilderConfig, blockMetaFor, isDisplayOnly } from "../../Config/formBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import { experiencePublicConfig } from "../../Config/experiencePublic.config";
import { RenderedField } from "../../Sections/FormRenderer";

const { theme: darkTheme } = formBuilderConfig;
const { theme: pageTheme } = experiencePublicConfig;

// `light` draws the canvas on the cream public page (experience registration
// screen) instead of the dark form-builder chrome — same layout, page colours.
const lightTheme = {
  ...darkTheme,
  canvasBackground: "transparent",
  cardBackground: pageTheme.cardBackground,
  borderColor: pageTheme.borderColor,
  strongBorderColor: pageTheme.accentColor,
  mutedColor: pageTheme.mutedColor,
  accentColor: pageTheme.accentColor,
  dangerColor: pageTheme.dangerColor,
};
const { text, control } = adminUi;

// Canvas cards are inert previews, so composite blocks read their sub-answers
// out of a shared frozen blank rather than a new object every render.
const EMPTY_VALUES = Object.freeze({});

export default function BuilderCanvas({
  fields,
  selectedId,
  onSelect,
  onMove,
  onNudge,
  onInsertNew,
  onRemove,
  onDuplicate,
  onWidthChange,
  drag,          // { kind: "new", blockKey } | { kind: "move", index } | null
  onDragEnd,
  onDragStartMove,
  light = false,
}) {
  const theme = light ? lightTheme : darkTheme;

  // Insertion slot the drop would land in: 0..fields.length, or null.
  const [dropIndex, setDropIndex] = useState(null);

  const clearDrop = () => setDropIndex(null);

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    const target = dropIndex ?? fields.length;

    if (drag?.kind === "new") onInsertNew(drag.blockKey, target);
    else if (drag?.kind === "move") onMove(drag.index, target);

    clearDrop();
    onDragEnd();
  };

  // Which half of the hovered card the pointer is in decides whether the field
  // lands before or after it.
  const handleDragOverCard = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = drag?.kind === "new" ? "copy" : "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const pastMiddle = e.clientX - rect.left > rect.width / 2;
    setDropIndex(pastMiddle ? index + 1 : index);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (dropIndex === null) setDropIndex(fields.length);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) clearDrop();
      }}
      onDrop={handleDropOnCanvas}
      className={`rounded-lg ${light ? "" : "border"} ${adminUi.pad.card} min-h-80`}
      style={{ backgroundColor: theme.canvasBackground, borderColor: theme.borderColor, color: light ? pageTheme.textColor : undefined }}
    >
      {fields.length === 0 ? (
        <EmptyCanvas active={Boolean(drag)} theme={theme} />
      ) : (
        <div className="grid grid-cols-12 gap-2 items-start">
          {fields.map((field, index) => (
            <React.Fragment key={field.id}>
              {dropIndex === index && <DropIndicator theme={theme} />}

              <div
                className={formBuilderConfig.spanClasses[field.width] || formBuilderConfig.spanClasses[12]}
                onDragOver={(e) => handleDragOverCard(e, index)}
              >
                <FieldCard
                  theme={theme}
                  light={light}
                  field={field}
                  index={index}
                  total={fields.length}
                  selected={field.id === selectedId}
                  dragging={drag?.kind === "move" && drag.index === index}
                  onSelect={() => onSelect(field.id)}
                  onDragStart={(e) => {
                    // Firefox refuses to begin a drag unless some data is set.
                    e.dataTransfer.setData("text/plain", field.id);
                    e.dataTransfer.effectAllowed = "move";
                    onDragStartMove(index);
                  }}
                  onDragEnd={() => {
                    clearDrop();
                    onDragEnd();
                  }}
                  onNudge={onNudge}
                  onRemove={onRemove}
                  onDuplicate={onDuplicate}
                  onWidthChange={onWidthChange}
                />
              </div>
            </React.Fragment>
          ))}

          {dropIndex === fields.length && <DropIndicator theme={theme} />}
        </div>
      )}
    </div>
  );
}

function DropIndicator({ theme }) {
  return (
    <div className="col-span-12 sm:col-span-1 h-full min-h-10 flex items-center" aria-hidden="true">
      <div
        className="w-full sm:w-1 h-1 sm:h-full rounded-full"
        style={{ backgroundColor: theme.accentColor }}
      />
    </div>
  );
}

function EmptyCanvas({ active, theme }) {
  const { content } = formBuilderConfig;
  return (
    <div
      className="h-72 rounded-md border-2 border-dashed grid place-content-center text-center px-4"
      style={{ borderColor: active ? theme.strongBorderColor : theme.borderColor }}
    >
      <p className={`${text.bodyHeader} mb-0.5`}>{content.emptyCanvasTitle}</p>
      <p className={text.body} style={{ color: theme.mutedColor }}>{content.emptyCanvasBody}</p>
    </div>
  );
}

function FieldCard({
  theme, light,
  field, index, total, selected, dragging,
  onSelect, onDragStart, onDragEnd, onNudge, onRemove, onDuplicate, onWidthChange,
}) {
  const meta = blockMetaFor(field);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group rounded-md border p-1.5 cursor-grab active:cursor-grabbing transition-all ${
        dragging ? "opacity-40" : ""
      }`}
      style={{
        backgroundColor: theme.cardBackground,
        borderColor: selected ? theme.strongBorderColor : theme.borderColor,
        boxShadow: selected ? `0 0 0 1px ${theme.strongBorderColor}` : "none",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px]" style={{ color: theme.mutedColor }} title="Drag to rearrange">⠿</span>
        <span className={text.micro} style={{ color: theme.mutedColor }}>
          {meta.paletteLabel || field.type}
        </span>
        {field.required && !isDisplayOnly(field.type) && (
          <span className="text-[10px]" style={{ color: theme.accentColor }}>required</span>
        )}

        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <CardButton theme={theme} label="Move earlier" disabled={index === 0} onClick={() => onNudge(field.id, -1)}>◀</CardButton>
          <CardButton theme={theme} label="Move later" disabled={index === total - 1} onClick={() => onNudge(field.id, 1)}>▶</CardButton>
          <CardButton theme={theme} label="Duplicate" onClick={() => onDuplicate(field.id)}>⧉</CardButton>
          <CardButton theme={theme} label="Delete" danger onClick={() => onRemove(field.id)}>✕</CardButton>
        </div>
      </div>

      {/* The real control, so the canvas already looks like the finished form —
          at the console's own compact scale, not the public page's. */}
      <div className="pointer-events-none">
        <RenderedField light={light} field={field} value="" values={EMPTY_VALUES} disabled compact />
      </div>

      <div className="flex items-center gap-0.5 mt-1.5 pt-1 border-t" style={{ borderColor: theme.borderColor }}>
        <span className={`${text.micro} font-normal mr-1`} style={{ color: theme.mutedColor }}>
          Width
        </span>
        {formBuilderConfig.widths.map((w) => (
          <button
            key={w.value}
            type="button"
            title={w.hint}
            onClick={(e) => {
              e.stopPropagation();
              onWidthChange(field.id, w.value);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{
              backgroundColor: field.width === w.value ? "rgba(193,157,96,0.18)" : "transparent",
              color: field.width === w.value ? theme.accentColor : theme.mutedColor,
            }}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CardButton({ children, label, onClick, disabled, danger, theme }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={control.iconBtn}
      style={{ color: danger ? theme.dangerColor : theme.mutedColor }}
    >
      {children}
    </button>
  );
}
