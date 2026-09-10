// src/Component/pages/admin/AdminFormBuilder.jsx
//
// Three-pane form builder: block palette | arrangeable canvas | block settings.
// Payment is a switch on the form's own settings card, sitting alongside the
// title and description — not a mandatory step.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { formBuilderConfig } from "../../Config/formBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import { useFormBuilder } from "../../Admin/FormBuilder/useFormBuilder";
import FieldPalette from "../../Admin/FormBuilder/FieldPalette";
import BuilderCanvas from "../../Admin/FormBuilder/BuilderCanvas";
import FieldSettings from "../../Admin/FormBuilder/FieldSettings";
import FormPreviewModal from "../../Admin/FormBuilder/FormPreviewModal";
import FormShare from "../../Sections/FormShare";

export default function AdminFormBuilder() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const { theme, content } = formBuilderConfig;
  const builder = useFormBuilder();

  // What's currently being dragged: a new block from the palette, or an
  // existing field being rearranged. Lives here because both the palette and
  // the canvas take part in the same gesture.
  const [drag, setDrag] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [publishedSlug, setPublishedSlug] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const handlePublish = async () => {
    if (builder.validationErrors.length > 0) {
      setShowErrors(true);
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      const result = await adminApi.createForm(token, builder.toCreateRequest());
      setPublishedSlug(result.slug);
    } catch (err) {
      setSaveError(err.message || "Could not publish the form.");
    } finally {
      setSaving(false);
    }
  };

  if (publishedSlug) {
    return (
      <PublishedPanel
        slug={publishedSlug}
        theme={theme}
        onBuildAnother={() => {
          builder.reset();
          setPublishedSlug(null);
          setShowErrors(false);
        }}
        onDone={() => navigate("/admin/forms")}
      />
    );
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h1 className={adminUi.text.header}>{content.builderTitle}</h1>
          <p className={`${adminUi.text.body} mt-0.5`} style={{ color: theme.mutedColor }}>
            {content.builderSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className={adminUi.control.btnGhost}
            style={{ borderColor: theme.strongBorderColor, color: theme.accentColor }}
          >
            {content.previewTitle}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className={adminUi.control.btnPrimary}
            style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}
          >
            {saving ? content.savingLabel : content.saveLabel}
          </button>
        </div>
      </header>

      <FormSettingsCard builder={builder} theme={theme} />

      {showErrors && builder.validationErrors.length > 0 && (
        <ul
          className={`mb-3 rounded-lg border ${adminUi.pad.panel} ${adminUi.text.body} space-y-0.5`}
          style={{ borderColor: theme.dangerColor, color: theme.dangerColor }}
        >
          {builder.validationErrors.map((e) => <li key={e}>• {e}</li>)}
        </ul>
      )}
      {saveError && (
        <p className={`mb-3 ${adminUi.text.body}`} style={{ color: theme.dangerColor }}>{saveError}</p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[168px_1fr_232px] gap-3 items-start">
        <FieldPalette
          onAdd={(type) => builder.addField(type)}
          onDragStartNew={(type) => setDrag({ kind: "new", type })}
          onDragEnd={() => setDrag(null)}
        />

        <BuilderCanvas
          fields={builder.fields}
          selectedId={builder.selectedId}
          onSelect={builder.setSelectedId}
          onMove={builder.moveField}
          onNudge={builder.nudgeField}
          onInsertNew={builder.addField}
          onRemove={builder.removeField}
          onDuplicate={builder.duplicateField}
          onWidthChange={(id, width) => builder.updateField(id, { width })}
          drag={drag}
          onDragEnd={() => setDrag(null)}
          onDragStartMove={(index) => setDrag({ kind: "move", index })}
        />

        <FieldSettings
          field={builder.selectedField}
          onChange={builder.updateField}
          onRemove={builder.removeField}
        />
      </div>

      {showPreview && (
        <FormPreviewModal form={builder.previewForm} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

/** Title, description, and the payment switch that makes paying optional. */
function FormSettingsCard({ builder, theme }) {
  const { content } = formBuilderConfig;
  const { text, control, pad } = adminUi;

  return (
    <div
      className={`rounded-lg border ${pad.card} mb-3`}
      style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <input
          placeholder="Form title"
          value={builder.title}
          onChange={(e) => builder.setTitle(e.target.value)}
          className={`${control.input} text-[14px] font-semibold`}
        />
        <input
          placeholder="Short description (optional)"
          value={builder.description}
          onChange={(e) => builder.setDescription(e.target.value)}
          className={control.input}
        />
      </div>

      <div
        className="mt-2.5 pt-2.5 border-t flex flex-wrap items-center gap-x-4 gap-y-2"
        style={{ borderColor: theme.borderColor }}
      >
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={builder.requiresPayment}
            onChange={(e) => builder.setRequiresPayment(e.target.checked)}
            className={control.checkbox}
          />
          <span className={text.micro}>Collect payment</span>
        </label>

        {builder.requiresPayment ? (
          <div className="flex items-center gap-1.5">
            <span className={text.body} style={{ color: theme.mutedColor }}>{builder.currency}</span>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="Price"
              value={builder.price}
              onChange={(e) => builder.setPrice(e.target.value)}
              className={`${control.input} w-24`}
            />
            <span className={text.body} style={{ color: theme.mutedColor }}>
              {content.paidFormNote(builder.price || "0", builder.currency)}
            </span>
          </div>
        ) : (
          <span className={text.body} style={{ color: theme.mutedColor }}>{content.freeFormNote}</span>
        )}
      </div>
    </div>
  );
}

function PublishedPanel({ slug, theme, onBuildAnother, onDone }) {
  return (
    <div className="max-w-lg">
      <h1 className={`${adminUi.text.header} mb-1`}>Form published</h1>
      <p className={`${adminUi.text.body} mb-4`} style={{ color: theme.mutedColor }}>
        Share the link or QR code below — anyone with it can fill the form in.
      </p>

      <FormShare slug={slug} compact />

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={onDone}
          className={adminUi.control.btnPrimary}
          style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}
        >
          Back to forms
        </button>
        <button
          type="button"
          onClick={onBuildAnother}
          className={adminUi.control.btnGhost}
          style={{ borderColor: theme.borderColor, color: theme.textColor }}
        >
          Build another
        </button>
      </div>
    </div>
  );
}
