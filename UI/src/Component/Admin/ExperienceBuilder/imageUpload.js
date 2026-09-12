// src/Component/Admin/ExperienceBuilder/imageUpload.js
//
// Shared image-upload plumbing for the Experience Builder's drop surfaces —
// the sidebar dropzones in ExperienceBlockSettings AND the hero-image drop
// target directly on the canvas (ExperienceCanvas) both need the same
// allow-list/size cap and the same upload/delete calls, so it lives here once
// instead of being duplicated per surface.

import { useAdminAuth } from "../AuthContext";
import { adminApi } from "../adminApi";

// Mirrors the API's own allow-list/size cap (ExperiencesController.UploadImageAsset)
// so a bad file is rejected instantly instead of round-tripping to the server.
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export function validateImageFile(file) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Only JPEG, PNG, WebP or GIF images are allowed.";
  if (file.size > MAX_IMAGE_BYTES) return "Image is larger than 8MB.";
  return null;
}

/** Upload/delete against the experience image asset endpoints, bound to the
 *  current admin token. `remove` is always best-effort — a failure to free
 *  the old Sanity asset should never block the caller's own state update. */
export function useExperienceImageUpload() {
  const { token } = useAdminAuth();

  const upload = (file) => adminApi.uploadExperienceImage(token, file);
  const remove = (url) => {
    if (!url) return;
    adminApi.deleteExperienceImage(token, url).catch(() => {});
  };

  return { upload, remove };
}
