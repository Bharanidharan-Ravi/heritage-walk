// src/Component/Sections/FormShare.jsx
//
// Share widget for a created form: shows the shareable link, a copy button,
// and the QR code image served by the .NET API
// (GET /api/forms/{slug}/qr — returns an empty PNG until QRCoder is wired up,
// see docs/form-generator/MASTER_PROMPT.md).
//
// Used by the admin forms list and by the builder's "Form published" screen.

import React, { useState } from "react";
import { formConfig } from "../Config/form.config";
import { adminUi } from "../Config/adminUi.config";

const API_BASE = import.meta.env.VITE_API_URL;

// `compact` is the admin console rendering this widget at its own smaller
// scale (see Config/adminUi.config.jsx); the public pages keep the full size.
export default function FormShare({ slug, compact = false }) {
  const { theme } = formConfig;
  const [copied, setCopied] = useState(false);

  const shareUrl = `${window.location.origin}/forms/${slug}`;
  const qrImageUrl = `${API_BASE}/api/forms/${slug}/qr`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // TODO(form-generator): clipboard API can fail on non-HTTPS/older
      // browsers — fall back to a manually-selectable <input> if needed.
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      // TODO(form-generator): navigator.share() requires a user gesture and
      // HTTPS — falls through silently to copy-link on unsupported browsers.
      try {
        await navigator.share({ title: "Fill this form", url: shareUrl });
      } catch {
        /* user cancelled — no-op */
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div
      className={`border flex flex-col items-center mx-auto ${
        compact
          ? `${adminUi.pad.card} rounded-lg gap-2 max-w-60`
          : "p-8 rounded-2xl gap-4 max-w-sm"
      }`}
      style={{ backgroundColor: theme.sectionBackground, borderColor: theme.inputBorder, color: theme.textColor }}
    >
      <img
        src={qrImageUrl}
        alt="QR code to open this form"
        className={`bg-white rounded-md p-1.5 ${compact ? "w-24 h-24" : "w-40 h-40"}`}
      />

      <p className={`opacity-70 break-all text-center ${compact ? adminUi.text.body : "text-sm"}`}>
        {shareUrl}
      </p>

      <div className={`flex w-full ${compact ? "gap-1.5" : "gap-3"}`}>
        <button
          onClick={handleCopy}
          className={
            compact
              ? `flex-1 ${adminUi.control.btnPrimary}`
              : "flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm"
          }
          style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleShare}
          className={
            compact
              ? `flex-1 ${adminUi.control.btnGhost}`
              : "flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm border"
          }
          style={{ borderColor: theme.accentColor, color: theme.accentColor }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
