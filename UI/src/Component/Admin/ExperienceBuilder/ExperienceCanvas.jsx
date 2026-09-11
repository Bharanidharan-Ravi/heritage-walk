// src/Component/Admin/ExperienceBuilder/ExperienceCanvas.jsx
//
// The arrangeable middle pane — same native-HTML5-drag reorder/insert-slot
// mechanics as Admin/FormBuilder/BuilderCanvas.jsx, copied rather than shared
// (see useExperienceBuilder.js header), rendering a content-block preview
// instead of a form field.

import React, { useState } from "react";
import { experienceBuilderConfig, blockMetaFor } from "../../Config/experienceBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import FieldIcon from "../../Config/fieldIcons";

const { theme } = experienceBuilderConfig;
const { text, control } = adminUi;

export default function ExperienceCanvas({
  experienceType,
  blocks,
  selectedId,
  onSelect,
  onMove,
  onNudge,
  onInsertNew,
  onRemove,
  onDuplicate,
  onWidthChange,
  drag,
  onDragEnd,
  onDragStartMove,
}) {
  const [dropIndex, setDropIndex] = useState(null);
  const clearDrop = () => setDropIndex(null);

  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    const target = dropIndex ?? blocks.length;
    if (drag?.kind === "new") onInsertNew(drag.blockKey, target);
    else if (drag?.kind === "move") onMove(drag.index, target);
    clearDrop();
    onDragEnd();
  };

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
        if (dropIndex === null) setDropIndex(blocks.length);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) clearDrop();
      }}
      onDrop={handleDropOnCanvas}
      className={`rounded-lg border ${adminUi.pad.card} min-h-80`}
      style={{ backgroundColor: theme.canvasBackground, borderColor: theme.borderColor }}
    >
      {blocks.length === 0 ? (
        <EmptyCanvas active={Boolean(drag)} />
      ) : (
        <div className="grid grid-cols-12 gap-2 items-start">
          {blocks.map((block, index) => (
            <React.Fragment key={block.id}>
              {dropIndex === index && <DropIndicator />}

              <div
                className={experienceBuilderConfig.spanClasses[block.width] || experienceBuilderConfig.spanClasses[12]}
                onDragOver={(e) => handleDragOverCard(e, index)}
              >
                <BlockCard
                  experienceType={experienceType}
                  block={block}
                  index={index}
                  total={blocks.length}
                  selected={block.id === selectedId}
                  dragging={drag?.kind === "move" && drag.index === index}
                  onSelect={() => onSelect(block.id)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", block.id);
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

          {dropIndex === blocks.length && <DropIndicator />}
        </div>
      )}
    </div>
  );
}

function DropIndicator() {
  return (
    <div className="col-span-12 sm:col-span-1 h-full min-h-10 flex items-center" aria-hidden="true">
      <div className="w-full sm:w-1 h-1 sm:h-full rounded-full" style={{ backgroundColor: theme.accentColor }} />
    </div>
  );
}

function EmptyCanvas({ active }) {
  const { content } = experienceBuilderConfig;
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

/** Read-only, compact rendering of one block's current content — shared with ExperiencePreviewModal. */
export function BlockValuePreview({ block }) {
  const empty = <span className={text.body} style={{ color: theme.mutedColor }}>— empty —</span>;

  switch (block.shape) {
    case "toggle":
      return <span className={text.body}>{block.value ? "Yes" : "No"}</span>;
    case "imageUrl":
    case "videoUrl":
      return block.value ? (
        <span className={text.body} style={{ color: theme.accentColor, wordBreak: "break-all" }}>{block.value}</span>
      ) : empty;
    case "gallery":
      return block.items?.length ? (
        <span className={text.body}>{block.items.length} image{block.items.length === 1 ? "" : "s"}</span>
      ) : empty;
    case "faqList":
      return block.items?.length ? (
        <ul className={`${text.body} space-y-0.5`}>
          {block.items.map((it, i) => <li key={i}>• {it.question || "(question)"}</li>)}
        </ul>
      ) : empty;
    case "modules":
      return block.items?.length ? (
        <ul className={`${text.body} space-y-0.5`}>
          {block.items.map((it, i) => <li key={i}>• {it.title || `Module ${i + 1}`} ({it.topics?.length || 0} topics)</li>)}
        </ul>
      ) : empty;
    case "repeatableList":
      return block.items?.length ? (
        <ul className={`${text.body} space-y-0.5`}>
          {block.items.map((it, i) => <li key={i}>• {it}</li>)}
        </ul>
      ) : empty;
    default:
      return block.value ? <p className={`${text.body} whitespace-pre-wrap`}>{block.value}</p> : empty;
  }
}

function BlockCard({
  experienceType, block, index, total, selected, dragging,
  onSelect, onDragStart, onDragEnd, onNudge, onRemove, onDuplicate, onWidthChange,
}) {
  const meta = blockMetaFor(experienceType, block);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`group rounded-md border p-1.5 cursor-grab active:cursor-grabbing transition-all ${dragging ? "opacity-40" : ""}`}
      style={{
        backgroundColor: theme.cardBackground,
        borderColor: selected ? theme.strongBorderColor : theme.borderColor,
        boxShadow: selected ? `0 0 0 1px ${theme.strongBorderColor}` : "none",
      }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[10px]" style={{ color: theme.mutedColor }} title="Drag to rearrange">⠿</span>
        <FieldIcon name={meta.icon} className="w-3.5 h-3.5" />
        <span className={text.micro} style={{ color: theme.mutedColor }}>{block.label || meta.paletteLabel}</span>

        <div className="ml-auto flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <CardButton label="Move earlier" disabled={index === 0} onClick={() => onNudge(block.id, -1)}>◀</CardButton>
          <CardButton label="Move later" disabled={index === total - 1} onClick={() => onNudge(block.id, 1)}>▶</CardButton>
          <CardButton label="Duplicate" onClick={() => onDuplicate(block.id)}>⧉</CardButton>
          <CardButton label="Delete" danger onClick={() => onRemove(block.id)}>✕</CardButton>
        </div>
      </div>

      <div className="pointer-events-none">
        <BlockValuePreview block={block} />
      </div>

      <div className="flex items-center gap-0.5 mt-1.5 pt-1 border-t" style={{ borderColor: theme.borderColor }}>
        <span className={`${text.micro} font-normal mr-1`} style={{ color: theme.mutedColor }}>Width</span>
        {experienceBuilderConfig.widths.map((w) => (
          <button
            key={w.value}
            type="button"
            title={w.hint}
            onClick={(e) => {
              e.stopPropagation();
              onWidthChange(block.id, w.value);
            }}
            className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest transition-colors"
            style={{
              backgroundColor: block.width === w.value ? "rgba(193,157,96,0.18)" : "transparent",
              color: block.width === w.value ? theme.accentColor : theme.mutedColor,
            }}
          >
            {w.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CardButton({ children, label, onClick, disabled, danger }) {
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
