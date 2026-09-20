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
