// src/Component/Admin/FormBuilder/FormPreviewModal.jsx
//
// The preview. It renders through the very same FormRenderer the public
// /forms/{slug} page uses, on the public page's own palette, so what the author
// sees here is what the recipient gets — the only difference is `readOnly`,
// which stops anything from actually submitting.

import React, { useEffect } from "react";
import { formConfig } from "../../Config/form.config";
import { formBuilderConfig } from "../../Config/formBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import FormRenderer from "../../Sections/FormRenderer";

// Preview is read-only, so no answer ever lands here — one frozen blank is
// enough for every render.
const EMPTY_VALUES = Object.freeze({});

export default function FormPreviewModal({ form, onClose }) {
  const { theme: builderTheme, content } = formBuilderConfig;
  const publicTheme = formConfig.theme;
  const publicContent = formConfig.content;

  // Escape closes, and the page behind must not scroll while it's open.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      style={{ backgroundColor: "rgba(8, 12, 18, 0.85)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={content.previewTitle}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border overflow-hidden my-auto"
        style={{ backgroundColor: publicTheme.sectionBackground, borderColor: builderTheme.borderColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* The modal chrome is admin UI, so it uses the console scale; the form
            below it deliberately keeps the public page's own sizing, because
            that is what the recipient will actually see. */}
        <header
          className="flex items-center justify-between px-3 py-2 border-b"
          style={{ backgroundColor: builderTheme.panelBackground, borderColor: builderTheme.borderColor }}
        >
          <div>
            <p className={adminUi.text.bodyHeader}>{content.previewTitle}</p>
            <p className={`${adminUi.text.body} mt-0.5`} style={{ color: builderTheme.mutedColor }}>
              {content.previewNote}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={adminUi.control.btnGhost}
            style={{ borderColor: builderTheme.borderColor, color: builderTheme.textColor }}
          >
            Close
          </button>
        </header>

        <div className="px-6 py-10 sm:px-10" style={{ color: publicTheme.textColor }}>
          <h1 className="text-3xl font-serif font-medium mb-2">{form.title}</h1>
          {form.description && <p className="opacity-70 mb-3">{form.description}</p>}
          <p className="opacity-60 text-sm mb-10">
            {form.requiresPayment
              ? publicContent.paidNotice(form.price, form.currency)
              : publicContent.freeNotice}
          </p>

          {form.fields.length === 0 ? (
            <p className="opacity-50 text-sm">Nothing to preview yet — add a block first.</p>
          ) : (
            <FormRenderer
              form={form}
              values={EMPTY_VALUES}
              readOnly
              submitLabel={
                form.requiresPayment
                  ? publicContent.payButtonLabel(form.price, form.currency)
                  : publicContent.submitButtonLabel
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}
