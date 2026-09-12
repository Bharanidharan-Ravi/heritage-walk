// src/Component/Admin/ExperienceBuilder/ExperienceCanvas.jsx
//
// The middle pane — a WYSIWYG canvas, not a form. It renders the exact same
// fixed layout as the real page (Sections/ExperiencePageView.jsx: hero banner
// up top, an Overview/gallery/location flow, a free block stream, a cart
// skeleton docked on the side) using that page's own styled block renderer
// (BlockSection/BlockValue), so what an admin arranges here already looks
// like the page — "Preview" just adds a real cart and drops the edit chrome.
//
// Two kinds of slot:
//   - FIXED slots (hero, overview, gallery, location) — one per page, always
//     rendered in their real position, click to select/edit, not draggable.
//     Same idea as ExperiencePageView's own layoutKeys special-casing.
//   - STREAM blocks — everything else, rendered full-width & stacked (same
//     as the real page — content blocks never actually use `width`/grid
//     placement there), reorderable via the same native-HTML5-drag mechanics
//     as before.
//
// The cart itself isn't a content block (price/capacity aren't set until
// Admin approval — see AdminExperienceBuilder.jsx), so its "skeleton" here is
// a static, non-interactive placeholder, not a real BookingCard.

import React, { useState } from "react";
import { experienceBuilderConfig, blockMetaFor } from "../../Config/experienceBuilder.config";
import { experiencePublicConfig } from "../../Config/experiencePublic.config";
import { adminUi } from "../../Config/adminUi.config";
import FieldIcon from "../../Config/fieldIcons";
import { BlockSection } from "../../Sections/ExperiencePageView";
import { hasValue, formatSimpleValue } from "../../Sections/experienceBlockHelpers";

const { theme: chromeTheme, content: builderContent } = experienceBuilderConfig; // admin dark chrome — toolbars only
const { theme: pageTheme, content: pageContent, sectionLabels, layoutKeys, positiveListKeys, negativeListKeys } = experiencePublicConfig; // the real page's own look
const { text, control } = adminUi;

export default function ExperienceCanvas({
  experienceType,
  title,
  blocks,
  selectedId,
  onSelect,
  onMove,
  onNudge,
  onInsertNew,
  onRemove,
  onDuplicate,
  drag,
  onDragEnd,
  onDragStartMove,
}) {
  const [dropIndex, setDropIndex] = useState(null);
  const clearDrop = () => setDropIndex(null);

  const byKey = (key) => blocks.find((b) => b.blockKey === key);
  const typeLabel = pageContent.typeLabels[experienceType] || experienceType;

  const hero = byKey(layoutKeys.heroImage);
  const summary = byKey(layoutKeys.shortDescription);
  const fullDescription = byKey(layoutKeys.fullDescription);
  const location = byKey(layoutKeys.location);
  const meetingPoint = byKey(layoutKeys.meetingPoint);
  const gallery = byKey(layoutKeys.gallery);

  const chipKeys = [layoutKeys.difficulty, layoutKeys.distance, layoutKeys.duration, layoutKeys.courseDuration, layoutKeys.instructorName];
  const chips = chipKeys.map(byKey).filter(hasValue);

  // Unlike the real page, the stream here shows EVERY block regardless of
  // whether it has a value yet — this is the editor, so an empty block still
  // needs a visible, clickable slot to fill in.
  const placedKeys = new Set([
    layoutKeys.heroImage, layoutKeys.title, layoutKeys.shortDescription, layoutKeys.fullDescription,
    layoutKeys.location, layoutKeys.meetingPoint, layoutKeys.gallery,
    ...chipKeys,
  ]);
  const streamBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ block }) => !placedKeys.has(block.blockKey));

  // Drop target for a block dragged over one stream card — before or after it.
  const handleDragOverItem = (e, originalIndex) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = drag?.kind === "new" ? "copy" : "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const pastMiddle = e.clientY - rect.top > rect.height / 2;
    setDropIndex(pastMiddle ? originalIndex + 1 : originalIndex);
  };

  const handleDropOnStream = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const target = dropIndex ?? blocks.length;
    if (drag?.kind === "new") onInsertNew(drag.blockKey, target);
    else if (drag?.kind === "move") onMove(drag.index, target);
    clearDrop();
    onDragEnd();
  };

  // Dropping a new palette block anywhere outside the stream (onto the hero
  // area, the cart skeleton, the page padding, ...) just adds it at the end
  // — its own slot (fixed or stream) is decided by its blockKey, not by
  // where it lands.
  const handleDropOnCanvas = (e) => {
    e.preventDefault();
    if (drag?.kind === "new") onInsertNew(drag.blockKey, blocks.length);
    clearDrop();
    onDragEnd();
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnCanvas}
      className="rounded-lg border overflow-hidden"
      style={{ borderColor: chromeTheme.borderColor }}
    >
      <div className="px-6 md:px-10 py-8" style={{ backgroundColor: pageTheme.pageBackground, color: pageTheme.textColor }}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT: the page's real content column */}
          <div className="lg:w-2/3 w-full min-w-0">
            <p className="uppercase tracking-widest text-xs font-bold mb-2" style={{ color: pageTheme.accentColor }}>
              {typeLabel}
            </p>
            <h1 className="text-3xl md:text-4xl font-serif font-medium mb-4 leading-tight">
              {title || "Untitled experience"}
            </h1>

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {chips.map((b) => (
                  <button
                    type="button"
                    key={b.blockKey}
                    onClick={() => onSelect(b.id)}
                    className="px-3 py-1 rounded-full text-xs font-semibold border transition-colors"
                    style={{
                      borderColor: b.id === selectedId ? pageTheme.accentColor : pageTheme.borderColor,
                      color: pageTheme.mutedColor,
                    }}
                  >
                    {b.blockKey === layoutKeys.instructorName ? "Guide: " : ""}{formatSimpleValue(b)}
                  </button>
                ))}
              </div>
            )}

            {/* HERO */}
            {hero ? (
              <Slot selected={hero.id === selectedId} onClick={() => onSelect(hero.id)} className="mb-8">
                {hero.value ? (
                  <div className="rounded-2xl overflow-hidden shadow-xl">
                    <img src={hero.value} alt={title} className="w-full h-64 md:h-80 object-cover" />
                  </div>
                ) : (
                  <EmptyHint theme={pageTheme} height="h-64 md:h-80">{builderContent.emptyHeroHint}</EmptyHint>
                )}
              </Slot>
            ) : (
              <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.heroImage)} className="mb-8 h-40">
                {builderContent.addHeroImageLabel}
              </AddSlot>
            )}

            {/* OVERVIEW (short + full description) */}
            <div className="mb-8">
              <h2 className="text-2xl font-serif mb-3" style={{ color: pageTheme.accentColor }}>{pageContent.overviewCardTitle}</h2>

              {summary ? (
                <Slot selected={summary.id === selectedId} onClick={() => onSelect(summary.id)} className="mb-3">
                  {summary.value
                    ? <p className="text-lg leading-relaxed font-light whitespace-pre-wrap">{summary.value}</p>
                    : <EmptyHint theme={pageTheme}>{builderContent.emptyShortDescriptionHint}</EmptyHint>}
                </Slot>
              ) : (
                <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.shortDescription)} className="mb-3 h-14">
                  {builderContent.addShortDescriptionLabel}
                </AddSlot>
              )}

              {fullDescription ? (
                <Slot selected={fullDescription.id === selectedId} onClick={() => onSelect(fullDescription.id)}>
                  {fullDescription.value
                    ? <p className="leading-relaxed whitespace-pre-wrap" style={{ color: pageTheme.mutedColor }}>{fullDescription.value}</p>
                    : <EmptyHint theme={pageTheme}>{builderContent.emptyFullDescriptionHint}</EmptyHint>}
                </Slot>
              ) : (
                <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.fullDescription)} className="h-14">
                  {builderContent.addFullDescriptionLabel}
                </AddSlot>
              )}
            </div>

            {/* STREAM — the free, reorderable block flow */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dropIndex === null) setDropIndex(blocks.length);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) clearDrop();
              }}
              onDrop={handleDropOnStream}
              className="space-y-3 mb-8"
            >
              {streamBlocks.length === 0 && (
                <div
                  className="rounded-xl border-2 border-dashed py-6 text-center"
                  style={{ borderColor: drag ? pageTheme.accentColor : pageTheme.borderColor, color: pageTheme.mutedColor }}
                >
                  <p className={text.body}>Drag more blocks in from the left to build out the page.</p>
                </div>
              )}

              {streamBlocks.map(({ block, index }) => (
                <React.Fragment key={block.id}>
                  {dropIndex === index && <DropBar theme={pageTheme} />}
                  <StreamItem
                    experienceType={experienceType}
                    block={block}
                    index={index}
                    total={blocks.length}
                    selected={block.id === selectedId}
                    dragging={drag?.kind === "move" && drag.index === index}
                    onSelect={() => onSelect(block.id)}
                    onDragOver={(e) => handleDragOverItem(e, index)}
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
                  />
                </React.Fragment>
              ))}

              {dropIndex === blocks.length && streamBlocks.length > 0 && <DropBar theme={pageTheme} />}
            </div>

            {/* GALLERY */}
            {gallery ? (
              <Slot selected={gallery.id === selectedId} onClick={() => onSelect(gallery.id)} className="mb-8">
                <h2 className="text-2xl font-serif mb-3" style={{ color: pageTheme.accentColor }}>{pageContent.galleryCardTitle}</h2>
                {gallery.items?.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gallery.items.map((src, i) => <img key={i} src={src} alt="" className="w-full h-24 object-cover rounded-xl" />)}
                  </div>
                ) : (
                  <EmptyHint theme={pageTheme} height="h-20">{builderContent.emptyGalleryHint}</EmptyHint>
                )}
              </Slot>
            ) : (
              <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.gallery)} className="mb-8 h-16">
                {builderContent.addGalleryLabel}
              </AddSlot>
            )}

            {/* LOCATION DETAILS */}
            <div className="rounded-2xl border p-6" style={{ borderColor: pageTheme.borderColor, backgroundColor: pageTheme.cardBackground }}>
              <h2 className="text-2xl font-serif mb-3" style={{ color: pageTheme.accentColor }}>{pageContent.mapCardTitle}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {meetingPoint ? (
                  <Slot selected={meetingPoint.id === selectedId} onClick={() => onSelect(meetingPoint.id)}>
                    <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold" style={{ color: pageTheme.mutedColor }}>{pageContent.startingPointLabel}</span>
                    {meetingPoint.value
                      ? <p className="font-medium">{meetingPoint.value}</p>
                      : <EmptyHint theme={pageTheme} compact>{builderContent.emptyLocationHint}</EmptyHint>}
                  </Slot>
                ) : (
                  <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.meetingPoint)} className="h-14">
                    {builderContent.addMeetingPointLabel}
                  </AddSlot>
                )}
                {location ? (
                  <Slot selected={location.id === selectedId} onClick={() => onSelect(location.id)}>
                    <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold" style={{ color: pageTheme.mutedColor }}>{pageContent.endingPointLabel}</span>
                    {location.value
                      ? <p className="font-medium">{location.value}</p>
                      : <EmptyHint theme={pageTheme} compact>{builderContent.emptyLocationHint}</EmptyHint>}
                  </Slot>
                ) : (
                  <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.location)} className="h-14">
                    {builderContent.addLocationLabel}
                  </AddSlot>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: cart skeleton — not a content block, so not editable here */}
          <div className="lg:w-1/3 w-full">
            <CartSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/** A selectable, non-draggable slot for a fixed-position block that already exists. */
function Slot({ selected, onClick, className = "", children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-xl cursor-pointer transition-shadow ${className}`}
      style={{ boxShadow: selected ? `0 0 0 2px ${pageTheme.accentColor}` : `0 0 0 1px transparent` }}
    >
      {children}
    </div>
  );
}

/** Dashed "not added yet" placeholder for a fixed-position slot — click to add + select it. */
function AddSlot({ theme, onClick, className = "", children }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-xl border-2 border-dashed grid place-items-center cursor-pointer transition-colors hover:border-solid ${className}`}
      style={{ borderColor: theme.borderColor, color: theme.mutedColor }}
    >
      <span className="text-xs font-bold uppercase tracking-widest">{children}</span>
    </div>
  );
}

/** Muted hint shown inside an already-added-but-empty slot. */
function EmptyHint({ theme, height = "", compact, children }) {
  return (
    <div
      className={`rounded-lg border-2 border-dashed grid place-items-center text-center px-4 ${height} ${compact ? "py-3" : "py-8"}`}
      style={{ borderColor: theme.borderColor, color: theme.mutedColor }}
    >
      <p className="text-xs font-semibold">{children}</p>
    </div>
  );
}

function DropBar({ theme }) {
  return <div className="h-1 rounded-full" style={{ backgroundColor: theme.accentColor }} aria-hidden="true" />;
}

/** One reorderable, real-styled block in the free content stream. */
function StreamItem({
  experienceType, block, index, total, selected, dragging,
  onSelect, onDragOver, onDragStart, onDragEnd, onNudge, onRemove, onDuplicate,
}) {
  const meta = blockMetaFor(experienceType, block);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onClick={onSelect}
      className={`group relative rounded-xl p-4 cursor-pointer transition-shadow ${dragging ? "opacity-40" : ""}`}
      style={{
        backgroundColor: pageTheme.cardBackground,
        boxShadow: selected ? `0 0 0 2px ${pageTheme.accentColor}` : `0 0 0 1px ${pageTheme.borderColor}`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <span className="cursor-grab active:cursor-grabbing" style={{ color: pageTheme.mutedColor }} title="Drag to reorder">⠿</span>
        <FieldIcon name={meta.icon} className="w-3.5 h-3.5" />
        <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: pageTheme.mutedColor }}>
          {block.label || meta.paletteLabel}
        </span>

        <div className="ml-auto flex items-center gap-0.5">
          <CardButton label="Move earlier" disabled={index === 0} onClick={() => onNudge(block.id, -1)}>◀</CardButton>
          <CardButton label="Move later" disabled={index === total - 1} onClick={() => onNudge(block.id, 1)}>▶</CardButton>
          <CardButton label="Duplicate" onClick={() => onDuplicate(block.id)}>⧉</CardButton>
          <CardButton label="Delete" danger onClick={() => onRemove(block.id)}>✕</CardButton>
        </div>
      </div>

      {hasValue(block) ? (
        <BlockSection block={block} theme={pageTheme} sectionLabels={sectionLabels} positiveListKeys={positiveListKeys} negativeListKeys={negativeListKeys} />
      ) : (
        <EmptyHint theme={pageTheme} compact>Empty — click to fill this in on the right →</EmptyHint>
      )}
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
      style={{ color: danger ? chromeTheme.dangerColor : pageTheme.mutedColor }}
    >
      {children}
    </button>
  );
}

/** Static, non-interactive stand-in for the real BookingCard — price/capacity
 *  aren't set until Admin approval, so there's nothing real to show yet; this
 *  just marks the spot so the canvas's proportions match the live page. */
function CartSkeleton() {
  return (
    <div className="lg:sticky lg:top-4 rounded-3xl p-6 border-2 border-dashed" style={{ borderColor: pageTheme.borderColor, backgroundColor: pageTheme.cardBackground }}>
      <span className="text-[10px] uppercase tracking-widest block mb-3 font-bold" style={{ color: pageTheme.mutedColor }}>
        {builderContent.cartSkeletonTitle}
      </span>
      <div className="grid grid-cols-2 gap-2 mb-3 pointer-events-none opacity-50">
        <div className="py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-center border" style={{ borderColor: pageTheme.borderColor, color: pageTheme.mutedColor }}>
          {pageContent.individualLabel}
        </div>
        <div className="py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-center border" style={{ borderColor: pageTheme.borderColor, color: pageTheme.mutedColor }}>
          {pageContent.groupLabel}
        </div>
      </div>
      <div className="h-10 rounded-xl mb-4 opacity-30" style={{ backgroundColor: pageTheme.borderColor }} />
      <p className="text-xs" style={{ color: pageTheme.mutedColor }}>{builderContent.cartSkeletonNote}</p>
    </div>
  );
}
