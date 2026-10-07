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
//
// Look: solid white "surface" cards on the cream page (theme.surface*), small
// type, and a deep-ink primary button — every colour comes from
// experiencePublicConfig.theme.

import React, { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { experiencePublicConfig } from "../Config/experiencePublic.config";
import { CART_OWNED_BLOCK_KEYS } from "../Config/experienceBuilder.config";
import FieldIcon from "../Config/fieldIcons";
import { hasValue, formatSimpleValue, unitPriceFor, startingPrice } from "./experienceBlockHelpers";

// Icon per "at a glance" meta item under the title (keys into fieldIcons).
const GLANCE_ICONS = { difficulty: "difficulty", distance: "distance", duration: "clock", courseDuration: "clock", instructorName: "instructor" };

const formatDate = (d) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function ExperiencePageView({ experience, previewMode = false, onBook, cartSelection, onCartSelectionChange }) {
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

  // "At a glance" meta row: whichever of these blocks actually exist on this experience.
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

  // The live page (ExperienceDetail.jsx) sits inside Component/Layout/Layout.jsx,
  // whose wrapper already adds pt-28 to clear the fixed navbar — so only a small
  // top gap is needed here. The admin preview (ExperiencePreviewModal.jsx) isn't
  // inside that Layout but has its own slim sticky "Live Preview" bar.
  return (
    <section className={`${previewMode ? "pt-8" : "pt-4"} pb-16 min-h-screen text-[14px]`} style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumb theme={theme} content={content} typeLabel={typeLabel} title={experience.title} />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 xl:gap-8 mt-5">
          {/* LEFT: content */}
          <div className="min-w-0 space-y-3">
            <header className="mb-2">
              <TypeBadge theme={theme}>{typeLabel}</TypeBadge>
              <h1 className="text-[28px] md:text-[34px] lg:text-[38px] font-serif font-medium leading-[1.15] tracking-tight mt-3">
                {experience.title || "Untitled experience"}
              </h1>

              {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-3">
                  {chips.map((b) => (
                    <span key={b.blockKey} className="inline-flex items-center gap-1.5 text-[13px]" style={{ color: theme.mutedColor }}>
                      <span style={{ color: theme.accentStrong }}>
                        <FieldIcon name={GLANCE_ICONS[b.blockKey] || "list"} className="w-4 h-4" />
                      </span>
                      <span>{content.atAGlanceLabels[b.blockKey]}</span>
                      <span className="font-semibold" style={{ color: theme.textColor }}>{formatSimpleValue(b)}</span>
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* HERO IMAGE — optional. When it's not set, no space is reserved
                for it at all and the Overview simply moves up. */}
            {hero?.value && (
              <div className="rounded-3xl overflow-hidden ring-1 ring-black/5" style={{ boxShadow: theme.surfaceShadow }}>
                <img src={hero.value} alt={experience.title} className="w-full h-56 sm:h-72 md:h-[360px] object-cover" />
              </div>
            )}

            {(hasValue(summary) || hasValue(fullDescription)) && (
              <Surface theme={theme}>
                <SectionTitle theme={theme}>{content.overviewCardTitle}</SectionTitle>
                {hasValue(summary) && (
                  // Admin-authored rich HTML (RichTextEditor, never visitor
                  // input) — see Admin/ExperienceBuilder/RichTextEditor.jsx.
                  <div
                    className="text-[15px] md:text-[16px] font-serif leading-relaxed mb-3 pl-4 border-l-2 whitespace-pre-wrap **:max-w-full"
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
                    className="text-[14px] whitespace-pre-wrap **:max-w-full"
                    style={{
                      color: theme.mutedColor,
                      lineHeight: fullDescription.lineHeight || "1.8",
                      fontFamily: fullDescription.fontFamily || undefined,
                      fontSize: fullDescription.fontSize || undefined,
                      fontWeight: fullDescription.fontWeight || undefined,
                    }}
                    dangerouslySetInnerHTML={{ __html: fullDescription.value }}
                  />
                )}
              </Surface>
            )}

            {quickFactBlocks.length > 0 && (
              <Surface theme={theme}>
                <QuickFactsGrid facts={quickFactBlocks} theme={theme} title={quickFacts.title} />
              </Surface>
            )}

            {/* GALLERY / LOCATION — fixed position, rendered BEFORE the
                stream so whatever ends up last in the stream (FAQ always
                does, see sortFaqLast in useExperienceBuilder.js) reads as
                the true bottom of the page. */}
            {hasValue(gallery) && (
              <Surface theme={theme}>
                <SectionTitle theme={theme}>{content.galleryCardTitle}</SectionTitle>
                <GalleryGrid items={gallery.items} alt={experience.title} />
              </Surface>
            )}

            {(hasValue(location) || hasValue(meetingPoint)) && (
              <Surface theme={theme}>
                <SectionTitle theme={theme}>{content.mapCardTitle}</SectionTitle>
                <div className="grid sm:grid-cols-2 gap-3">
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
              </Surface>
            )}

            {streamBlocks.length > 0 && (
              <div className="grid grid-cols-12 gap-3">
                {streamBlocks.map((block) => {
                  const width = block.width || 12;
                  return (
                    <Surface key={block.blockKey} theme={theme} style={{ gridColumn: `span ${width} / span ${width}` }}>
                      <BlockSection
                        block={block}
                        theme={theme}
                        sectionLabels={sectionLabels}
                        positiveListKeys={positiveListKeys}
                        negativeListKeys={negativeListKeys}
                      />
                    </Surface>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: sticky booking / cart card */}
          <aside id="booking-card" className="min-w-0 scroll-mt-20">
            <BookingCard
              experience={experience}
              theme={theme}
              content={content}
              previewMode={previewMode}
              onBook={onBook}
              selection={cartSelection}
              onSelectionChange={onCartSelectionChange}
            />
          </aside>
        </div>
      </div>

      {/* Phones/tablets: the card sits below all the content, so keep the
          price and a jump-to-booking button pinned to the bottom edge. */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-20 border-t px-4 py-3 flex items-center justify-between gap-3 backdrop-blur-xl"
        style={{ backgroundColor: "rgba(255,255,255,0.9)", borderColor: theme.surfaceBorder }}
      >
        <div className="min-w-0">
          <span className="text-[11px] block" style={{ color: theme.mutedColor }}>{content.startingFromLabel}</span>
          <span className="text-[16px] font-semibold">
            {experience.requiresPayment ? `${experience.currency} ${startingPrice(experience)}` : content.freeLabel}
          </span>
          {experience.requiresPayment && <span className="text-[12px] ml-1" style={{ color: theme.mutedColor }}>{content.perGuestSuffix}</span>}
        </div>
        <button
          type="button"
          onClick={() => document.getElementById("booking-card")?.scrollIntoView({ behavior: "smooth", block: "start" })}
          className="h-10 px-5 rounded-xl text-[13px] font-semibold shrink-0"
          style={{ backgroundColor: theme.primaryButtonBackground, color: theme.primaryButtonText }}
        >
          {content.bookNowLabel}
        </button>
      </div>
      <div className="lg:hidden h-16" aria-hidden />
    </section>
  );
}

/** White content card used for every section on the page. */
export function Surface({ theme, className = "", style, children }) {
  return (
    <div
      className={`rounded-2xl border p-4 md:p-5 ${className}`}
      style={{ backgroundColor: theme.surfaceBackground, borderColor: theme.surfaceBorder, boxShadow: theme.surfaceShadow, ...style }}
    >
      {children}
    </div>
  );
}

/** Small gold pill with a dot — the experience type above the title. */
export function TypeBadge({ theme, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.16em]"
      style={{ backgroundColor: theme.accentSoft, color: theme.accentStrong }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.accentColor }} />
      {children}
    </span>
  );
}

/** "1 Choose — 2 Your details — 3 Payment" strip on the registration screen. */
export function RegistrationSteps({ theme, steps, active }) {
  return (
    <ol className="flex items-center gap-2 text-[12px]">
      {steps.map((step, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={step} className="flex items-center gap-2">
            {i > 0 && <span className="w-5 sm:w-8 h-px" style={{ backgroundColor: done || current ? theme.accentColor : "rgba(11,23,32,0.15)" }} />}
            <span
              className="grid place-items-center w-5.5 h-5.5 rounded-full text-[10.5px] font-bold"
              style={current
                ? { backgroundColor: theme.primaryButtonBackground, color: theme.primaryButtonText }
                : done
                  ? { backgroundColor: theme.accentColor, color: "#fff" }
                  : { backgroundColor: "transparent", color: theme.mutedColor, border: "1px solid rgba(11,23,32,0.18)" }}
            >
              {done ? "✓" : i + 1}
            </span>
            <span className={current ? "font-semibold" : ""} style={{ color: current ? theme.textColor : theme.mutedColor }}>{step}</span>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Home / Experiences / Type / Title — and on the registration screen, the
 * title becomes a link back to the page (onTitleClick) followed by `current`.
 */
export function Breadcrumb({ theme, content, typeLabel, title, onTitleClick, current }) {
  const titleText = title || "Untitled experience";
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-[12px]" style={{ color: theme.mutedColor }}>
      <Link to="/" className="hover:underline">{content.breadcrumbHome}</Link>
      <span className="opacity-50">/</span>
      <Link to="/experiences" className="hover:underline">{content.breadcrumbExperiences}</Link>
      <span className="opacity-50">/</span>
      <span>{typeLabel}</span>
      <span className="opacity-50">/</span>
      {onTitleClick ? (
        <button type="button" onClick={onTitleClick} className="truncate max-w-50 hover:underline" style={{ color: theme.accentStrong }}>
          {titleText}
        </button>
      ) : (
        <span className="truncate max-w-50 font-medium" style={{ color: theme.textColor }}>{titleText}</span>
      )}
      {current && (
        <>
          <span className="opacity-50">/</span>
          <span className="font-medium" style={{ color: theme.textColor }}>{current}</span>
        </>
      )}
    </nav>
  );
}

function LocationPoint({ theme, label, value, getDirectionsLabel }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ backgroundColor: theme.insetBackground }}>
      <span className="grid place-items-center w-7 h-7 rounded-full shrink-0 bg-white" style={{ color: theme.accentStrong }}>
        <FieldIcon name="location" className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0">
        <span className="text-[10px] uppercase tracking-[0.14em] block font-semibold" style={{ color: theme.mutedColor }}>{label}</span>
        <p className="text-[13.5px] font-semibold leading-snug">{value}</p>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block text-[12px] font-semibold hover:underline"
          style={{ color: theme.accentStrong }}
        >
          {getDirectionsLabel}
        </a>
      </div>
    </div>
  );
}

// Exported so the admin registration screens can show the very same card.
// `actionLabel`/`actionNote` override the preview-mode button text.
//
// `selection` / `onSelectionChange` ({ regType, qty, slot }) are optional: pass
// them to share one cart choice between cards (the page's and the
// registration screen's) so a change on either shows up on the other.
// Without them the card keeps its own state, as before.
//
// `submitFormId` (the public registration page, FormPage.jsx) turns the Book
// Now link into that form's submit button — `submitLabel` / `submitting` /
// `actionError` go with it — so the visitor can still change the cart right
// up until they pay.
export function BookingCard({
  experience, theme, content, previewMode, onBook, actionLabel, actionNote, selection, onSelectionChange,
  submitFormId, submitLabel, submitting = false, actionError = "",
}) {
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

  const initialSelection = { regType: allowGroup ? "Group" : "Private", qty: allowGroup ? 1 : privateMin, slot: "" };
  const [ownSelection, setOwnSelection] = useState(initialSelection);
  // A shared selection whose option the Admin has since disallowed falls back
  // to the defaults rather than showing a choice that can't be booked.
  const candidate = selection || ownSelection;
  const current = (candidate.regType === "Group" ? allowGroup : allowPrivate) ? candidate : initialSelection;
  const updateSelection = (patch) => {
    const next = { ...current, ...patch };
    setOwnSelection(next);
    onSelectionChange?.(next);
  };

  const regType = current.regType;
  const qty = current.qty;
  const selectedSlot = current.slot;
  const setSelectedSlot = (slot) => updateSelection({ slot });
  // Private has a minimum party size; Group can be any headcount from 1.
  const minQty = regType === "Private" ? privateMin : 1;

  // Only a Private booking picks a date; Group has none.
  const slots = regType === "Private" ? (experience.privateSlots || []) : [];
  // Scroll handle for the slot slider's forward/backward arrow buttons.
  const slotTrackRef = useRef(null);
  const scrollSlots = (dir) => {
    const el = slotTrackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  // Switching option resets the headcount to that option's minimum and drops
  // any slot choice — a date picked for one option isn't valid for the other.
  const selectGroup = () => updateSelection({ regType: "Group", qty: 1, slot: "" });
  const selectPrivate = () => updateSelection({ regType: "Private", qty: Math.min(privateMin, maxQty), slot: "" });

  const clampQty = (n) => Math.max(minQty, Math.min(maxQty, n));
  const setQty = (n) => updateSelection({ qty: clampQty(n) });

  // Public and Private can be priced differently — see unitPriceFor.
  const unitPrice = unitPriceFor(experience, regType);
  const total = useMemo(() => {
    if (!experience.requiresPayment) return null;
    return unitPrice * qty;
  }, [experience.requiresPayment, unitPrice, qty]);

  // Book Now stays locked until a date is chosen whenever the option needs one.
  const needsSlot = regType === "Private";
  const slotReady = !needsSlot || Boolean(selectedSlot);

  const bookUrl = `/forms/${experience.linkedFormSlug}?qty=${qty}&registrationType=${encodeURIComponent(regType)}`
    + (selectedSlot ? `&slot=${encodeURIComponent(selectedSlot)}` : "");

  const infoRows = [
    !needsSlot && { icon: "date", label: content.experienceDateLabel, value: experience.startDate ? formatDate(experience.startDate) : content.dateNotSetLabel },
    experience.bookingEndDate && { icon: "clock", label: content.bookingEndsLabel, value: formatDate(experience.bookingEndDate) },
    {
      icon: "users",
      label: content.availabilityLabel,
      value: soldOut ? content.soldOutLabel : unlimited ? content.unlimitedSpotsLabel : content.spotsLeftLabel(spots),
    },
  ].filter(Boolean);

  const primaryButtonStyle = {
    "--btn-bg": theme.primaryButtonBackground,
    "--btn-bg-hover": theme.primaryButtonHover,
    color: theme.primaryButtonText,
  };
  const primaryButtonClass =
    "w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl text-[13.5px] font-semibold tracking-wide " +
    "bg-(--btn-bg) hover:bg-(--btn-bg-hover) transition-colors shadow-[0_8px_20px_-10px_rgba(11,23,32,0.6)]";

  return (
    <div
      className={`lg:sticky ${previewMode ? "lg:top-16" : "lg:top-24"} rounded-[22px] border overflow-hidden`}
      style={{ backgroundColor: theme.surfaceBackground, borderColor: theme.surfaceBorder, boxShadow: theme.surfaceShadow }}
    >
      {/* Price header */}
      <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: theme.surfaceBorder }}>
        <span className="text-[11px] font-medium block" style={{ color: theme.mutedColor }}>{content.startingFromLabel}</span>
        <div className="flex items-baseline gap-1.5 mt-0.5">
          <span className="text-[26px] font-semibold tracking-tight leading-none">
            {experience.requiresPayment ? `${experience.currency} ${startingPrice(experience)}` : content.freeLabel}
          </span>
          {experience.requiresPayment && <span className="text-[13px]" style={{ color: theme.mutedColor }}>{content.perGuestSuffix}</span>}
        </div>
        {previewMode && <p className="text-[11.5px] mt-2" style={{ color: theme.mutedColor }}>{content.previewPriceNote}</p>}
      </div>

      {/* Cart widget: Group/Private + ticket stepper. Fully interactive even
          in preview. Only the option(s) allowed by the Admin's Registration
          type setting render — one allowed option shows as a single pill. */}
      <div className="px-5 py-4 space-y-4">
        <div>
          <FieldLabel theme={theme}>{content.registrationTypeLabel}</FieldLabel>
          <div
            className={`grid gap-1 p-1 rounded-xl ${allowGroup && allowPrivate ? "grid-cols-2" : "grid-cols-1"}`}
            style={{ backgroundColor: theme.insetBackground }}
          >
            {allowGroup && <SegmentButton active={regType === "Group"} onClick={selectGroup} theme={theme}>{content.groupLabel}</SegmentButton>}
            {allowPrivate && <SegmentButton active={regType === "Private"} onClick={selectPrivate} theme={theme}>{content.privateLabel}</SegmentButton>}
          </div>
        </div>

        {/* Private has no fixed date of its own — the visitor must pick one
            of the Admin's configured dates before Book Now unlocks below. */}
        {needsSlot && (
          <div>
            <FieldLabel theme={theme}>{content.chooseSlotLabel}</FieldLabel>
            {slots.length === 0 ? (
              <p className="text-[12.5px]" style={{ color: theme.mutedColor }}>{content.noSlotsAvailableLabel}</p>
            ) : (
              // One snap-scrollable row (swipeable on mobile) plus
              // forward/backward buttons for pointer/keyboard users.
              <div className="flex items-center gap-1">
                <SlotArrowButton direction="back" onClick={() => scrollSlots(-1)} theme={theme} label={content.previousSlotsLabel} />
                <div
                  ref={slotTrackRef}
                  className="flex gap-1.5 overflow-x-auto py-0.5 px-0.5 scroll-smooth"
                  style={{ scrollSnapType: "x proximity", scrollbarWidth: "none" }}
                >
                  {slots.map((s) => (
                    <SlotButton key={s} active={selectedSlot === s} onClick={() => setSelectedSlot(s)} theme={theme}>
                      {formatDate(s)}
                    </SlotButton>
                  ))}
                </div>
                <SlotArrowButton direction="forward" onClick={() => scrollSlots(1)} theme={theme} label={content.nextSlotsLabel} />
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[13px] font-semibold block">{content.ticketsLabel}</span>
            {regType === "Private" && (
              <span className="text-[11.5px] block mt-0.5" style={{ color: theme.mutedColor }}>{content.minPeopleNote(privateMin)}</span>
            )}
          </div>
          <div className="inline-flex items-center rounded-xl border shrink-0" style={{ borderColor: theme.surfaceBorder, backgroundColor: theme.insetBackground }}>
            <StepperButton disabled={qty <= minQty} onClick={() => setQty(qty - 1)} theme={theme} label="Decrease">−</StepperButton>
            <span className="w-8 text-center text-[14px] font-semibold tabular-nums">{qty}</span>
            <StepperButton disabled={qty >= maxQty} onClick={() => setQty(qty + 1)} theme={theme} label="Increase">+</StepperButton>
          </div>
        </div>

        <dl className="rounded-xl divide-y" style={{ backgroundColor: theme.insetBackground }}>
          {infoRows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 px-3.5 py-2.5" style={{ borderColor: theme.surfaceBorder }}>
              <dt className="inline-flex items-center gap-2 text-[12.5px]" style={{ color: theme.mutedColor }}>
                <span style={{ color: theme.accentStrong }}><FieldIcon name={row.icon} className="w-4 h-4" /></span>
                {row.label}
              </dt>
              <dd className="text-[13px] font-semibold text-right">{row.value}</dd>
            </div>
          ))}
        </dl>

        {total !== null && (
          <div className="flex items-end justify-between gap-3 pt-3 border-t border-dashed" style={{ borderColor: "rgba(11,23,32,0.14)" }}>
            <div>
              <span className="text-[13px] font-semibold block">{content.totalLabel}</span>
              <span className="text-[11.5px]" style={{ color: theme.mutedColor }}>
                {content.totalBreakdown(experience.currency, unitPrice, qty)}
              </span>
            </div>
            <span className="text-[20px] font-semibold tracking-tight">{experience.currency} {total}</span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        {previewMode ? (
          <>
            {/* With an onBook hand-off (admin preview) the button opens the
                registration page; without one it stays inert as before. */}
            <button
              type="button"
              disabled={!onBook}
              onClick={onBook}
              className={`${primaryButtonClass} ${onBook ? "" : "cursor-not-allowed opacity-50"}`}
              style={primaryButtonStyle}
            >
              {actionLabel || content.previewBookLabel}
              <ArrowIcon />
            </button>
            <p className="text-[11.5px] mt-2.5 text-center" style={{ color: theme.mutedColor }}>
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
            <p className="text-[11.5px] mt-2.5 text-center" style={{ color: theme.mutedColor }}>{content.selectSlotHint}</p>
          </>
        ) : submitFormId ? (
          <button
            type="submit"
            form={submitFormId}
            disabled={submitting}
            className={`${primaryButtonClass} disabled:opacity-60 disabled:cursor-wait`}
            style={primaryButtonStyle}
          >
            {submitLabel}
            {!submitting && <ArrowIcon />}
          </button>
        ) : (
          <>
            <Link to={bookUrl} className={primaryButtonClass} style={primaryButtonStyle}>
              {content.checkAvailabilityLabel}
              <ArrowIcon />
            </Link>
            <p className="text-[11.5px] mt-2.5 text-center" style={{ color: theme.mutedColor }}>{content.bookingHint}</p>
          </>
        )}

        {actionError && (
          <p role="alert" className="text-[12.5px] mt-2.5 text-center font-medium" style={{ color: theme.dangerColor }}>{actionError}</p>
        )}

        <div className="flex items-center justify-center gap-4 mt-3 pt-3 border-t text-[11px]" style={{ borderColor: theme.surfaceBorder, color: theme.mutedColor }}>
          {content.trustPoints.map((point, i) => (
            <span key={point} className="inline-flex items-center gap-1.5">
              {i === 0 ? <LockIcon color={theme.successColor} /> : <CheckIcon color={theme.successColor} size={13} />}
              {point}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function FieldLabel({ theme, children }) {
  return <span className="text-[11.5px] font-medium block mb-1.5" style={{ color: theme.mutedColor }}>{children}</span>;
}

function DisabledBookButton({ theme, children }) {
  return (
    <button
      type="button"
      disabled
      className="w-full h-11 rounded-xl text-[13.5px] font-semibold cursor-not-allowed"
      style={{ backgroundColor: theme.insetBackground, color: theme.mutedColor, border: `1px solid ${theme.surfaceBorder}` }}
    >
      {children}
    </button>
  );
}

function SlotButton({ active, onClick, theme, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 whitespace-nowrap h-9 px-3 rounded-lg text-[12px] font-semibold border transition-colors"
      style={active
        ? { backgroundColor: theme.textColor, borderColor: theme.textColor, color: theme.pageBackground, scrollSnapAlign: "start" }
        : { backgroundColor: theme.surfaceBackground, borderColor: theme.surfaceBorder, color: theme.textColor, scrollSnapAlign: "start" }}
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
      className="shrink-0 grid place-items-center w-7 h-7 rounded-full border transition-colors hover:bg-black/5"
      style={{ borderColor: theme.surfaceBorder, color: theme.mutedColor }}
    >
      <FieldIcon name="chevron" className={`w-3.5 h-3.5 ${direction === "back" ? "rotate-90" : "-rotate-90"}`} />
    </button>
  );
}

function SegmentButton({ active, onClick, theme, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="h-8.5 rounded-lg text-[13px] font-semibold transition-all"
      style={active
        ? { backgroundColor: theme.surfaceBackground, color: theme.textColor, boxShadow: "0 1px 2px rgba(11,23,32,0.08), 0 2px 8px -2px rgba(11,23,32,0.12)" }
        : { backgroundColor: "transparent", color: theme.mutedColor }}
    >
      {children}
    </button>
  );
}

function StepperButton({ disabled, onClick, theme, label, children }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="w-8 h-8 grid place-items-center rounded-xl text-[16px] font-medium leading-none hover:bg-black/5 disabled:opacity-30 disabled:hover:bg-transparent transition"
      style={{ color: theme.textColor }}
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
    <div className="flex items-center gap-2 mb-3">
      <span className="w-0.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: theme.accentColor }} />
      <h2 className="text-[16px] md:text-[17px] font-serif font-medium leading-tight" style={{ color: theme.textColor }}>{children}</h2>
    </div>
  );
}

function GalleryGrid({ items, alt = "" }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {items.map((src, i) => (
        <div key={i} className="overflow-hidden rounded-xl">
          <img src={src} alt={alt ? `${alt} ${i + 1}` : ""} className="w-full h-28 md:h-36 object-cover hover:scale-105 transition-transform duration-500" />
        </div>
      ))}
    </div>
  );
}

export function BlockValue({ block, theme, positiveListKeys = [], negativeListKeys = [] }) {
  switch (block.shape) {
    case "faqList":
      return (
        <div className="space-y-2">
          {block.items.map((it, i) => (
            <details key={i} className="group rounded-xl border px-4 open:pb-3" style={{ borderColor: theme.surfaceBorder || theme.borderColor, backgroundColor: theme.insetBackground }}>
              <summary className="text-[14px] font-semibold cursor-pointer list-none flex items-center justify-between gap-4 py-3">
                {it.question}
                <span className="transition-transform group-open:rotate-180 shrink-0" style={{ color: theme.accentStrong || theme.accentColor }}>
                  <FieldIcon name="chevron" className="w-4 h-4" />
                </span>
              </summary>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap" style={{ color: theme.mutedColor }}>{it.answer}</p>
            </details>
          ))}
        </div>
      );
    case "modules":
      // "Full itinerary / roadmap" — an ordered plan, styled as a numbered timeline.
      return (
        <ol className="relative space-y-4">
          {block.items.map((it, i) => (
            <li key={i} className="relative flex gap-3.5">
              {i < block.items.length - 1 && (
                <span className="absolute left-3.25 top-7 -bottom-4 w-px" style={{ backgroundColor: theme.surfaceBorder || theme.borderColor }} />
              )}
              <span
                className="relative grid place-items-center w-6.5 h-6.5 rounded-full text-[11px] font-bold shrink-0"
                style={{ backgroundColor: theme.accentSoft || `${theme.accentColor}22`, color: theme.accentStrong || theme.accentColor }}
              >
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[14px] font-semibold">{it.title || `Step ${i + 1}`}</p>
                {it.topics?.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-[13px]" style={{ color: theme.mutedColor }}>
                    {it.topics.map((t, j) => <li key={j}>{t}</li>)}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      );
    case "repeatableList": {
      // Blank rows (an "Add an item…" the admin hasn't filled in yet) aren't shown.
      const items = (block.items || []).filter((it) => String(it ?? "").trim() !== "");
      // `itemWidth` is the same 12-column span an author picks for form fields
      // (Full/Half/Third/Quarter, see Config/formBuilder.config.jsx `widths`) —
      // unset falls back to 2-per-row (6) for checkmark/cross lists
      // (positive/negativeListKeys) and full row (12) for plain bullets.
      const itemWidth = block.itemWidth || (positiveListKeys.includes(block.blockKey) || negativeListKeys.includes(block.blockKey) ? 6 : 12);
      const itemStyle = { gridColumn: `span ${itemWidth} / span ${itemWidth}` };
      if (positiveListKeys.includes(block.blockKey)) {
        return (
          <ul className="grid grid-cols-12 gap-x-6 gap-y-2 text-[14px]">
            {items.map((it, i) => (
              <li key={i} style={itemStyle} className="flex items-start gap-2.5">
                <CheckIcon color={theme.accentStrong || theme.accentColor} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        );
      }
      if (negativeListKeys.includes(block.blockKey)) {
        return (
          <ul className="grid grid-cols-12 gap-x-6 gap-y-2 text-[14px]">
            {items.map((it, i) => (
              <li key={i} style={itemStyle} className="flex items-start gap-2.5">
                <CrossIcon color={theme.dangerColor} />
                <span>{it}</span>
              </li>
            ))}
          </ul>
        );
      }
      // Short plain items (languages, tags…) read better as pills than as a
      // one-word bulleted column; longer ones stay a list. An explicit
      // itemWidth from the author always keeps the list layout.
      if (!block.itemWidth && items.every((it) => String(it).length <= 24)) {
        return (
          <div className="flex flex-wrap gap-2">
            {items.map((it, i) => (
              <span key={i} className="px-3 py-1.5 rounded-full text-[13px] font-medium" style={{ backgroundColor: theme.insetBackground || theme.glassInsetBackground, border: `1px solid ${theme.surfaceBorder || theme.borderColor}` }}>
                {it}
              </span>
            ))}
          </div>
        );
      }
      return (
        <ul className="grid grid-cols-12 gap-x-6 gap-y-1.5 text-[14px]">
          {items.map((it, i) => (
            <li key={i} style={itemStyle} className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: theme.accentColor }} />
              <span>{it}</span>
            </li>
          ))}
        </ul>
      );
    }
    case "gallery":
      return <GalleryGrid items={block.items} />;
    case "toggle":
      return <p className="text-[14px]">{block.value ? "Yes" : "No"}</p>;
    case "videoUrl":
      return block.value ? (
        <a href={block.value} target="_blank" rel="noopener noreferrer" className="text-[14px] font-semibold hover:underline" style={{ color: theme.accentStrong || theme.accentColor }}>Watch video ↗</a>
      ) : null;
    case "richHtml":
      // Admin-authored rich HTML (RichTextEditor), never visitor input.
      return (
        <div
          className="text-[14px] leading-relaxed whitespace-pre-wrap **:max-w-full"
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
      return <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{block.value}</p>;
  }
}

/**
 * "Good to know" quick-facts row (see experiencePublic.config.jsx's
 * `quickFacts`) — compact icon tiles instead of full-width text sections,
 * since these blocks are toggle-only (ageRequirement is the sole typed
 * value). 2-up on phones, 4-up from sm.
 */
function QuickFactsGrid({ facts, theme, title }) {
  return (
    <div>
      <SectionTitle theme={theme}>{title}</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
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
      className="flex items-center gap-2 rounded-xl px-2.5 py-2"
      style={{ backgroundColor: theme.insetBackground, opacity: isToggle && !isOn ? 0.55 : 1 }}
    >
      <span
        className="grid place-items-center w-7 h-7 rounded-full shrink-0 bg-white"
        style={{ color: theme.accentStrong }}
      >
        <FieldIcon name={icon} className="w-3.5 h-3.5" />
      </span>
      <div className="min-w-0">
        <span className="text-[11px] leading-tight block" style={{ color: theme.mutedColor }}>{block.label}</span>
        <span className="text-[13px] font-semibold leading-tight block mt-0.5" style={{ color: isToggle ? (isOn ? theme.successColor : theme.mutedColor) : theme.textColor }}>
          {isToggle ? (isOn ? "Yes" : "No") : block.value}
        </span>
      </div>
    </div>
  );
}

function CheckIcon({ color, size = 17 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} className="shrink-0 mt-0.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8.5" />
      <path d="M6.5 10.2l2.4 2.4 4.6-5.2" />
    </svg>
  );
}

function CrossIcon({ color }) {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" className="shrink-0 mt-0.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="8.5" />
      <path d="M7 7l6 6M13 7l-6 6" />
    </svg>
  );
}

function LockIcon({ color }) {
  return (
    <svg viewBox="0 0 20 20" width="13" height="13" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="9" width="12" height="8.5" rx="2" />
      <path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10h12M11 5l5 5-5 5" />
    </svg>
  );
}
