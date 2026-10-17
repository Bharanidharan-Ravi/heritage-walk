// Admin-only: edit the app-wide payment settings (platform fee %, Cashfree
// fee %, GST on that fee, pricing mode, Sandbox/Production, payments on/off).
// These live in the single PaymentSettings row on the API — not appsettings —
// so a change here takes effect immediately, no redeploy. Cashfree keys are
// NOT editable here; they stay in user-secrets / App Service configuration.
//
// Changing a percentage only affects prices calculated afterwards (the
// Experience Builder's price calculator). Customers are charged the price
// already saved on each experience.

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAdminAuth } from "../../Admin/AuthContext";
import { adminApi } from "../../Admin/adminApi";
import { adminConfig } from "../../Config/admin.config";
import { adminUi } from "../../Config/adminUi.config";
import { qk } from "../../../queryKeys";

// Number inputs are kept as strings while editing so a cleared field stays
// empty instead of snapping to 0.
const toForm = (s) => ({
  provider: s.provider,
  environment: s.environment,
  isEnabled: s.isEnabled,
  platformFeePercent: String(s.platformFeePercent),
  gatewayFeePercent: String(s.gatewayFeePercent),
  gatewayGstPercent: String(s.gatewayGstPercent),
  pricingMode: s.pricingMode,
  currency: s.currency,
});

const toPayload = (f) => ({
  provider: f.provider,
  environment: f.environment,
  isEnabled: f.isEnabled,
  platformFeePercent: Number(f.platformFeePercent),
  gatewayFeePercent: Number(f.gatewayFeePercent),
  gatewayGstPercent: Number(f.gatewayGstPercent),
  pricingMode: f.pricingMode,
  currency: f.currency,
});

const formatMoney = (n) =>
  Number(n ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdminSettings() {
  const { token } = useAdminAuth();
  const queryClient = useQueryClient();
  const { theme, settings: copy } = adminConfig;
  const { text, control, pad } = adminUi;

  const { data: settings, isLoading, error: loadError } = useQuery({
    queryKey: qk.paymentSettings(),
    queryFn: () => adminApi.getPaymentSettings(token),
    enabled: !!token,
  });

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [previewBase, setPreviewBase] = useState(String(copy.previewDefaultBase));
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");

  useEffect(() => {
    if (settings) setForm(toForm(settings));
  }, [settings]);

  const runPreview = async (base = previewBase) => {
    const amount = Number(base);
    if (!amount || amount <= 0) return;
    setPreviewError("");
    try {
      setPreview(await adminApi.previewPrice(token, amount));
    } catch (err) {
      setPreview(err.data?.data ?? null);
      setPreviewError(err.message || "Could not load preview.");
    }
  };

  // Show a preview for the default amount as soon as settings are loaded.
  useEffect(() => {
    if (settings && token) runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, token]);

  const set = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setNotice("");
  };

  const handleEnvironment = (e) => {
    const next = e.target.value;
    if (next === "Production" && form.environment !== "Production" && !window.confirm(copy.productionConfirm)) return;
    set("environment")(e);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await adminApi.updatePaymentSettings(token, toPayload(form));
      queryClient.setQueryData(qk.paymentSettings(), updated);
      setNotice(copy.saved);
    } catch (err) {
      setError(err.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  const dirty = settings && form && JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(toForm(settings)));
  const modeHint = copy.pricingModeOptions.find((o) => o.value === form?.pricingMode)?.hint;

  if (isLoading || (!form && !loadError)) return <p className={`${text.body} opacity-60`}>Loading…</p>;
  if (loadError) {
    return (
      <p className={text.body} style={{ color: theme.dangerColor }}>
        {loadError.message || "Could not load settings."}
      </p>
    );
  }

  const cardStyle = { backgroundColor: theme.cardBackground, borderColor: theme.borderColor };

  return (
    <div>
      <h1 className={`${text.header} mb-3`}>{copy.title}</h1>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <form
          onSubmit={handleSave}
          className={`${pad.card} rounded-lg border w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3`}
          style={cardStyle}
        >
          <div className="sm:col-span-2">
            <h2 className={text.bodyHeader}>{copy.paymentHeading}</h2>
            <p className={control.help}>{copy.paymentHint}</p>
          </div>

          <PercentField label={copy.platformFeeLabel} hint={copy.platformFeeHint} value={form.platformFeePercent} onChange={set("platformFeePercent")} control={control} />
          <PercentField label={copy.gatewayFeeLabel} hint={copy.gatewayFeeHint} value={form.gatewayFeePercent} onChange={set("gatewayFeePercent")} control={control} />
          <PercentField label={copy.gatewayGstLabel} hint={copy.gatewayGstHint} value={form.gatewayGstPercent} onChange={set("gatewayGstPercent")} control={control} />

          <div>
            <label className={control.label}>{copy.pricingModeLabel}</label>
            <select value={form.pricingMode} onChange={set("pricingMode")} className={control.input}>
              {copy.pricingModeOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {modeHint && <p className={control.help}>{modeHint}</p>}
          </div>

          <div>
            <label className={control.label}>{copy.environmentLabel}</label>
            <select value={form.environment} onChange={handleEnvironment} className={control.input}>
              {copy.environmentOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={control.label}>{copy.currencyLabel}</label>
            <input value={form.currency} disabled className={`${control.input} opacity-60`} />
          </div>

          <label className={`sm:col-span-2 flex items-center gap-2 ${text.body}`}>
            <input type="checkbox" checked={form.isEnabled} onChange={set("isEnabled")} className={control.checkbox} />
            {copy.enabledLabel}
          </label>

          {error && <p className={`sm:col-span-2 ${text.body}`} style={{ color: theme.dangerColor }}>{error}</p>}
          {notice && <p className={`sm:col-span-2 ${text.body}`} style={{ color: theme.successColor }}>{notice}</p>}

          <div className="sm:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={saving || !dirty}
              className={control.btnPrimary}
              style={{ backgroundColor: theme.accentColor, color: theme.sidebarBackground }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={saving || !dirty}
              onClick={() => { setForm(toForm(settings)); setError(""); }}
              className={control.btnGhost}
              style={{ borderColor: theme.borderColor, color: theme.textColor }}
            >
              Reset
            </button>
          </div>

          {settings.updatedAt && (
            <p className={`sm:col-span-2 ${control.help}`}>
              Last updated {new Date(settings.updatedAt).toLocaleString()}
            </p>
          )}
        </form>

        <div className={`${pad.card} rounded-lg border w-full max-w-sm`} style={cardStyle}>
          <h2 className={`${text.bodyHeader} mb-2`}>{copy.previewHeading}</h2>
          <label className={control.label}>{copy.previewBaseLabel}</label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              min="1"
              step="0.01"
              value={previewBase}
              onChange={(e) => setPreviewBase(e.target.value)}
              className={control.input}
            />
            <button
              type="button"
              onClick={() => runPreview()}
              className={control.btnGhost}
              style={{ borderColor: theme.accentColor, color: theme.accentColor }}
            >
              Calculate
            </button>
          </div>

          {previewError && <p className={`${text.body} mb-2`} style={{ color: theme.dangerColor }}>{previewError}</p>}

          {preview && (
            <dl className={`${text.body} grid grid-cols-[1fr_auto] gap-x-3 gap-y-1`}>
              <PreviewRow label="Customer pays (minimum)" value={formatMoney(preview.minimumCustomerAmount)} strong />
              <PreviewRow label={`Platform fee (${preview.platformFeePercent}%)`} value={formatMoney(preview.platformFeeAmount)} />
              <PreviewRow label={`Cashfree fee (${preview.gatewayFeePercent}%)`} value={formatMoney(preview.gatewayFeeAmount)} />
              <PreviewRow label={`GST on Cashfree fee (${preview.gatewayGstPercent}%)`} value={formatMoney(preview.gatewayGstAmount)} />
              <PreviewRow label="You receive" value={formatMoney(preview.expectedNetAmount)} strong />
            </dl>
          )}
          {dirty && <p className={control.help}>Save to see the preview with your new values.</p>}
        </div>
      </div>
    </div>
  );
}

function PercentField({ label, hint, value, onChange, control }) {
  return (
    <div>
      <label className={control.label}>{label}</label>
      <input
        required
        type="number"
        min="0"
        max="100"
        step="0.01"
        value={value}
        onChange={onChange}
        className={control.input}
      />
      <p className={control.help}>{hint}</p>
    </div>
  );
}

function PreviewRow({ label, value, strong }) {
  return (
    <>
      <dt className={strong ? "font-semibold" : "opacity-70"}>{label}</dt>
      <dd className={`text-right tabular-nums ${strong ? "font-semibold" : ""}`}>₹{value}</dd>
    </>
  );
}
