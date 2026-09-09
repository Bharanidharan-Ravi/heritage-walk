// src/Component/Sections/FormShare.jsx
//
// DRY / SKELETON share widget for a created form: shows the shareable link,
// a copy button, and the QR code image served by the .NET API
// (GET /api/forms/{slug}/qr — returns an empty PNG until QRCoder is wired up,
// see docs/form-generator/MASTER_PROMPT.md).
//
// Not yet linked into any route/nav — use it inside a future admin "form
// created" screen once POST /api/forms has an auth story.

import React, { useState } from "react";
import { formConfig } from "../Config/form.config";

const API_BASE = import.meta.env.VITE_API_URL;

export default function FormShare({ slug }) {
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
      className="p-8 rounded-2xl border flex flex-col items-center gap-4 max-w-sm mx-auto"
      style={{ backgroundColor: theme.sectionBackground, borderColor: theme.inputBorder, color: theme.textColor }}
    >
      <img
        src={qrImageUrl}
        alt="QR code to open this form"
        className="w-40 h-40 bg-white rounded-lg p-2"
      />

      <p className="text-sm opacity-70 break-all text-center">{shareUrl}</p>

      <div className="flex gap-3 w-full">
        <button
          onClick={handleCopy}
          className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm"
          style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
        >
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleShare}
          className="flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm border"
          style={{ borderColor: theme.accentColor, color: theme.accentColor }}
        >
          Share
        </button>
      </div>
    </div>
  );
}
