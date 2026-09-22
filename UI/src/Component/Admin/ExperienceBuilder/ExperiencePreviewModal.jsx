// src/Component/Admin/ExperienceBuilder/ExperiencePreviewModal.jsx
//
// "Preview" — a full, real-time render of the public page, not a field dump.
// It builds the same `experience`-shaped object ExperienceDetail.jsx gets
// from the API out of the builder's current (unsaved) state, and renders it
// through the exact same ExperiencePageView component the public site uses —
// so this IS the page, including the cart widget, hero image placement, etc.
// The only thing swapped out is the "Book Now" hand-off, which is inert here
// (previewMode). Payment/capacity/registration-type/slots are read from the
// SAME Admin-only state the canvas's cart widget edits (AdminExperienceBuilder)
// — an Employee never sees a value there other than the defaults it starts at.

import React, { useState } from "react";
import { experienceBuilderConfig } from "../../Config/experienceBuilder.config";
import { experiencePublicConfig } from "../../Config/experiencePublic.config";
import ExperiencePageView, { BookingCard } from "../../Sections/ExperiencePageView";
import { buildPreviewExperience } from "../../Sections/experienceBlockHelpers";
import FormRenderer from "../../Sections/FormRenderer";

export default function ExperiencePreviewModal({
  title, experienceType, blocks, startDate, endDate, bookingEndDate, onClose,
  requiresPayment, price, currency, capacityTotal, registrationType,
  privateSlots, privateMinPeople,
  registrationFields = [],
}) {
  const { theme, content } = experienceBuilderConfig;
  const pub = experiencePublicConfig;

  // "page" -> "register" when Book Now is clicked, mirroring the public flow
  // (/experiences/:id -> /forms/:slug). Answers live here so they survive
  // flipping back and forth, and nothing ever leaves the modal.
  const [view, setView] = useState("page");
  const [answers, setAnswers] = useState({});

  // Same shape ExperienceDetail.jsx gets from GET /api/experiences/public/{id}
  // — contentBlocks are already { blockKey, shape, label, value|items }, so
  // ExperiencePageView needs zero special-casing to read builder state vs.
  // saved state.
  const experience = buildPreviewExperience({
    title, experienceType, blocks, startDate, endDate, bookingEndDate,
    requiresPayment, price, currency, capacityTotal, registrationType,
    privateSlots, privateMinPeople,
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ backgroundColor: experiencePublicConfig.theme.pageBackground }}>
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-2.5 border-b"
        style={{ backgroundColor: theme.pageBackground, borderColor: theme.borderColor }}
      >
        <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accentColor }}>
          {content.previewBarLabel}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border"
          style={{ borderColor: theme.strongBorderColor, color: theme.textColor }}
        >
          {content.previewCloseLabel}
        </button>
      </div>

      {view === "page" ? (
        <ExperiencePageView experience={experience} previewMode onBook={() => setView("register")} />
      ) : (
        <section className="pt-10 pb-24 min-h-screen" style={{ backgroundColor: pub.theme.pageBackground, color: pub.theme.textColor }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-12">
            <button
              type="button"
              onClick={() => setView("page")}
              className="text-xs font-bold uppercase tracking-widest mb-6"
              style={{ color: pub.theme.accentColor }}
            >
              {pub.content.registrationBackLabel}
            </button>
            <p className="uppercase tracking-widest text-xs font-bold mb-3" style={{ color: pub.theme.accentColor }}>
              {pub.content.typeLabels[experienceType?.toLowerCase()] || experienceType}
            </p>
            <h1 className="text-4xl md:text-5xl font-serif font-medium mb-6 leading-tight">
              {title || pub.content.registrationTitleFallback}
            </h1>
            <div className="flex flex-col lg:flex-row gap-12 xl:gap-16 mt-6">
            <div className="lg:w-2/3 min-w-0">
            <h2 className="text-2xl font-serif mb-5" style={{ color: pub.theme.accentColor }}>
              {pub.content.registrationHeading}
            </h2>
            {registrationFields.length === 0 ? (
              <p style={{ color: pub.theme.mutedColor }}>{pub.content.registrationEmptyNote}</p>
            ) : (
              <FormRenderer
                light
                form={{ fields: registrationFields }}
                values={answers}
                onChange={(name, value) => setAnswers((prev) => ({ ...prev, [name]: value }))}
                hideSubmit
              />
            )}
            </div>
            <div className="lg:w-1/3">
              <BookingCard
                experience={experience}
                theme={pub.theme}
                content={pub.content}
                previewMode
                onBook={() => {}}
                actionLabel={pub.content.payNowLabel}
                actionNote={pub.content.registrationPreviewNote}
              />
            </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
