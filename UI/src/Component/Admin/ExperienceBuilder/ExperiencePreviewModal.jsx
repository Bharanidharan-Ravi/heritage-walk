// src/Component/Admin/ExperienceBuilder/ExperiencePreviewModal.jsx
//
// "Preview" — a full, real-time render of the public page, not a field dump.
// It builds the same `experience`-shaped object ExperienceDetail.jsx gets
// from the API out of the builder's current (unsaved) state, and renders it
// through the exact same ExperiencePageView component the public site uses —
// so this IS the page, including the cart widget, hero image placement, etc.
// The only thing swapped out is the "Book Now" hand-off, which is inert here
// (previewMode) since a still-being-edited experience has no id/price/form
// yet — those are Admin-only, set after approval.

import React from "react";
import { experienceBuilderConfig } from "../../Config/experienceBuilder.config";
import { experiencePublicConfig } from "../../Config/experiencePublic.config";
import ExperiencePageView from "../../Sections/ExperiencePageView";

export default function ExperiencePreviewModal({ title, experienceType, blocks, startDate, endDate, onClose }) {
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
    capacityRemaining: null,
    capacityTotal: null, // unlimited — capacity isn't set until Admin approval
    requiresPayment: false, // price isn't set until Admin approval
    price: 0,
    currency: "INR",
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
