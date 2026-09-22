// src/Component/Sections/experienceBlockHelpers.js
//
// Plain (non-component) helpers shared by ExperiencePageView.jsx and the
// admin WYSIWYG canvas (Admin/ExperienceBuilder/ExperienceCanvas.jsx) — kept
// in their own module rather than exported alongside ExperiencePageView's
// components so that file only exports components, per
// react-refresh/only-export-components.

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
 * The `experience`-shaped object ExperiencePageView / BookingCard read, built
 * from the admin builder's current (unsaved) state. Shared by the Preview modal
 * and the builder's Registration screen so both show the same booking card.
 */
export function buildPreviewExperience({
  title, experienceType, blocks, startDate, endDate, bookingEndDate,
  requiresPayment, price, currency, capacityTotal, registrationType,
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
    currency: currency || "INR",
    registrationType: registrationType || "Group",
    slots: [],
    privateSlots: privateSlots || [],
    privateMinPeople: Number(privateMinPeople) || 1,
    bookingEnabled: true,
    linkedFormSlug: null,
  };
}
