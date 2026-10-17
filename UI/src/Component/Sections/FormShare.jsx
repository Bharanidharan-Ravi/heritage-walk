// src/Component/Sections/FormShare.jsx
//
// Share widget for a created form: shows the shareable link, a copy button,
// a QR code (generated in the browser with the `qrcode` package, so it can be
// downloaded as a PNG), a native share button and social-network share links.
//
// Used by the admin forms list, the builder's "Form published" screen and the
// admin experiences list (which passes `path`/`shareText` for /experiences/{id}).

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formConfig } from "../Config/form.config";
import { adminUi } from "../Config/adminUi.config";
import { isTestMode, TEST_BASENAME } from "../../testMode";

// `compact` is the admin console rendering this widget at its own smaller
// scale (see Config/adminUi.config.jsx); the public pages keep the full size.
// `path` overrides the default /forms/{slug} page; `slug` also names the QR file.
export default function FormShare({ slug, path, title, shareText: shareTextProp, compact = false }) {
  const { theme, share } = formConfig;
  const [copied, setCopied] = useState(false);
  // Tagged with the URL it was generated for, so switching forms never shows
  // (or downloads) the previous form's QR while the new one is generating.
  const [qr, setQr] = useState({ for: "", dataUrl: "", error: false });

  // Keep the /test prefix so links shared from /test/admin open the test site.
  const shareUrl = `${window.location.origin}${isTestMode ? TEST_BASENAME : ""}${path || `/forms/${slug}`}`;
  const shareText = shareTextProp || share.shareText(title);
  const qrDataUrl = qr.for === shareUrl ? qr.dataUrl : "";
  const qrError = qr.for === shareUrl && qr.error;

  useEffect(() => {
    let cancelled = false;
    // High resolution so the downloaded PNG prints cleanly on posters/flyers.
    QRCode.toDataURL(shareUrl, { width: 1024, margin: 2, errorCorrectionLevel: "Q" })
      .then((dataUrl) => !cancelled && setQr({ for: shareUrl, dataUrl, error: false }))
      .catch(() => !cancelled && setQr({ for: shareUrl, dataUrl: "", error: true }));
    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

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

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = share.qrFileName(slug);
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    if (!navigator.share) {
      handleCopy();
      return;
    }
    const data = { title: shareText, text: shareText, url: shareUrl };
    // Attach the QR image where the browser supports file sharing (mostly
    // phones) — lets it go straight to Instagram/WhatsApp status etc.
    try {
      if (qrDataUrl && navigator.canShare) {
        const blob = await (await fetch(qrDataUrl)).blob();
        const file = new File([blob], share.qrFileName(slug), { type: "image/png" });
        if (navigator.canShare({ files: [file] })) data.files = [file];
      }
      await navigator.share(data);
    } catch {
      /* user cancelled or share failed — no-op */
    }
  };

  const socialHref = (template) =>
    template
      .replaceAll("{url}", encodeURIComponent(shareUrl))
      .replaceAll("{text}", encodeURIComponent(shareText));

  const primaryBtn = compact
    ? `flex-1 ${adminUi.control.btnPrimary}`
    : "flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm";
  const ghostBtn = compact
    ? `flex-1 ${adminUi.control.btnGhost}`
    : "flex-1 py-3 rounded-lg font-bold uppercase tracking-wider text-sm border";
  const bodyText = compact ? adminUi.text.body : "text-sm";

  return (
    <div
      className={`border flex flex-col items-center mx-auto ${
        compact
          ? `${adminUi.pad.card} rounded-lg gap-2 max-w-72`
          : "p-8 rounded-2xl gap-4 max-w-sm"
      }`}
      style={{ backgroundColor: theme.sectionBackground, borderColor: theme.inputBorder, color: theme.textColor }}
    >
      <div
        className={`bg-white rounded-md p-1.5 grid place-items-center ${compact ? "w-36 h-36" : "w-48 h-48"}`}
      >
        {qrDataUrl ? (
          <img src={qrDataUrl} alt={share.qrAlt} className="w-full h-full" />
        ) : (
          <span className={`${bodyText} text-center`} style={{ color: theme.sectionBackground }}>
            {qrError ? share.qrErrorMessage : share.qrGeneratingMessage}
          </span>
        )}
      </div>

      <p className={`opacity-70 break-all text-center ${bodyText}`}>{shareUrl}</p>

      <div className={`flex w-full ${compact ? "gap-1.5" : "gap-3"}`}>
        <button
          onClick={handleCopy}
          className={primaryBtn}
          style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
        >
          {copied ? share.copiedLabel : share.copyLinkLabel}
        </button>
        <button
          onClick={handleDownloadQr}
          disabled={!qrDataUrl}
          className={ghostBtn}
          style={{ borderColor: theme.accentColor, color: theme.accentColor }}
        >
          {share.downloadQrLabel}
        </button>
      </div>

      <button
        onClick={handleShare}
        className={`w-full ${ghostBtn}`}
        style={{ borderColor: theme.accentColor, color: theme.accentColor }}
      >
        {share.shareLabel}
      </button>

      <div className="w-full">
        <p className={`${compact ? adminUi.text.micro : "text-xs uppercase font-bold tracking-widest"} opacity-60 mb-1.5 text-center`}>
          {share.socialHeading}
        </p>
        <div className={`grid grid-cols-3 ${compact ? "gap-1.5" : "gap-2"}`}>
          {share.networks.map((n) => (
            <a
              key={n.key}
              href={socialHref(n.href)}
              target="_blank"
              rel="noopener noreferrer"
              className={
                compact
                  ? `${adminUi.pad.yMd} ${adminUi.radius.control} border text-center text-[11px] font-semibold hover:opacity-80`
                  : "py-2 rounded-lg border text-center text-sm font-semibold"
              }
              style={{ borderColor: n.color, color: n.color }}
            >
              {n.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
