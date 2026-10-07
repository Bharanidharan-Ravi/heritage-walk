// src/Component/Sections/experienceBlockHelpers.js
//
// Plain (non-component) helpers shared by ExperiencePageView.jsx and the
// admin WYSIWYG canvas (Admin/ExperienceBuilder/ExperienceCanvas.jsx) — kept
// in their own module rather than exported alongside ExperiencePageView's
// components so that file only exports components, per
// react-refresh/only-export-components.

import { experiencePublicConfig } from "../Config/experiencePublic.config";

export function hasValue(block) {
  if (!block) return false;
  if (block.items) return block.items.length > 0;
  if (block.value === undefined || block.value === null || block.value === "") return false;
  // richHtml blocks (RichTextEditor) can hold markup-only "empty" content
  // (e.g. "<p><br></p>" left behind after clearing the editor) — strip tags
  // before checking so those don't count as real content.
  if (block.shape === "richHtml") return block.value.replace(/<[^>]*>/g, "").trim() !== "";
  return true;
}

export function formatSimpleValue(block) {
  if (block.shape === "toggle") return block.value ? "Yes" : "No";
  return block.value;
}

/**
 * The registration form's fields plus one First + Last Name row for every
 * attendee after the first, when the cart's registration type calls for it
 * (experiencePublicConfig.content.attendeeNames.forRegistrationTypes). The
 * person filling the form in is attendee 1, so qty 1 adds nothing. Rows are
 * inserted just before the first consent/terms block so agreements stay last.
 * Answers are stored as attendee2FirstName / attendee2LastName / …
 */
export function withAttendeeNameFields(fields, { registrationType, qty }) {
  const copy = experiencePublicConfig.content.attendeeNames;
  const count = Math.max(0, Math.min(50, Number(qty) || 0));
  if (!copy.forRegistrationTypes.includes(registrationType) || count < 2) return fields;

  const extra = [{ id: "attendees-heading", type: "heading", label: copy.heading, width: 12 }];
  for (let n = 2; n <= count; n += 1) {
    extra.push(
      attendeeNameField(`attendee${n}FirstName`, copy.firstNameLabel(n), copy.firstNamePlaceholder),
      attendeeNameField(`attendee${n}LastName`, copy.lastNameLabel(n), copy.lastNamePlaceholder)
    );
  }

  const at = fields.findIndex((f) => f.type === "terms" || f.type === "consent");
  const next = [...fields];
  next.splice(at === -1 ? next.length : at, 0, ...extra);
  return next;
}

const attendeeNameField = (name, label, placeholder) => ({
  id: name, name, label, placeholder, type: "text", required: true, width: 6, helpText: "", options: [],
});

/** Per-person price for one booking option: Private uses its own price when
 *  set, otherwise the normal (Public/Group) price — same rule as the API. */
export function unitPriceFor(experience, regType) {
  return regType === "Private" ? experience.privatePrice ?? experience.price : experience.price;
}

/** The lowest per-person price across the options on offer ("Starting from"). */
export function startingPrice(experience) {
  const type = experience.registrationType === "Individual" ? "Group" : experience.registrationType || "Group";
  const prices = [];
  if (type !== "Private") prices.push(unitPriceFor(experience, "Group"));
  if (type !== "Group") prices.push(unitPriceFor(experience, "Private"));
  return Math.min(...prices);
}

/**
 * The `experience`-shaped object ExperiencePageView / BookingCard read, built
 * from the admin builder's current (unsaved) state. Shared by the Preview modal
 * and the builder's Registration screen so both show the same booking card.
 */
export function buildPreviewExperience({
  title, experienceType, blocks, startDate, endDate, bookingEndDate,
  requiresPayment, price, privatePrice, currency, capacityTotal, registrationType,
  privateSlots, privateMinPeople,
}) {
  const capacity = capacityTotal === "" || capacityTotal == null ? null : Number(capacityTotal);
  return {
    title,
    type: experienceType,
    contentBlocks: blocks,
    startDate: startDate || null,
    endDate: endDate || null,
    bookingEndDate: bookingEndDate || null,
    capacityRemaining: capacity,
    capacityTotal: capacity,
    requiresPayment: Boolean(requiresPayment),
    price: requiresPayment ? Number(price) || 0 : 0,
    privatePrice: requiresPayment && privatePrice !== "" && privatePrice != null ? Number(privatePrice) : null,
    currency: currency || "INR",
    registrationType: registrationType || "Group",
    slots: [],
    privateSlots: privateSlots || [],
    privateMinPeople: Number(privateMinPeople) || 1,
    bookingEnabled: true,
    linkedFormSlug: null,
  };
}
