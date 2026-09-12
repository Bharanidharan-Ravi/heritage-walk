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

import React from "react";
import { experienceBuilderConfig } from "../../Config/experienceBuilder.config";
import { experiencePublicConfig } from "../../Config/experiencePublic.config";
import ExperiencePageView from "../../Sections/ExperiencePageView";

export default function ExperiencePreviewModal({
  title, experienceType, blocks, startDate, endDate, bookingEndDate, onClose,
  requiresPayment, price, currency, capacityTotal, registrationType, slots,
}) {
  const { theme, content } = experienceBuilderConfig;

  // Same shape ExperienceDetail.jsx gets from GET /api/experiences/public/{id}
  // — contentBlocks are already { blockKey, shape, label, value|items }, so
  // ExperiencePageView needs zero special-casing to read builder state vs.
  // saved state.
  const experience = {
    title,
    type: experienceType,
    contentBlocks: blocks,
    startDate: startDate || null,
    endDate: endDate || null,
    bookingEndDate: bookingEndDate || null,
    capacityRemaining: capacityTotal === "" || capacityTotal == null ? null : Number(capacityTotal),
    capacityTotal: capacityTotal === "" || capacityTotal == null ? null : Number(capacityTotal),
    requiresPayment: Boolean(requiresPayment),
    price: requiresPayment ? Number(price) || 0 : 0,
    currency: currency || "INR",
    registrationType: registrationType || "Individual",
    slots: slots || [],
    bookingEnabled: true,
    linkedFormSlug: null,
  };

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

      <ExperiencePageView experience={experience} previewMode />
    </div>
  );
}
