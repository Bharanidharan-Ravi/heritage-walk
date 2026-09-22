// src/Component/pages/admin/AdminExperienceBuilder.jsx
//
// Three-pane Experience Builder: block palette | arrangeable canvas | block
// settings — same layout idea as AdminFormBuilder.jsx, built on the SEPARATE
// useExperienceBuilder hook (see its header for why). Handles both create
// (/admin/experiences/new/:type) and edit (/admin/experiences/:id/edit).
//
// Price/currency/capacity/registration-type/slots are Admin-only, saved via
// their OWN endpoint (PUT /api/experiences/{id}/payment) instead of the
// Save-draft/Submit actions above — same split as the Experiences list
// page's "Set Payment" modal, just relocated onto the canvas's cart widget
// (see the `isAdmin` gate on ExperienceCanvas/ExperienceBlockSettings) so an
// Admin building an experience doesn't have to leave the Builder to price it.
// An Employee sees the exact same non-interactive cart skeleton as before.

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import { experienceBuilderConfig, EXPERIENCE_TYPES } from "../../Config/experienceBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import { useExperienceBuilder } from "../../Admin/ExperienceBuilder/useExperienceBuilder";
import ExperienceBlockPalette from "../../Admin/ExperienceBuilder/ExperienceBlockPalette";
import ExperienceCanvas, { CartSlot, CART_BLOCK_ID } from "../../Admin/ExperienceBuilder/ExperienceCanvas";
import ExperienceBlockSettings from "../../Admin/ExperienceBuilder/ExperienceBlockSettings";
import ExperiencePreviewModal from "../../Admin/ExperienceBuilder/ExperiencePreviewModal";
import { useFormBuilder } from "../../Admin/FormBuilder/useFormBuilder";
import FieldPalette from "../../Admin/FormBuilder/FieldPalette";
import BuilderCanvas from "../../Admin/FormBuilder/BuilderCanvas";
import FieldSettings from "../../Admin/FormBuilder/FieldSettings";
import { formBuilderConfig } from "../../Config/formBuilder.config";
import { experiencePublicConfig } from "../../Config/experiencePublic.config";
import { qk } from "../../../queryKeys";

export default function AdminExperienceBuilder() {
  const { token, user } = useAdminAuth();
  const isAdmin = user?.role === adminConfig.roles.ADMIN;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const params = useParams();
  const isEditing = Boolean(params.id);

  const [experienceType, setExperienceType] = useState(params.type || "walk");
  const [status, setStatus] = useState("Draft");
  const [hydrated, setHydrated] = useState(!isEditing);

  const builder = useExperienceBuilder(experienceType);
  const { theme, content } = experienceBuilderConfig;
  const { theme: pageTheme, content: pageContent } = experiencePublicConfig;

  // The registration form (Name/Email/Phone/Food/"How did you hear"/Address/…)
  // is built right here with the SAME embedded palette+canvas+settings the
  // standalone Form Builder uses (Admin/FormBuilder/*), so an Admin never
  // leaves this page to add fields — see handleSaveCart, which auto-creates
  // or updates the linked FormTemplate behind the scenes on save.
  const regForm = useFormBuilder();
  const [regFormDrag, setRegFormDrag] = useState(null);
  // Registration screen: is the booking-widget card (not a form field) the
  // thing being edited in the right-hand settings panel?
  const [regCartSelected, setRegCartSelected] = useState(false);
  const [step, setStep] = useState("page"); // "page" | "register" — two full-height screens, same 3-column layout

  const [drag, setDrag] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [experienceId, setExperienceId] = useState(params.id || null);

  // ---- Admin-only cart config (payment/capacity/registration type/slots) —
  // loaded from `detail` below, saved through its own endpoint, see the
  // header comment. Untouched by (and never sent from) Save draft/Submit.
  const [linkedFormTemplateId, setLinkedFormTemplateId] = useState(null);
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [capacityTotal, setCapacityTotal] = useState("");
  const [registrationType, setRegistrationType] = useState("Group");
  const [privateSlots, setPrivateSlots] = useState([]);
  const [privateMinPeople, setPrivateMinPeople] = useState("1");
  const [cartSaving, setCartSaving] = useState(false);
  const [cartError, setCartError] = useState("");

  const {
    data: detail,
    isLoading: loading,
    error: loadQueryError,
  } = useQuery({
    queryKey: qk.experience(params.id),
    queryFn: () => adminApi.getExperience(token, params.id),
    enabled: isEditing && !!token,
    staleTime: Infinity,
  });
  const loadError = loadQueryError?.message;

  // Hydrate the builder's local editing state whenever a (re)fetched detail
  // comes in — e.g. after this same query is invalidated by a save. TanStack
  // Query v5 has no useQuery(onSuccess), so this replaces that.
  useEffect(() => {
    if (!detail) return;
    setExperienceType((detail.type || "walk").toLowerCase());
    setStatus(detail.status);
    builder.loadExisting(detail);
    setLinkedFormTemplateId(detail.linkedFormTemplateId ?? null);
    setRequiresPayment(detail.requiresPayment);
    setPrice(detail.requiresPayment ? String(detail.price) : "");
    setCurrency(detail.currency || "INR");
    setCapacityTotal(detail.capacityTotal ?? "");
    // "Individual" is the pre-rename spelling of Group.
    setRegistrationType(!detail.registrationType || detail.registrationType === "Individual" ? "Group" : detail.registrationType);
    setPrivateSlots((detail.privateSlots || []).map((d) => d.slice(0, 10)));
    setPrivateMinPeople(String(detail.privateMinPeople || 1));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail]);

  // Load the already-linked form's fields into the embedded registration-form
  // builder so re-opening a saved experience shows them, not a blank canvas.
  useEffect(() => {
    if (!detail?.linkedFormTemplateId || !token) return;
    let cancelled = false;
    adminApi.getFormById(token, detail.linkedFormTemplateId).then((form) => {
      if (!cancelled) {
        regForm.loadExisting({
          ...form,
          fields: (form.fields || []).filter((f) => !pageContent.cartOwnedFieldKeys.includes(f.name)),
        });
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.linkedFormTemplateId, token]);

  const typeLabel = EXPERIENCE_TYPES.find((t) => t.type === experienceType)?.label || "Experience";

  // Both status-changing actions (Create, Update, Submit) leave the detail
  // and list caches stale — the API returns only {status, id}, not the full
  // updated DTO, so invalidate rather than hand-patch.
  const invalidateAfterSave = (id) => {
    if (id) queryClient.invalidateQueries({ queryKey: qk.experience(id) });
    queryClient.invalidateQueries({ queryKey: ["experiences", "list"] });
  };

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
        invalidateAfterSave(experienceId);
      } else {
        const result = await adminApi.createExperience(token, { type: experienceType, ...builder.toSaveRequest() });
        setExperienceId(result.id);
        invalidateAfterSave(result.id);
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
      invalidateAfterSave(id);
      navigate("/admin/experiences");
    } catch (err) {
      setSaveError(err.message || "Could not submit for approval.");
    } finally {
      setSubmitting(false);
    }
  };

  // Admin-only. The Cart & payment panel also carries Start/End/Booking-end
  // date now (moved out of the canvas — they only mean anything in relation
  // to Registration type, which lives here too) — but those three are still
  // saved through the DRAFT endpoint (Create/Update), not PUT .../payment,
  // so "Save cart settings" has to hit both: (re)save the draft with the
  // builder's current state first (creating it if it has no id yet — same
  // request Save Draft itself sends, so the Admin never has to leave this
  // panel to save one first), then save payment/registration/slots.
  // `linkedFormTemplateId` is carried through untouched: this editor never
  // offers a form picker (that stays on the Experiences list page's own "Set
  // Payment" modal), so resaving here must not clobber whatever's linked.
  const handleSaveCart = async () => {
    if (builder.validationErrors.length > 0) {
      setShowErrors(true);
      setCartError("Give the experience a title and at least one block first.");
      return;
    }
    // "Give the form a title." is ignored here — the registration form never
    // shows its own title field, it always inherits the experience's title
    // (see the payload below), so that one warning would never clear itself.
    const formErrors = regForm.fields.length > 0
      ? regForm.validationErrors.filter((e) => e !== "Give the form a title.")
      : [];
    if (formErrors.length > 0) {
      setCartError(formErrors[0]);
      return;
    }

    setCartSaving(true);
    setCartError("");
    try {
      let id = experienceId;
      if (id) {
        await adminApi.updateExperience(token, id, builder.toSaveRequest());
      } else {
        const result = await adminApi.createExperience(token, { type: experienceType, ...builder.toSaveRequest() });
        id = result.id;
        setExperienceId(id);
        navigate(`/admin/experiences/${id}/edit`, { replace: true });
      }

      // Registration fields are edited right here, but they're still saved as
      // a FormTemplate under the hood (see the module header comment) so the
      // existing Form Generator submission/payment pipeline (FormsController)
      // needs no changes — only its price/currency are pulled from THIS
      // cart's own settings so there's a single payment config, not two.
      let formId = linkedFormTemplateId;
      if (regForm.fields.length > 0) {
        const formPayload = {
          ...regForm.toCreateRequest(),
          title: `${builder.title.trim() || typeLabel} — Registration`,
          requiresPayment,
          price: requiresPayment ? Number(price) || 0 : 0,
          currency,
        };
        if (formId) {
          await adminApi.updateForm(token, formId, formPayload);
        } else {
          const createdForm = await adminApi.createForm(token, formPayload);
          formId = createdForm.id;
          setLinkedFormTemplateId(formId);
        }
      }

      await adminApi.setExperiencePayment(token, id, {
        requiresPayment,
        price: requiresPayment ? Number(price) || 0 : 0,
        currency,
        capacityTotal: capacityTotal === "" ? null : Number(capacityTotal),
        linkedFormTemplateId: formId,
        registrationType,
        slots: [],
        privateSlots: registrationType === "Group" ? [] : privateSlots,
        privateMinPeople: Math.max(1, Number(privateMinPeople) || 1),
      });
      invalidateAfterSave(id);
    } catch (err) {
      setCartError(err.message || "Could not save the cart settings.");
    } finally {
      setCartSaving(false);
    }
  };

  const canSubmit = status === "Draft" || status === "ChangesRequested";

  if (loading || !hydrated) {
    return <p className={`${adminUi.text.body} opacity-60`}>Loading…</p>;
  }
  if (loadError) {
    return <p className={adminUi.text.body} style={{ color: theme.dangerColor }}>{loadError}</p>;
  }

  return (
    // Fixed height = the viewport minus AdminLayout's `p-4` (top+bottom = 2rem)
    // so this component owns its own scroll instead of the whole document:
    // the header below stays pinned, and only the palette/canvas/settings
    // grid (the "experience builder area" — title and schedule dates included,
    // as slots inside the canvas) scrolls internally.
    <div className="flex flex-col" style={{ height: "calc(100vh - 2rem)" }}>
      <div className="shrink-0">
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

        {showErrors && builder.validationErrors.length > 0 && (
          <ul className={`mb-3 rounded-lg border ${adminUi.pad.panel} ${adminUi.text.body} space-y-0.5`} style={{ borderColor: theme.dangerColor, color: theme.dangerColor }}>
            {builder.validationErrors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        )}
        {saveError && <p className={`mb-3 ${adminUi.text.body}`} style={{ color: theme.dangerColor }}>{saveError}</p>}

        {isAdmin && (
          <div className="flex gap-1.5 mb-3">
            {[["page", "1 · Page"], ["register", "2 · Registration form"]].map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStep(key)}
                className={adminUi.control.btnGhost}
                style={{
                  borderColor: step === key ? theme.accentColor : theme.borderColor,
                  color: step === key ? theme.accentColor : theme.mutedColor,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Palette, canvas, and settings each get their OWN scrollbar on
          desktop (lg:h-full + lg:overflow-y-auto), instead of one shared
          scroll dragging all three columns together — a long block list and
          a long canvas no longer fight over the same scroll position. Mobile
          keeps the simple single-column stacked scroll it already had. */}
      <div className={`${step === "page" ? "" : "hidden"} flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-1`}>
        <div className="flex flex-col lg:flex-row gap-3 lg:h-full items-start lg:items-stretch">
          <div className="w-full lg:w-44 lg:shrink-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <ExperienceBlockPalette
              experienceType={experienceType}
              onAdd={(blockKey) => builder.addBlock(blockKey)}
              onDragStartNew={(blockKey) => setDrag({ kind: "new", blockKey })}
              onDragEnd={() => setDrag(null)}
            />
          </div>

          <div className="w-full lg:flex-1 lg:min-w-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <ExperienceCanvas
            experienceType={experienceType}
            title={builder.title}
            onTitleChange={builder.setTitle}
            startDate={builder.startDate}
            endDate={builder.endDate}
            bookingEndDate={builder.bookingEndDate}
            onStartDateChange={builder.setStartDate}
            onEndDateChange={builder.setEndDate}
            onBookingEndDateChange={builder.setBookingEndDate}
            blocks={builder.blocks}
            selectedId={builder.selectedId}
            onSelect={builder.setSelectedId}
            onMove={builder.moveBlock}
            onNudge={builder.nudgeBlock}
            onInsertNew={builder.addBlock}
            onUpdateBlock={builder.updateBlock}
            onRemove={builder.removeBlock}
            onDuplicate={builder.duplicateBlock}
            drag={drag}
            onDragEnd={() => setDrag(null)}
            onDragStartMove={(index) => setDrag({ kind: "move", index })}
            isAdmin={isAdmin}
            requiresPayment={requiresPayment}
            price={price}
            currency={currency}
            capacityTotal={capacityTotal}
            registrationType={registrationType}
            privateSlots={privateSlots}
            privateMinPeople={privateMinPeople}
          />
          </div>

          <div className="w-full lg:w-65 lg:shrink-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
          <ExperienceBlockSettings
            experienceType={experienceType}
            block={builder.selectedBlock}
            onChange={builder.updateBlock}
            onRemove={builder.removeBlock}
            selectedId={builder.selectedId}
            title={builder.title}
            onTitleChange={builder.setTitle}
            startDate={builder.startDate}
            endDate={builder.endDate}
            bookingEndDate={builder.bookingEndDate}
            onStartDateChange={builder.setStartDate}
            onEndDateChange={builder.setEndDate}
            onBookingEndDateChange={builder.setBookingEndDate}
            isAdmin={isAdmin}
            hasExperienceId={Boolean(experienceId)}
            token={token}
            requiresPayment={requiresPayment}
            onRequiresPaymentChange={setRequiresPayment}
            price={price}
            onPriceChange={setPrice}
            currency={currency}
            onCurrencyChange={setCurrency}
            capacityTotal={capacityTotal}
            onCapacityTotalChange={setCapacityTotal}
            registrationType={registrationType}
            onRegistrationTypeChange={setRegistrationType}
            privateSlots={privateSlots}
            onPrivateSlotsChange={setPrivateSlots}
            privateMinPeople={privateMinPeople}
            onPrivateMinPeopleChange={setPrivateMinPeople}
            onSaveCart={handleSaveCart}
            cartSaving={cartSaving}
            cartError={cartError}
          />
          </div>
        </div>
      </div>

      {/* Registration form — Admin-only (setExperiencePayment, which links it,
          is an Admin-only endpoint). Built with the SAME palette/canvas/
          settings trio the standalone Form Builder uses, just pointed at
          `regForm`'s state instead of a page of its own — see handleSaveCart
          for how it's turned into a FormTemplate on save. Sits below the
          fixed-height builder area above (which owns its own internal
          scroll), so it scrolls into view with the rest of the page. */}
      {isAdmin && (
        <div className={`${step === "register" ? "" : "hidden"} flex-1 min-h-0 flex flex-col`}>
          <p className={`${adminUi.text.body} mb-2 shrink-0`} style={{ color: theme.mutedColor }}>
            Registration form — drag in the fields visitors fill out. Saved with “Save cart settings” on the Page screen.
          </p>

          {regForm.fields.length > 0 && regForm.warnings.includes("noSubmitterEmail") && (
            <p className={`mb-3 ${adminUi.text.body}`} style={{ color: theme.mutedColor }}>
              {formBuilderConfig.content.noSubmitterEmailWarning}
            </p>
          )}

          <div className="flex flex-col lg:flex-row gap-3 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden items-start lg:items-stretch">
            <div className="w-full lg:w-44 lg:shrink-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
            <FieldPalette
              hiddenKeys={pageContent.cartOwnedFieldKeys}
              onAdd={(blockKey) => { setRegCartSelected(false); regForm.addField(blockKey); }}
              onDragStartNew={(blockKey) => setRegFormDrag({ kind: "new", blockKey })}
              onDragEnd={() => setRegFormDrag(null)}
            />

            </div>
            <div className="w-full lg:flex-1 lg:min-w-0 lg:h-full lg:min-h-0 rounded-lg border overflow-hidden" style={{ borderColor: theme.borderColor, backgroundColor: pageTheme.pageBackground, color: pageTheme.textColor }}>
            {/* Two independent scrollers, like the public page: only the form
                column scrolls; the booking card stays put. */}
            <div className="flex flex-col lg:flex-row gap-8 lg:h-full px-6 md:px-10">
            <div className="lg:w-2/3 w-full min-w-0 lg:h-full lg:overflow-y-auto py-8 lg:pr-2">
              <p className="uppercase tracking-widest text-xs font-bold mb-2" style={{ color: pageTheme.accentColor }}>{typeLabel}</p>
              <h1 className="text-4xl font-serif mb-6">{builder.title || pageContent.registrationTitleFallback}</h1>
              <h2 className="text-2xl font-serif mb-3" style={{ color: pageTheme.accentColor }}>{pageContent.registrationHeading}</h2>
            <BuilderCanvas
              light
              fields={regForm.fields}
              selectedId={regForm.selectedId}
              onSelect={(id) => { setRegCartSelected(false); regForm.setSelectedId(id); }}
              onMove={regForm.moveField}
              onNudge={regForm.nudgeField}
              onInsertNew={(blockKey, at) => { setRegCartSelected(false); regForm.addField(blockKey, at); }}
              onRemove={regForm.removeField}
              onDuplicate={regForm.duplicateField}
              onWidthChange={(id, width) => regForm.updateField(id, { width })}
              drag={regFormDrag}
              onDragEnd={() => setRegFormDrag(null)}
              onDragStartMove={(index) => setRegFormDrag({ kind: "move", index })}
            />
            </div>
            <aside className="lg:w-1/3 w-full lg:h-full lg:overflow-y-auto py-8 px-2 -mx-2">
              <CartSlot
                selected={regCartSelected}
                onClick={() => { regForm.setSelectedId(null); setRegCartSelected(true); }}
                requiresPayment={requiresPayment}
                price={price}
                currency={currency}
                capacityTotal={capacityTotal}
                registrationType={registrationType}
                privateSlots={privateSlots}
                privateMinPeople={privateMinPeople}
                startDate={builder.startDate}
              />
            </aside>
            </div>
            </div>
            <div className="w-full lg:w-58 lg:shrink-0 lg:h-full lg:min-h-0 lg:overflow-y-auto">
            {regCartSelected ? (
              <ExperienceBlockSettings
                experienceType={experienceType}
                block={null}
                selectedId={CART_BLOCK_ID}
                isAdmin={isAdmin}
                hasExperienceId={Boolean(experienceId)}
                token={token}
                startDate={builder.startDate}
                endDate={builder.endDate}
                bookingEndDate={builder.bookingEndDate}
                onStartDateChange={builder.setStartDate}
                onEndDateChange={builder.setEndDate}
                onBookingEndDateChange={builder.setBookingEndDate}
                requiresPayment={requiresPayment}
                onRequiresPaymentChange={setRequiresPayment}
                price={price}
                onPriceChange={setPrice}
                currency={currency}
                onCurrencyChange={setCurrency}
                capacityTotal={capacityTotal}
                onCapacityTotalChange={setCapacityTotal}
                registrationType={registrationType}
                onRegistrationTypeChange={setRegistrationType}
                privateSlots={privateSlots}
                onPrivateSlotsChange={setPrivateSlots}
                privateMinPeople={privateMinPeople}
                onPrivateMinPeopleChange={setPrivateMinPeople}
                onSaveCart={handleSaveCart}
                cartSaving={cartSaving}
                cartError={cartError}
              />
            ) : (
              <FieldSettings
                field={regForm.selectedField}
                onChange={regForm.updateField}
                onChangeChild={regForm.updateChild}
                onRemove={regForm.removeField}
              />
            )}
            </div>
          </div>
        </div>
      )}

      {showPreview && (
        <ExperiencePreviewModal
          title={builder.title}
          experienceType={experienceType}
          blocks={builder.blocks}
          startDate={builder.startDate}
          endDate={builder.endDate}
          bookingEndDate={builder.bookingEndDate}
          requiresPayment={requiresPayment}
          price={price}
          currency={currency}
          capacityTotal={capacityTotal}
          registrationType={registrationType}
          privateSlots={privateSlots}
          privateMinPeople={privateMinPeople}
          registrationFields={regForm.fields}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
