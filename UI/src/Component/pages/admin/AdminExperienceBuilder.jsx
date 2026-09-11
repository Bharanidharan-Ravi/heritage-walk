// src/Component/pages/admin/AdminExperienceBuilder.jsx
//
// Three-pane Experience Builder: block palette | arrangeable canvas | block
// settings — same layout idea as AdminFormBuilder.jsx, built on the SEPARATE
// useExperienceBuilder hook (see its header for why). Handles both create
// (/admin/experiences/new/:type) and edit (/admin/experiences/:id/edit).
//
// Price/currency/capacity are deliberately NOT editable here — those stay
// Admin-only, configured from the Experiences list page after approval
// (spec §18/§25 — PUT /api/experiences/{id}/payment).

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { experienceBuilderConfig, EXPERIENCE_TYPES } from "../../Config/experienceBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import { useExperienceBuilder } from "../../Admin/ExperienceBuilder/useExperienceBuilder";
import ExperienceBlockPalette from "../../Admin/ExperienceBuilder/ExperienceBlockPalette";
import ExperienceCanvas from "../../Admin/ExperienceBuilder/ExperienceCanvas";
import ExperienceBlockSettings from "../../Admin/ExperienceBuilder/ExperienceBlockSettings";
import ExperiencePreviewModal from "../../Admin/ExperienceBuilder/ExperiencePreviewModal";

export default function AdminExperienceBuilder() {
  const { token } = useAdminAuth();
  const navigate = useNavigate();
  const params = useParams();
  const isEditing = Boolean(params.id);

  const [experienceType, setExperienceType] = useState(params.type || "walk");
  const [loading, setLoading] = useState(isEditing);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("Draft");

  const builder = useExperienceBuilder(experienceType);
  const { theme, content } = experienceBuilderConfig;

  const [drag, setDrag] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [experienceId, setExperienceId] = useState(params.id || null);

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;

    (async () => {
      try {
        const detail = await adminApi.getExperience(token, params.id);
        if (cancelled) return;
        setExperienceType((detail.type || "walk").toLowerCase());
        setStatus(detail.status);
        builder.loadExisting(detail);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Could not load this experience.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const typeLabel = EXPERIENCE_TYPES.find((t) => t.type === experienceType)?.label || "Experience";

  const handleSaveDraft = async () => {
    if (builder.validationErrors.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (experienceId) {
        await adminApi.updateExperience(token, experienceId, builder.toSaveRequest());
      } else {
        const result = await adminApi.createExperience(token, { type: experienceType, ...builder.toSaveRequest() });
        setExperienceId(result.id);
        navigate(`/admin/experiences/${result.id}/edit`, { replace: true });
      }
    } catch (err) {
      setSaveError(err.message || "Could not save the experience.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (builder.validationErrors.length > 0) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    setSaveError("");
    try {
      let id = experienceId;
      if (id) {
        await adminApi.updateExperience(token, id, builder.toSaveRequest());
      } else {
        const result = await adminApi.createExperience(token, { type: experienceType, ...builder.toSaveRequest() });
        id = result.id;
        setExperienceId(id);
      }
      await adminApi.submitExperience(token, id);
      navigate("/admin/experiences");
    } catch (err) {
      setSaveError(err.message || "Could not submit for approval.");
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = status === "Draft" || status === "ChangesRequested";

  if (loading) {
    return <p className={`${adminUi.text.body} opacity-60`}>Loading…</p>;
  }
  if (loadError) {
    return <p className={adminUi.text.body} style={{ color: theme.dangerColor }}>{loadError}</p>;
  }

  return (
    <div>
      <header className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h1 className={adminUi.text.header}>{content.builderTitle(typeLabel)}</h1>
          <p className={`${adminUi.text.body} mt-0.5`} style={{ color: theme.mutedColor }}>{content.builderSubtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/admin/experiences")} className={adminUi.control.btnGhost} style={{ borderColor: theme.borderColor, color: theme.mutedColor }}>
            {content.cancelLabel}
          </button>
          <button type="button" onClick={() => setShowPreview(true)} className={adminUi.control.btnGhost} style={{ borderColor: theme.strongBorderColor, color: theme.accentColor }}>
            {content.previewTitle}
          </button>
          <button type="button" onClick={handleSaveDraft} disabled={saving || submitting} className={adminUi.control.btnGhost} style={{ borderColor: theme.borderColor, color: theme.textColor }}>
            {saving ? content.savingLabel : content.saveDraftLabel}
          </button>
          {canSubmit && (
            <button type="button" onClick={handleSubmit} disabled={saving || submitting} className={adminUi.control.btnPrimary} style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}>
              {submitting ? content.submittingLabel : content.submitLabel}
            </button>
          )}
        </div>
      </header>

      <SettingsCard builder={builder} theme={theme} />

      {showErrors && builder.validationErrors.length > 0 && (
        <ul className={`mb-3 rounded-lg border ${adminUi.pad.panel} ${adminUi.text.body} space-y-0.5`} style={{ borderColor: theme.dangerColor, color: theme.dangerColor }}>
          {builder.validationErrors.map((e) => <li key={e}>• {e}</li>)}
        </ul>
      )}
      {saveError && <p className={`mb-3 ${adminUi.text.body}`} style={{ color: theme.dangerColor }}>{saveError}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-[176px_1fr_260px] gap-3 items-start">
        <ExperienceBlockPalette
          experienceType={experienceType}
          onAdd={(blockKey) => builder.addBlock(blockKey)}
          onDragStartNew={(blockKey) => setDrag({ kind: "new", blockKey })}
          onDragEnd={() => setDrag(null)}
        />

        <ExperienceCanvas
          experienceType={experienceType}
          blocks={builder.blocks}
          selectedId={builder.selectedId}
          onSelect={builder.setSelectedId}
          onMove={builder.moveBlock}
          onNudge={builder.nudgeBlock}
          onInsertNew={builder.addBlock}
          onRemove={builder.removeBlock}
          onDuplicate={builder.duplicateBlock}
          onWidthChange={(id, width) => builder.updateBlock(id, { width })}
          drag={drag}
          onDragEnd={() => setDrag(null)}
          onDragStartMove={(index) => setDrag({ kind: "move", index })}
        />

        <ExperienceBlockSettings
          experienceType={experienceType}
          block={builder.selectedBlock}
          onChange={builder.updateBlock}
          onRemove={builder.removeBlock}
        />
      </div>

      {showPreview && (
        <ExperiencePreviewModal title={builder.title} blocks={builder.blocks} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}

/** Title + schedule dates. No price/capacity — those are Admin-only, set from the list page. */
function SettingsCard({ builder, theme }) {
  const { text, control, pad } = adminUi;

  return (
    <div className={`rounded-lg border ${pad.card} mb-3`} style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}>
      <input
        placeholder="Experience title"
        value={builder.title}
        onChange={(e) => builder.setTitle(e.target.value)}
        className={`${control.input} text-[14px] font-semibold`}
      />

      <div className="mt-2.5 pt-2.5 border-t grid grid-cols-1 sm:grid-cols-3 gap-2" style={{ borderColor: theme.borderColor }}>
        <div>
          <label className={control.label}>Start date</label>
          <input type="date" value={builder.startDate} onChange={(e) => builder.setStartDate(e.target.value)} className={control.inputSm} />
        </div>
        <div>
          <label className={control.label}>End date</label>
          <input type="date" value={builder.endDate} onChange={(e) => builder.setEndDate(e.target.value)} className={control.inputSm} />
        </div>
        <div>
          <label className={control.label}>Booking end date</label>
          <input type="date" value={builder.bookingEndDate} onChange={(e) => builder.setBookingEndDate(e.target.value)} className={control.inputSm} />
        </div>
      </div>
      <p className={`${text.body} mt-1.5 opacity-60`}>
        Payment, capacity and the registration form are configured by an Admin after approval.
      </p>
    </div>
  );
}
