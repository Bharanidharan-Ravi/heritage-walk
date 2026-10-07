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
import ExperiencePageView, { BookingCard, Breadcrumb, RegistrationSteps, Surface, TypeBadge } from "../../Sections/ExperiencePageView";
import { buildPreviewExperience, withAttendeeNameFields } from "../../Sections/experienceBlockHelpers";
import FormRenderer from "../../Sections/FormRenderer";

export default function ExperiencePreviewModal({
  title, experienceType, blocks, startDate, endDate, bookingEndDate, onClose,
  requiresPayment, price, privatePrice, currency, capacityTotal, registrationType,
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
  // One cart choice ({ regType, qty, slot }) shared by the page's booking card
  // and the registration screen's, so changing it on either shows on both —
  // and the registration form grows a name row per extra group attendee.
  // null until the visitor touches a card; the cards start from their defaults.
  const [cart, setCart] = useState(null);
  const typeLabel = pub.content.typeLabels[experienceType?.toLowerCase()] || experienceType;
  const formFields = withAttendeeNameFields(registrationFields, { registrationType: cart?.regType, qty: cart?.qty });

  // Same shape ExperienceDetail.jsx gets from GET /api/experiences/public/{id}
  // — contentBlocks are already { blockKey, shape, label, value|items }, so
  // ExperiencePageView needs zero special-casing to read builder state vs.
  // saved state.
  const experience = buildPreviewExperience({
    title, experienceType, blocks, startDate, endDate, bookingEndDate,
    requiresPayment, price, privatePrice, currency, capacityTotal, registrationType,
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
        <ExperiencePageView
          experience={experience}
          previewMode
          onBook={() => setView("register")}
          cartSelection={cart}
          onCartSelectionChange={setCart}
        />
      ) : (
        <section className="pt-8 pb-16 min-h-screen text-[14px]" style={{ backgroundColor: pub.theme.pageBackground, color: pub.theme.textColor }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Breadcrumb
              theme={pub.theme}
              content={pub.content}
              typeLabel={typeLabel}
              title={title}
              onTitleClick={() => setView("page")}
              current={pub.content.breadcrumbRegistration}
            />
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
              <div className="min-w-0">
                <TypeBadge theme={pub.theme}>{typeLabel}</TypeBadge>
                <h1 className="text-[26px] md:text-[32px] font-serif font-medium leading-[1.15] tracking-tight mt-3">
                  {title || pub.content.registrationTitleFallback}
                </h1>
              </div>
              <RegistrationSteps theme={pub.theme} steps={pub.content.registrationSteps} active={pub.content.registrationActiveStep} />
            </div>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 xl:gap-8 mt-6">
            <Surface theme={pub.theme} className="min-w-0 md:p-7">
              <h2 className="text-[19px] font-serif font-medium">{pub.content.registrationHeading}</h2>
              <p className="text-[12.5px] mt-1 mb-5" style={{ color: pub.theme.mutedColor }}>{pub.content.registrationSubheading}</p>
              {registrationFields.length === 0 ? (
                <p style={{ color: pub.theme.mutedColor }}>{pub.content.registrationEmptyNote}</p>
              ) : (
                <FormRenderer
                  light
                  form={{ fields: formFields }}
                  values={answers}
                  onChange={(name, value) => setAnswers((prev) => ({ ...prev, [name]: value }))}
                  hideSubmit
                />
              )}
            </Surface>
            <div className="min-w-0">
              <BookingCard
                experience={experience}
                theme={pub.theme}
                content={pub.content}
                previewMode
                onBook={() => {}}
                actionLabel={pub.content.payNowLabel}
                actionNote={pub.content.registrationPreviewNote}
                selection={cart}
                onSelectionChange={setCart}
              />
            </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
