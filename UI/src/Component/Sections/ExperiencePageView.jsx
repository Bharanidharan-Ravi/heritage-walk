// src/Component/Sections/ExperiencePageView.jsx
//
// The actual PAGE rendering for a Walk / Seminar / Course — pulled out of
// ExperienceDetail.jsx so the exact same markup can be reused by:
//   - ExperienceDetail.jsx   (public /experiences/:id — real, saved data)
//   - ExperiencePreviewModal.jsx (admin "Preview" — unsaved builder state)
//
// so what an admin sees while editing IS the real page, not a stand-in. Takes
// one `experience`-shaped object — { title, type, contentBlocks, startDate,
// capacityRemaining, capacityTotal, requiresPayment, price, currency,
// bookingEnabled, linkedFormSlug } — and renders it generically off each
// block's `shape`, same as before: nothing here is hardcoded per field, so a
// new block type added to Config/experienceBuilder.config.jsx shows up here
// automatically.
//
// `previewMode` (set only by the admin preview) keeps the cart widget itself
// fully interactive — an admin can still play with Group/Private and the
// ticket stepper — but disarms the "Book Now" hand-off, since a
// still-being-edited experience has no id/linkedFormSlug/price to send it to
// yet (those are Admin-only, set after approval — see
// AdminExperienceBuilder.jsx).

import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { experiencePublicConfig } from "../Config/experiencePublic.config";
import { CART_OWNED_BLOCK_KEYS } from "../Config/experienceBuilder.config";
import FieldIcon from "../Config/fieldIcons";
import { hasValue, formatSimpleValue } from "./experienceBlockHelpers";

export default function ExperiencePageView({ experience, previewMode = false, onBook }) {
  const { theme, content, sectionLabels, layoutKeys, quickFacts, positiveListKeys, negativeListKeys } = experiencePublicConfig;

  const blocks = (experience.contentBlocks || []).filter((b) => !CART_OWNED_BLOCK_KEYS.includes(b.blockKey));
  const byKey = (key) => blocks.find((b) => b.blockKey === key);
  const typeLabel = content.typeLabels[experience.type?.toLowerCase()] || experience.type;

  const hero = byKey(layoutKeys.heroImage);
  const summary = byKey(layoutKeys.shortDescription);
  const fullDescription = byKey(layoutKeys.fullDescription);
  const location = byKey(layoutKeys.location);
  const meetingPoint = byKey(layoutKeys.meetingPoint);
  const gallery = byKey(layoutKeys.gallery);

  // Small chips: whichever of these blocks actually exist on this experience.
  const chipKeys = [layoutKeys.difficulty, layoutKeys.distance, layoutKeys.duration, layoutKeys.courseDuration, layoutKeys.instructorName];
  const chips = chipKeys.map(byKey).filter((b) => hasValue(b));

  // "Good to know" icon row — see experiencePublic.config.jsx's `quickFacts`.
  const quickFactKeys = quickFacts.keys.map((f) => f.key);
  const quickFactBlocks = quickFacts.keys
    .map((f) => ({ ...f, block: byKey(f.key) }))
    .filter((f) => hasValue(f.block));

  // Everything else streams down the main column in builder order, skipping
  // blocks already placed above/in the sidebar so nothing renders twice.
  const placedKeys = new Set([
    layoutKeys.heroImage, layoutKeys.title, layoutKeys.shortDescription, layoutKeys.fullDescription,
    layoutKeys.location, layoutKeys.meetingPoint, layoutKeys.gallery,
    ...chipKeys, ...quickFactKeys,
  ]);
  const streamBlocks = blocks.filter((b) => !placedKeys.has(b.blockKey) && hasValue(b));

  // pt-28 clears the public site's fixed navbar (Component/Layout/Layout.jsx),
  // which only wraps the live page (ExperienceDetail.jsx). The admin preview
  // (ExperiencePreviewModal.jsx) isn't inside that Layout — it has its own
  // slim sticky "Live Preview" bar instead — so that much top padding is
  // pure dead space there; use a small one just to clear that bar instead.
  return (
    <section className={`${previewMode ? "pt-10" : "pt-24"} pb-12 min-h-screen`} style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <Breadcrumb theme={theme} content={content} typeLabel={typeLabel} title={experience.title} />

        <div className="flex flex-col lg:flex-row gap-8 xl:gap-10 mt-4">
          {/* LEFT: content */}
          <div className="lg:w-2/3 min-w-0">
            <p className="uppercase tracking-widest text-xs font-bold mb-3" style={{ color: theme.accentColor }}>
              {typeLabel}
            </p>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-serif font-medium mb-4 leading-tight">
              {experience.title || "Untitled experience"}
            </h1>

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {chips.map((b) => (
                  <span
                    key={b.blockKey}
                    className="px-3 py-1 rounded-full text-xs font-semibold border"
                    style={{ borderColor: theme.borderColor, color: theme.mutedColor }}
                  >
                    {b.blockKey === layoutKeys.instructorName ? "Guide: " : ""}{formatSimpleValue(b)}
                  </span>
                ))}
              </div>
            )}

            {/* HERO IMAGE — the "Hero image" block (an image URL, pasted in
                the block's settings panel) is optional. When it's set, it
                renders as the big banner right under the title/chips and
                above everything else on the page. When it's not set, no
                space is reserved for it at all — the Overview section below
                simply moves up to the top, in both preview and the live
                page. */}
            {hero?.value && (
              <div className="rounded-2xl overflow-hidden shadow-xl mb-5">
                <img src={hero.value} alt={experience.title} className="w-full h-60 md:h-80 object-cover" />
              </div>
            )}

            {(hasValue(summary) || hasValue(fullDescription)) && (
              <div
                className="mb-4 rounded-2xl border p-6 md:p-8 shadow-lg shadow-black/5 backdrop-blur-xl"
                style={{ borderColor: theme.glassBorder, backgroundColor: theme.glassBackground }}
              >
                <SectionTitle theme={theme}>{content.overviewCardTitle}</SectionTitle>
                {hasValue(summary) && (
                  // Admin-authored rich HTML (RichTextEditor, never visitor
                  // input) — see Admin/ExperienceBuilder/RichTextEditor.jsx.
                  <div
                    className="text-lg md:text-xl font-serif mb-4 pl-5 border-l-4 whitespace-pre-wrap **:max-w-full"
                    style={{
                      borderColor: theme.accentColor,
                      color: theme.textColor,
                      lineHeight: summary.lineHeight || undefined,
                      fontFamily: summary.fontFamily || undefined,
                      fontSize: summary.fontSize || undefined,
                      fontWeight: summary.fontWeight || undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: summary.value }}
                  />
                )}
                {hasValue(fullDescription) && (
                  <div
                    className="text-[15px] md:text-base whitespace-pre-wrap **:max-w-full"
                    style={{
                      color: theme.mutedColor,
                      lineHeight: fullDescription.lineHeight || "2",
                      fontFamily: fullDescription.fontFamily || undefined,
                      fontSize: fullDescription.fontSize || undefined,
                      fontWeight: fullDescription.fontWeight || undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: fullDescription.value }}
                  />
                )}
              </div>
            )}

            {quickFactBlocks.length > 0 && (
              <div
                className="mb-4 rounded-2xl border p-5 md:p-6 shadow-lg shadow-black/5 backdrop-blur-xl"
                style={{ borderColor: theme.glassBorder, backgroundColor: theme.glassBackground }}
              >
                <QuickFactsGrid facts={quickFactBlocks} theme={theme} title={quickFacts.title} />
              </div>
            )}

            {/* GALLERY / LOCATION — fixed position, rendered BEFORE the
                stream so whatever ends up last in the stream (FAQ always
                does, see sortFaqLast in useExperienceBuilder.js) reads as
                the true bottom of the page. */}
            {hasValue(gallery) && (
              <div
                className="mb-4 rounded-2xl border p-5 md:p-6 shadow-lg shadow-black/5 backdrop-blur-xl"
                style={{ borderColor: theme.glassBorder, backgroundColor: theme.glassBackground }}
              >
                <SectionTitle theme={theme}>{content.galleryCardTitle}</SectionTitle>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {gallery.items.map((src, i) => (
                    <img key={i} src={src} alt={`${experience.title} ${i + 1}`} className="w-full h-32 object-cover rounded-xl" />
                  ))}
                </div>
              </div>
            )}

            {(hasValue(location) || hasValue(meetingPoint)) && (
              <div
                className="mb-4 rounded-2xl border p-5 md:p-6 shadow-lg shadow-black/5 backdrop-blur-xl"
                style={{ borderColor: theme.glassBorder, backgroundColor: theme.glassBackground }}
              >
                <SectionTitle theme={theme}>{content.mapCardTitle}</SectionTitle>
                <div className="grid sm:grid-cols-2 gap-6">
                  {hasValue(meetingPoint) && (
                    <LocationPoint
                      theme={theme}
                      label={content.startingPointLabel}
                      value={meetingPoint.value}
                      getDirectionsLabel={content.getDirectionsLabel}
                    />
                  )}
                  {hasValue(location) && (
                    <LocationPoint
                      theme={theme}
                      label={hasValue(meetingPoint) ? content.endingPointLabel : content.startingPointLabel}
                      value={location.value}
                      getDirectionsLabel={content.getDirectionsLabel}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {streamBlocks.map((block) => (
                <div
                  key={block.blockKey}
                  className="rounded-2xl border p-5 md:p-6 shadow-lg shadow-black/5 backdrop-blur-xl"
                  style={{ borderColor: theme.glassBorder, backgroundColor: theme.glassBackground }}
                >
                  <BlockSection
                    block={block}
                    theme={theme}
                    sectionLabels={sectionLabels}
                    positiveListKeys={positiveListKeys}
                    negativeListKeys={negativeListKeys}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: sticky booking / cart card */}
          <div className="lg:w-1/3">
            <BookingCard experience={experience} theme={theme} content={content} previewMode={previewMode} onBook={onBook} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Breadcrumb({ theme, content, typeLabel, title }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium" style={{ color: theme.mutedColor }}>
      <Link to="/" className="hover:underline">{content.breadcrumbHome}</Link>
      <span>/</span>
      <Link to="/experiences" className="hover:underline">{content.breadcrumbExperiences}</Link>
      <span>/</span>
      <span>{typeLabel}</span>
      <span>/</span>
      <span className="truncate max-w-50" style={{ color: theme.textColor }}>{title || "Untitled experience"}</span>
    </nav>
  );
}

function LocationPoint({ theme, label, value, getDirectionsLabel }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold" style={{ color: theme.mutedColor }}>{label}</span>
      <p className="font-medium mb-1">{value}</p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block text-sm font-bold"
        style={{ color: theme.accentColor }}
      >
        {getDirectionsLabel}
      </a>
    </div>
  );
}

// Exported so the admin registration screens can show the very same card.
// `actionLabel`/`actionNote` override the preview-mode button text.
export function BookingCard({ experience, theme, content, previewMode, onBook, actionLabel, actionNote }) {
  const spots = experience.capacityRemaining;
  const unlimited = experience.capacityTotal == null;
  const soldOut = !unlimited && spots <= 0;
  const maxQty = unlimited ? 50 : Math.max(1, spots);

  // Which option(s) an Admin allowed — set from the Experience Builder's cart
  // widget. "Individual" is the pre-rename spelling of Group, so anything saved
  // before then still reads correctly.
  const registrationType = experience.registrationType === "Individual"
    ? "Group"
    : experience.registrationType || "Group";
  const allowGroup = registrationType !== "Private";
  const allowPrivate = registrationType !== "Group";
  const privateMin = Math.max(1, experience.privateMinPeople || 1);

  const [regType, setRegType] = useState(allowGroup ? "Group" : "Private");
  const [qty, setQty] = useState(allowGroup ? 1 : privateMin);
  // Private has a minimum party size; Group can be any headcount from 1.
  const minQty = regType === "Private" ? privateMin : 1;

  // Each option has its own list of dates. A Private booking always needs one
  // picked; a Group booking only does when the Admin configured Group dates
  // (otherwise the booking deadline alone gates it, as before).
  // Only a Private booking picks a date; Group has none.
  const slots = regType === "Private" ? (experience.privateSlots || []) : [];
  const [selectedSlot, setSelectedSlot] = useState("");
  // Scroll handle for the slot slider's forward/backward arrow buttons.
  const slotTrackRef = useRef(null);
  const scrollSlots = (dir) => {
    const el = slotTrackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  // Switching option resets the headcount to that option's minimum and drops
  // any slot choice — a date picked for one option isn't valid for the other.
  const selectGroup = () => { setRegType("Group"); setQty(1); setSelectedSlot(""); };
  const selectPrivate = () => { setRegType("Private"); setQty(Math.min(privateMin, maxQty)); setSelectedSlot(""); };

  const clampQty = (n) => Math.max(minQty, Math.min(maxQty, n));

  const total = useMemo(() => {
    if (!experience.requiresPayment) return null;
    return experience.price * qty;
  }, [experience.requiresPayment, experience.price, qty]);

  // Book Now stays locked until a date is chosen whenever the option needs one.
  const needsSlot = regType === "Private";
  const slotReady = !needsSlot || Boolean(selectedSlot);

  const bookUrl = `/forms/${experience.linkedFormSlug}?qty=${qty}&registrationType=${encodeURIComponent(regType)}`
    + (selectedSlot ? `&slot=${encodeURIComponent(selectedSlot)}` : "");

  return (
    <div
      className="lg:sticky lg:top-28 rounded-3xl p-7 shadow-2xl border backdrop-blur-xl"
      style={{ backgroundColor: theme.glassBackground, borderColor: theme.glassBorder }}
    >
      <div className="mb-6">
        <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold" style={{ color: theme.mutedColor }}>{content.startingFromLabel}</span>
        <span className="font-bold text-3xl">
          {experience.requiresPayment ? `${experience.currency} ${experience.price}` : content.freeLabel}
        </span>
        {experience.requiresPayment && <span className="text-sm ml-2" style={{ color: theme.mutedColor }}>{content.perGuestSuffix}</span>}
        {previewMode && <p className="text-xs mt-2" style={{ color: theme.mutedColor }}>{content.previewPriceNote}</p>}
      </div>

      {/* Cart widget: Individual/Private + ticket stepper. Fully interactive
          even in preview, so an admin can see exactly how a visitor will use
          it before the experience is published. Only the toggle(s) allowed
          by the Admin's Registration type setting render — a single allowed
          option shows as one non-toggling pill instead of a 2-up grid. */}
      <div className="space-y-5 pb-6 border-b" style={{ borderColor: theme.glassBorder }}>
        <div>
          <span className="text-[10px] uppercase tracking-widest block mb-2 font-bold" style={{ color: theme.mutedColor }}>{content.registrationTypeLabel}</span>
          <div className={`grid gap-2 ${allowGroup && allowPrivate ? "grid-cols-2" : "grid-cols-1"}`}>
            {allowGroup && <SegmentButton active={regType === "Group"} onClick={selectGroup} theme={theme}>{content.groupLabel}</SegmentButton>}
            {allowPrivate && <SegmentButton active={regType === "Private"} onClick={selectPrivate} theme={theme}>{content.privateLabel}</SegmentButton>}
          </div>
        </div>

        {/* Private has no fixed date of its own — the visitor must pick one
            of the Admin's configured dates before Book Now unlocks below. */}
        {needsSlot && (
          <div>
            <span className="text-[10px] uppercase tracking-widest block mb-2 font-bold" style={{ color: theme.mutedColor }}>{content.chooseSlotLabel}</span>
            {slots.length === 0 ? (
              <p className="text-sm" style={{ color: theme.mutedColor }}>{content.noSlotsAvailableLabel}</p>
            ) : (
              // Horizontal slider instead of a wrapping grid — one snap-scrollable
              // row (swipeable on mobile) plus forward/backward buttons for
              // pointer/keyboard users, so a long slot list stays compact.
              <div className="flex items-center gap-1">
                <SlotArrowButton direction="back" onClick={() => scrollSlots(-1)} theme={theme} label={content.previousSlotsLabel} />
                <div
                  ref={slotTrackRef}
                  className="flex gap-2 overflow-x-auto pb-1 px-1 scroll-smooth"
                  style={{ scrollSnapType: "x proximity", scrollbarWidth: "thin" }}
                >
                  {slots.map((s) => (
                    <SlotButton key={s} active={selectedSlot === s} onClick={() => setSelectedSlot(s)} theme={theme}>
                      {new Date(s).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                    </SlotButton>
                  ))}
                </div>
                <SlotArrowButton direction="forward" onClick={() => scrollSlots(1)} theme={theme} label={content.nextSlotsLabel} />
              </div>
            )}
          </div>
        )}

        <div>
          <span className="text-[10px] uppercase tracking-widest block mb-2 font-bold" style={{ color: theme.mutedColor }}>{content.ticketsLabel}</span>
          <div
            className="flex items-center gap-4 rounded-xl border px-3 py-2 w-max backdrop-blur-sm"
            style={{ borderColor: theme.glassBorder, backgroundColor: theme.glassInsetBackground }}
          >
            <StepperButton
              disabled={qty <= minQty}
              onClick={() => setQty((q) => clampQty(q - 1))}
              theme={theme}
            >
              −
            </StepperButton>
            <span className="w-6 text-center font-bold">{qty}</span>
            <StepperButton
              disabled={qty >= maxQty}
              onClick={() => setQty((q) => clampQty(q + 1))}
              theme={theme}
            >
              +
            </StepperButton>
          </div>
          {regType === "Private" && (
            <p className="text-xs mt-2" style={{ color: theme.mutedColor }}>{content.minPeopleNote(privateMin)}</p>
          )}
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {!needsSlot && (
            <div>
              <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold" style={{ color: theme.mutedColor }}>{content.experienceDateLabel}</span>
              <span className="font-medium">
                {experience.startDate ? new Date(experience.startDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : content.dateNotSetLabel}
              </span>
            </div>
          )}
          {experience.bookingEndDate && (
            <div>
              <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold" style={{ color: theme.mutedColor }}>{content.bookingEndsLabel}</span>
              <span className="font-medium">
                {new Date(experience.bookingEndDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          )}
          <div>
            <span className="text-[10px] uppercase tracking-widest block mb-1 font-bold" style={{ color: theme.mutedColor }}>Availability</span>
            <span className="font-medium">
              {soldOut ? content.soldOutLabel : unlimited ? content.unlimitedSpotsLabel : content.spotsLeftLabel(spots)}
            </span>
          </div>
        </div>

        {total !== null && (
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-sm font-bold uppercase tracking-widest" style={{ color: theme.mutedColor }}>{content.totalLabel}</span>
            <span className="font-bold text-xl">{experience.currency} {total}</span>
          </div>
        )}
      </div>

      <div className="pt-6">
        {previewMode ? (
          <>
            {/* With an onBook hand-off (admin preview) the button opens the
                registration page; without one it stays inert as before. */}
            <button
              type="button"
              disabled={!onBook}
              onClick={onBook}
              className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all ${
                onBook ? "hover:-translate-y-1 shadow-lg" : "cursor-not-allowed opacity-50"
              }`}
              style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}
            >
              {actionLabel || content.previewBookLabel}
            </button>
            <p className="text-xs mt-3 text-center" style={{ color: theme.mutedColor }}>
              {actionNote || (onBook ? content.previewBookOpenNote : content.previewBookNote)}
            </p>
          </>
        ) : soldOut ? (
          <DisabledBookButton theme={theme}>{content.soldOutLabel}</DisabledBookButton>
        ) : !experience.bookingEnabled ? (
          <DisabledBookButton theme={theme}>
            {experience.linkedFormSlug ? content.bookingClosedLabel : content.bookingComingSoonLabel}
          </DisabledBookButton>
        ) : !slotReady ? (
          <>
            <DisabledBookButton theme={theme}>{content.chooseSlotToBookLabel}</DisabledBookButton>
            <p className="text-xs mt-3 text-center" style={{ color: theme.mutedColor }}>{content.selectSlotHint}</p>
          </>
        ) : (
          <>
            <Link
              to={bookUrl}
              className="w-full block text-center py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:-translate-y-1 transition-all shadow-lg"
              style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}
            >
              {content.checkAvailabilityLabel}
            </Link>
            <p className="text-xs mt-3 text-center" style={{ color: theme.mutedColor }}>{content.bookingHint}</p>
          </>
        )}
      </div>
    </div>
  );
}

function DisabledBookButton({ theme, children }) {
  return (
    <button type="button" disabled className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm cursor-not-allowed opacity-50" style={{ backgroundColor: theme.mutedColor, color: theme.cardBackground }}>
      {children}
    </button>
  );
}

function SlotButton({ active, onClick, theme, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-bold border transition-colors"
      style={active
        ? { backgroundColor: theme.accentColor, borderColor: theme.accentColor, color: theme.pageBackground, scrollSnapAlign: "start" }
        : { backgroundColor: "transparent", borderColor: theme.glassBorder, color: theme.mutedColor, scrollSnapAlign: "start" }}
    >
      {children}
    </button>
  );
}

function SlotArrowButton({ direction, onClick, theme, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="shrink-0 grid place-items-center w-7 h-7 rounded-full border transition-colors"
      style={{ borderColor: theme.glassBorder, color: theme.mutedColor }}
    >
      {direction === "back" ? "‹" : "›"}
    </button>
  );
}

function SegmentButton({ active, onClick, theme, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-colors"
      style={active
        ? { backgroundColor: theme.accentColor, borderColor: theme.accentColor, color: theme.pageBackground }
        : { backgroundColor: "transparent", borderColor: theme.glassBorder, color: theme.mutedColor }}
    >
      {children}
    </button>
  );
}

function StepperButton({ disabled, onClick, theme, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="w-6 h-6 grid place-items-center rounded-full border font-bold leading-none disabled:opacity-30 transition-opacity"
      style={{ borderColor: theme.accentColor, color: theme.accentColor }}
    >
      {children}
    </button>
  );
}

/**
 * Generic per-shape renderer — the piece that keeps this page block-agnostic.
 * Exported (along with SectionTitle/BlockValue/hasValue/formatSimpleValue)
 * so Admin/ExperienceBuilder/ExperienceCanvas.jsx can render the exact same
 * styled output for the generic block stream — the canvas is a WYSIWYG
 * editor built on this page's own rendering, not a lookalike.
 */
export function BlockSection({ block, theme, sectionLabels, positiveListKeys, negativeListKeys }) {
  const label = sectionLabels[block.blockKey] || block.label;

  return (
    <div>
      <SectionTitle theme={theme}>{label}</SectionTitle>
      <BlockValue block={block} theme={theme} positiveListKeys={positiveListKeys} negativeListKeys={negativeListKeys} />
    </div>
  );
}

export function SectionTitle({ theme, children }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="w-8 h-0.5 rounded-full shrink-0" style={{ backgroundColor: theme.accentColor }} />
      <h2 className="text-lg md:text-xl font-serif" style={{ color: theme.textColor }}>{children}</h2>
    </div>
  );
}

export function BlockValue({ block, theme, positiveListKeys = [], negativeListKeys = [] }) {
  switch (block.shape) {
    case "faqList":
      return (
        <div className="divide-y" style={{ borderColor: theme.borderColor }}>
          {block.items.map((it, i) => (
            <details key={i} className="py-3 group">
              <summary className="font-semibold cursor-pointer list-none flex items-center justify-between gap-4">
                {it.question}
                <span className="transition-transform group-open:rotate-45 text-xl leading-none" style={{ color: theme.accentColor }}>+</span>
              </summary>
              <p className="mt-2 whitespace-pre-wrap" style={{ color: theme.mutedColor }}>{it.answer}</p>
            </details>
          ))}
        </div>
      );
    case "modules":
      // "Full itinerary / roadmap" — an ordered plan, styled as a timeline.
      return (
        <ol className="relative border-l-2 pl-6 space-y-4" style={{ borderColor: theme.borderColor }}>
          {block.items.map((it, i) => (
            <li key={i} className="relative">
              <span
                className="absolute -left-7.75 top-0.5 w-4 h-4 rounded-full border-2"
                style={{ backgroundColor: theme.pageBackground, borderColor: theme.accentColor }}
              />
              <p className="font-semibold mb-1">{it.title || `Step ${i + 1}`}</p>
              {it.topics?.length > 0 && (
                <ul className="list-disc list-inside space-y-0.5" style={{ color: theme.mutedColor }}>
                  {it.topics.map((t, j) => <li key={j}>{t}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ol>
      );
    case "repeatableList": {
      // Blank rows (an "Add an item…" the admin hasn't filled in yet) aren't shown.
      const items = (block.items || []).filter((it) => String(it ?? "").trim() !== "");
      if (positiveListKeys.includes(block.blockKey)) {
        return (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckIcon color={theme.accentColor} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        );
      }
      if (negativeListKeys.includes(block.blockKey)) {
        return (
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {items.map((it, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CrossIcon color={theme.dangerColor} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        );
      }
      return (
        <ul className="list-disc list-inside space-y-1">
          {items.map((it, i) => <li key={i}>{it}</li>)}
        </ul>
      );
    }
    case "gallery":
      return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {block.items.map((src, i) => <img key={i} src={src} alt="" className="w-full h-32 object-cover rounded-xl" />)}
        </div>
      );
    case "toggle":
      return <p>{block.value ? "Yes" : "No"}</p>;
    case "videoUrl":
      return block.value ? (
        <a href={block.value} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: theme.accentColor }}>Watch video ↗</a>
      ) : null;
    case "richHtml":
      // Admin-authored rich HTML (RichTextEditor), never visitor input.
      return (
        <div
          className="whitespace-pre-wrap **:max-w-full"
          style={{
            lineHeight: block.lineHeight || undefined,
            fontFamily: block.fontFamily || undefined,
            fontSize: block.fontSize || undefined,
            fontWeight: block.fontWeight || undefined,
          }}
          dangerouslySetInnerHTML={{ __html: block.value }}
        />
      );
    default:
      return <p className="whitespace-pre-wrap leading-relaxed">{block.value}</p>;
  }
}

/**
 * "Good to know" quick-facts row (see experiencePublic.config.jsx's
 * `quickFacts`) — icon tiles instead of full-width text sections, since
 * these blocks are toggle-only (ageRequirement is the sole typed value).
 * Responsive: 2-up on phones, 3-up from sm, 5-up from lg — enough room for
 * every quick fact to sit on one row on a large screen without ever
 * overflowing a small one.
 */
function QuickFactsGrid({ facts, theme, title }) {
  return (
    <div>
      <SectionTitle theme={theme}>{title}</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {facts.map(({ block, icon }) => (
          <QuickFactTile key={block.blockKey} block={block} icon={icon} theme={theme} />
        ))}
      </div>
    </div>
  );
}

function QuickFactTile({ block, icon, theme }) {
  const isToggle = block.shape === "toggle";
  const isOn = isToggle ? Boolean(block.value) : true;

  return (
    <div
      className="flex flex-col items-center text-center gap-2 rounded-2xl border px-3 py-3 backdrop-blur-sm"
      style={{ borderColor: theme.glassBorder, backgroundColor: theme.glassInsetBackground, opacity: isToggle && !isOn ? 0.5 : 1 }}
    >
      <span
        className="grid place-items-center w-11 h-11 rounded-full"
        style={{ backgroundColor: `${theme.accentColor}1a`, color: theme.accentColor }}
      >
        <FieldIcon name={icon} className="w-5.5 h-5.5" />
      </span>
      <span className="text-xs font-semibold leading-tight">{block.label}</span>
      {isToggle ? (
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: isOn ? theme.accentColor : theme.mutedColor }}>
          {isOn ? "Yes" : "No"}
        </span>
      ) : (
        <span className="text-[11px]" style={{ color: theme.mutedColor }}>{block.value}</span>
      )}
    </div>
  );
}

function CheckIcon({ color }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" className="shrink-0 mt-0.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8.5" />
      <path d="M6.5 10.2l2.4 2.4 4.6-5.2" />
    </svg>
  );
}

function CrossIcon({ color }) {
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" className="shrink-0 mt-0.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8.5" />
      <path d="M7 7l6 6M13 7l-6 6" />
    </svg>
  );
}

