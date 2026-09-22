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

import React, { useLayoutEffect, useRef, useState } from "react";
import { experienceBuilderConfig, blockMetaFor } from "../../Config/experienceBuilder.config";
import { experiencePublicConfig } from "../../Config/experiencePublic.config";
import { adminUi } from "../../Config/adminUi.config";
import FieldIcon from "../../Config/fieldIcons";
import { BlockSection } from "../../Sections/ExperiencePageView";
import { hasValue, formatSimpleValue } from "../../Sections/experienceBlockHelpers";
import { useExperienceImageUpload, validateImageFile } from "./imageUpload";
import RichTextEditor from "./RichTextEditor";

const { theme: chromeTheme, content: builderContent } = experienceBuilderConfig; // admin dark chrome — toolbars only
const { theme: pageTheme, content: pageContent, sectionLabels, layoutKeys, positiveListKeys, negativeListKeys } = experiencePublicConfig; // the real page's own look
const { text, control } = adminUi;

// Sentinel `selectedId` values for the two experience-level fields (title,
// schedule dates) that live outside the block array — set once per
// experience, not draggable/removable — but are still selectable/editable
// from both the canvas (inline) and the sidebar (ExperienceBlockSettings),
// same as any real content block.
export const TITLE_BLOCK_ID = "__title__";
export const CART_BLOCK_ID = "__cart__";

export default function ExperienceCanvas({
  experienceType,
  title,
  onTitleChange,
  blocks,
  selectedId,
  onSelect,
  onMove,
  onNudge,
  onInsertNew,
  onUpdateBlock,
  onRemove,
  onDuplicate,
  drag,
  onDragEnd,
  onDragStartMove,
  isAdmin,
  requiresPayment,
  price,
  currency,
  capacityTotal,
  registrationType,
  privateSlots,
  privateMinPeople,
  startDate,
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

            <EditableTitle title={title} selected={selectedId === TITLE_BLOCK_ID} onSelect={() => onSelect(TITLE_BLOCK_ID)} onChange={onTitleChange} />

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

            {/* HERO — a file dragged from the OS straight onto this slot uploads
                and sets it directly, whether or not the hero block exists yet;
                clicking still selects it for the sidebar's own dropzone/label
                editor, same as before. */}
            <HeroImageSlot
              hero={hero}
              title={title}
              selected={hero ? hero.id === selectedId : false}
              onSelect={() => (hero ? onSelect(hero.id) : onInsertNew(layoutKeys.heroImage))}
              onInsert={(url) => onInsertNew(layoutKeys.heroImage, undefined, { value: url })}
              onUpdate={(url) => onUpdateBlock(hero.id, { value: url })}
            />

            {/* OVERVIEW (short + full description) — rich-text editable
                directly here, not in the sidebar (ExperienceBlockSettings
                only shows the Label field for these two blocks); see
                RichTextEditor.jsx. */}
            <div className="mb-8">
              <h2 className="text-2xl font-serif mb-3" style={{ color: pageTheme.accentColor }}>{pageContent.overviewCardTitle}</h2>

              {summary ? (
                <div className="mb-3">
                  <RichTextEditor
                    value={summary.value}
                    onChange={(html) => onUpdateBlock(summary.id, { value: html })}
                    lineHeight={summary.lineHeight}
                    onLineHeightChange={(lh) => onUpdateBlock(summary.id, { lineHeight: lh })}
                    fontFamily={summary.fontFamily}
                    onFontFamilyChange={(v) => onUpdateBlock(summary.id, { fontFamily: v })}
                    fontSize={summary.fontSize}
                    onFontSizeChange={(v) => onUpdateBlock(summary.id, { fontSize: v })}
                    fontWeight={summary.fontWeight}
                    onFontWeightChange={(v) => onUpdateBlock(summary.id, { fontWeight: v })}
                    selected={summary.id === selectedId}
                    onSelect={() => onSelect(summary.id)}
                    placeholder={builderContent.emptyShortDescriptionHint}
                    theme={pageTheme}
                    className="text-lg font-light"
                    minHeight="3.5rem"
                  />
                </div>
              ) : (
                <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.shortDescription)} className="mb-3 h-14">
                  {builderContent.addShortDescriptionLabel}
                </AddSlot>
              )}

              {fullDescription ? (
                <RichTextEditor
                  value={fullDescription.value}
                  onChange={(html) => onUpdateBlock(fullDescription.id, { value: html })}
                  lineHeight={fullDescription.lineHeight}
                  onLineHeightChange={(lh) => onUpdateBlock(fullDescription.id, { lineHeight: lh })}
                  fontFamily={fullDescription.fontFamily}
                  onFontFamilyChange={(v) => onUpdateBlock(fullDescription.id, { fontFamily: v })}
                  fontSize={fullDescription.fontSize}
                  onFontSizeChange={(v) => onUpdateBlock(fullDescription.id, { fontSize: v })}
                  fontWeight={fullDescription.fontWeight}
                  onFontWeightChange={(v) => onUpdateBlock(fullDescription.id, { fontWeight: v })}
                  selected={fullDescription.id === selectedId}
                  onSelect={() => onSelect(fullDescription.id)}
                  placeholder={builderContent.emptyFullDescriptionHint}
                  theme={pageTheme}
                  style={{ color: pageTheme.mutedColor }}
                  minHeight="9rem"
                />
              ) : (
                <AddSlot theme={pageTheme} onClick={() => onInsertNew(layoutKeys.fullDescription)} className="h-14">
                  {builderContent.addFullDescriptionLabel}
                </AddSlot>
              )}
            </div>

            {/* GALLERY — fixed position, rendered BEFORE the stream so that
                whatever ends up last in the stream (FAQ always does, see
                sortFaqLast in useExperienceBuilder.js) reads as the true
                bottom of the page, not sandwiched above Gallery/Location. */}
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

            {/* LOCATION DETAILS — same reasoning, fixed position before the stream. */}
            <div className="rounded-2xl border p-6 mb-8" style={{ borderColor: pageTheme.borderColor, backgroundColor: pageTheme.cardBackground }}>
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
          </div>

          {/* RIGHT: cart skeleton — an Employee gets the same static,
              non-interactive placeholder as always (price/capacity aren't
              theirs to set); an Admin gets a live summary that's selectable,
              same as any other slot, opening the full editor in the sidebar. */}
          <div className="lg:w-1/3 w-full">
            {isAdmin ? (
              <Slot selected={selectedId === CART_BLOCK_ID} onClick={() => onSelect(CART_BLOCK_ID)}>
                <CartSkeleton
                  requiresPayment={requiresPayment}
                  price={price}
                  currency={currency}
                  capacityTotal={capacityTotal}
                  registrationType={registrationType}
                  privateSlots={privateSlots}
                  privateMinPeople={privateMinPeople}
                  startDate={startDate}
                  editable
                />
              </Slot>
            ) : (
              <CartSkeleton />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** A selectable, non-draggable slot for a fixed-position block that already
 *  exists. `dragOver` (plus any `onDrag*`/`onDrop` passed through) lets a
 *  slot double as an OS-file drop target — see HeroImageSlot. */
function Slot({ selected, onClick, className = "", children, dragOver, ...dragHandlers }) {
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
      {...dragHandlers}
      className={`rounded-xl cursor-pointer transition-shadow ${className}`}
      style={{ boxShadow: selected || dragOver ? `0 0 0 2px ${pageTheme.accentColor}` : `0 0 0 1px transparent` }}
    >
      {children}
    </div>
  );
}

/** The page's real <h1> title, directly typeable in place — click puts a
 *  caret in it (native contentEditable), typing calls onChange immediately.
 *  The sidebar (ExperienceBlockSettings) edits the exact same `title` state
 *  via TITLE_BLOCK_ID, so either surface works.
 *
 *  Deliberately NOT rendered as `{title}` React children: a controlled
 *  contentEditable re-renders its text node on every keystroke, which resets
 *  the caret to the start and scrambles typing (e.g. "test" -> "tset"). The
 *  DOM owns the live text instead — onInput reports it up without touching
 *  the DOM back — and this effect only writes into it when `title` changed
 *  from OUTSIDE (sidebar edit, loading a saved experience), not from our own
 *  typing, which is why it's skipped whenever the text already matches. */
function EditableTitle({ title, selected, onSelect, onChange }) {
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current && ref.current.textContent !== title) {
      ref.current.textContent = title;
    }
  }, [title]);

  return (
    <div className="relative mb-4">
      {!title && (
        <span
          className="absolute inset-0 text-3xl md:text-4xl font-serif font-medium leading-tight pointer-events-none select-none"
          style={{ color: pageTheme.mutedColor }}
        >
          Untitled experience
        </span>
      )}
      <h1
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-label="Experience title"
        onFocus={onSelect}
        onInput={(e) => onChange(e.currentTarget.textContent)}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault(); // title stays single-line
        }}
        onPaste={(e) => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData("text/plain"));
        }}
        className="text-3xl md:text-4xl font-serif font-medium leading-tight outline-none rounded-md cursor-text -m-1 p-1"
        style={{ boxShadow: selected ? `0 0 0 2px ${pageTheme.accentColor}` : `0 0 0 1px transparent` }}
      />
    </div>
  );
}

/** Hero image slot — a real drop target for a file dragged in from the OS
 *  (not just the palette's block-drag), whether or not the hero block has
 *  been added yet. Clicking still selects the existing block for the
 *  sidebar's own editor (label field, replace-via-browse). */
function HeroImageSlot({ hero, title, selected, onSelect, onInsert, onUpdate }) {
  const { upload, remove } = useExperienceImageUpload();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const isFileDrag = (e) => Array.from(e.dataTransfer?.types || []).includes("Files");

  const handleFile = async (file) => {
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const result = await upload(file);
      const previous = hero?.value;
      if (hero) onUpdate(result.url);
      else onInsert(result.url);
      if (previous) remove(previous);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Slot
      selected={selected}
      onClick={onSelect}
      className="mb-8"
      dragOver={dragOver}
      onDragOver={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false);
      }}
      onDrop={(e) => {
        if (!isFileDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      {hero?.value ? (
        <div className="rounded-2xl overflow-hidden shadow-xl relative">
          <img src={hero.value} alt={title} className="w-full h-64 md:h-80 object-cover" />
          {(uploading || dragOver) && (
            <div className="absolute inset-0 grid place-items-center text-xs font-bold uppercase tracking-widest" style={{ backgroundColor: "rgba(20,28,38,0.6)", color: pageTheme.textColor }}>
              {uploading ? "Uploading…" : "Drop to replace"}
            </div>
          )}
        </div>
      ) : (
        <EmptyHint theme={pageTheme} height="h-64 md:h-80">
          {uploading ? "Uploading…" : hero ? builderContent.emptyHeroHint : builderContent.addHeroImageLabel}
        </EmptyHint>
      )}
      {error && <p className="text-xs mt-1.5 font-semibold" style={{ color: chromeTheme.dangerColor }}>{error}</p>}
    </Slot>
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

/** Static, non-interactive stand-in for the real BookingCard shown to an
 *  Employee — price/capacity/registration type aren't theirs to set, so
 *  there's nothing real to show yet; this just marks the spot so the
 *  canvas's proportions match the live page.
 *
 *  `editable` swaps that placeholder for an Admin-facing live summary of
 *  whatever's currently configured (still read-only HERE — clicking it
 *  selects CART_BLOCK_ID and the actual editing happens in the sidebar's
 *  CartEditor, same as every other slot on this canvas). */
function CartSkeleton({ editable, requiresPayment, price, currency, capacityTotal, registrationType, privateSlots, privateMinPeople, startDate }) {
  if (!editable) {
    return (
      <div className="lg:sticky lg:top-4 rounded-3xl p-6 border-2 border-dashed" style={{ borderColor: pageTheme.borderColor, backgroundColor: pageTheme.cardBackground }}>
        <span className="text-[10px] uppercase tracking-widest block mb-3 font-bold" style={{ color: pageTheme.mutedColor }}>
          {builderContent.cartSkeletonTitle}
        </span>
        <div className="grid grid-cols-2 gap-2 mb-3 pointer-events-none opacity-50">
          <div className="py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-center border" style={{ borderColor: pageTheme.borderColor, color: pageTheme.mutedColor }}>
            {pageContent.groupLabel}
          </div>
          <div className="py-2 rounded-lg text-xs font-bold uppercase tracking-widest text-center border" style={{ borderColor: pageTheme.borderColor, color: pageTheme.mutedColor }}>
            {pageContent.privateLabel}
          </div>
        </div>
        <div className="h-10 rounded-xl mb-4 opacity-30" style={{ backgroundColor: pageTheme.borderColor }} />
        <p className="text-xs" style={{ color: pageTheme.mutedColor }}>{builderContent.cartSkeletonNote}</p>
      </div>
    );
  }

  const registrationLabel = { Group: "Group only", Private: "Private only", Both: "Group + Private" }[registrationType] || registrationType;

  return (
    <div className="lg:sticky lg:top-4 rounded-3xl p-6 border-2" style={{ borderColor: pageTheme.borderColor, backgroundColor: pageTheme.cardBackground }}>
      <span className="text-[10px] uppercase tracking-widest block mb-3 font-bold" style={{ color: pageTheme.accentColor }}>
        {builderContent.cartSkeletonTitle} — click to edit
      </span>
      <div className="space-y-2.5">
        <SummaryRow label="Price" value={requiresPayment ? `${currency} ${price || 0}` : "Free"} />
        <SummaryRow label="Registration" value={registrationLabel} />
        {registrationType !== "Private" && <SummaryRow label={builderContent.experienceDateLabel} value={startDate || builderContent.dateNotSetSummary} />}
        {registrationType !== "Group" && <SummaryRow label="Private dates" value={privateSlots?.length ? `${privateSlots.length} date${privateSlots.length === 1 ? "" : "s"}` : "None set yet"} />}
        {registrationType !== "Group" && <SummaryRow label="Private min." value={`${privateMinPeople || 1} people`} />}
        <SummaryRow label="Capacity" value={capacityTotal === "" || capacityTotal == null ? "Unlimited" : capacityTotal} />
      </div>
    </div>
  );
}

/** The Admin's selectable "Booking widget — click to edit" card, reused by the
 *  builder's Registration screen so both screens edit the cart the same way. */
export function CartSlot({ selected, onClick, ...summary }) {
  return (
    <Slot selected={selected} onClick={onClick}>
      <CartSkeleton editable {...summary} />
    </Slot>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-bold uppercase tracking-widest text-[10px]" style={{ color: pageTheme.mutedColor }}>{label}</span>
      <span className="font-medium">{String(value)}</span>
    </div>
  );
}
