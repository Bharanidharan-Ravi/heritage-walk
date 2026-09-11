// src/Component/Admin/ExperienceBuilder/ExperiencePreviewModal.jsx
//
// Read-only render of the current blocks — same role as
// Admin/FormBuilder/FormPreviewModal.jsx, kept separate per the plan.

import React from "react";
import { experienceBuilderConfig } from "../../Config/experienceBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import { BlockValuePreview } from "./ExperienceCanvas";

export default function ExperiencePreviewModal({ title, blocks, onClose }) {
  const { theme, content } = experienceBuilderConfig;
  const { text, control } = adminUi;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-lg border p-4"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className={text.subheader}>{content.previewTitle}</h2>
          <button type="button" onClick={onClose} className={control.btnLink} style={{ color: theme.mutedColor }}>Close</button>
        </div>

        <h3 className={`${text.header} mb-2`}>{title || "Untitled experience"}</h3>

        <div className={adminUi.stack.md}>
          {blocks.map((block) => (
            <div key={block.id}>
              <p className={`${text.micro} mb-0.5`} style={{ color: theme.mutedColor }}>{block.label}</p>
              <BlockValuePreview block={block} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
