// src/Component/Sections/FormRenderer.jsx
//
// The one place a generated form turns into inputs. Both the public page
// (FormPage.jsx) and the admin builder's preview render through this, which is
// what makes the preview trustworthy — there is no second implementation to
// drift.
//
// Layout: fields flow through a 12-column grid in array order, each taking
// `field.width` columns, so widths that add up to 12 land on one row. Below the
// `sm` breakpoint everything collapses to full width.

import React from "react";
import { formConfig } from "../Config/form.config";
import { formBuilderConfig, isDisplayOnly } from "../Config/formBuilder.config";

const { theme } = formConfig;

export default function FormRenderer({
  form,
  values,
  onChange,
  submitterName,
  submitterEmail,
  onSubmitterNameChange,
  onSubmitterEmailChange,
  onSubmit,
  submitting = false,
  errorMessage = "",
  submitLabel,
  // Preview mode: renders identically but nothing is interactive or submitted.
  readOnly = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!readOnly) onSubmit?.(e);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-12 gap-x-5 gap-y-6">
        <FieldShell width={6}>
          <TextInput
            label="Your Name"
            required
            value={submitterName}
            onChange={onSubmitterNameChange}
            disabled={readOnly}
          />
        </FieldShell>
        <FieldShell width={6}>
          <TextInput
            label="Your Email"
            type="email"
            required
            value={submitterEmail}
            onChange={onSubmitterEmailChange}
            disabled={readOnly}
          />
        </FieldShell>

        {form.fields.map((field) => (
          <FieldShell key={field.id || field.name} width={field.width}>
            <RenderedField
              field={field}
              value={values?.[field.name] ?? ""}
              onChange={(v) => onChange?.(field.name, v)}
              disabled={readOnly}
            />
          </FieldShell>
        ))}
      </div>

      <div>
        <button
          type="submit"
          disabled={submitting || readOnly}
          className="w-full py-4 font-bold uppercase tracking-widest rounded-lg transition-all hover:opacity-90 shadow-lg disabled:opacity-50"
          style={{ backgroundColor: theme.buttonBackground, color: theme.buttonText }}
        >
          {submitLabel}
        </button>

        {errorMessage && (
          <p className="text-red-400 text-center text-sm mt-4 font-medium">{errorMessage}</p>
        )}
      </div>
    </form>
  );
}

/** Places a field into its slice of the 12-column grid. */
function FieldShell({ width, children }) {
  const className = formBuilderConfig.spanClasses[width] || formBuilderConfig.spanClasses[12];
  return <div className={className}>{children}</div>;
}

/**
 * Renders one field by type. Exported so the builder canvas can show the real
 * control inside each draggable card instead of a stand-in.
 */
export function RenderedField({ field, value, onChange, disabled = false, compact = false }) {
  if (isDisplayOnly(field.type)) {
    return <DisplayBlock field={field} compact={compact} />;
  }

  const shared = {
    label: field.label,
    required: field.required,
    helpText: field.helpText,
    disabled,
    compact,
  };

  // `compact` is the admin builder canvas rendering the same control at the
  // console's smaller scale (see Config/adminUi.config.jsx); the public page
  // and the preview keep the full-size version.
  const inputClass = compact ? compactInputClass : fullInputClass;

  switch (field.type) {
    case "textarea":
      return (
        <FieldFrame {...shared}>
          <textarea
            rows={compact ? 2 : 4}
            required={field.required && !disabled}
            placeholder={field.placeholder}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={inputClass}
          />
        </FieldFrame>
      );

    case "select":
      return (
        <FieldFrame {...shared}>
          <select
            required={field.required && !disabled}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={inputClass}
          >
            <option value="">{field.placeholder || "Select…"}</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FieldFrame>
      );

    case "radio":
      return (
        <FieldFrame {...shared}>
          <div className={`flex flex-wrap pt-1 ${compact ? "gap-x-3 gap-y-1" : "gap-x-6 gap-y-3"}`}>
            {(field.options || []).map((option) => (
              <label key={option} className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-sm"}`}>
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={value === option}
                  disabled={disabled}
                  onChange={() => onChange?.(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </FieldFrame>
      );

    case "checkbox": {
      // Multi-select answers ride in the same Dictionary<string,string> the API
      // already stores, joined with ", ".
      const selected = value ? value.split(", ").filter(Boolean) : [];
      const toggle = (option) => {
        const next = selected.includes(option)
          ? selected.filter((o) => o !== option)
          : [...selected, option];
        onChange?.(next.join(", "));
      };
      return (
        <FieldFrame {...shared}>
          <div className={`flex flex-wrap pt-1 ${compact ? "gap-x-3 gap-y-1" : "gap-x-6 gap-y-3"}`}>
            {(field.options || []).map((option) => (
              <label key={option} className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-sm"}`}>
                <input
                  type="checkbox"
                  value={option}
                  checked={selected.includes(option)}
                  disabled={disabled}
                  onChange={() => toggle(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </FieldFrame>
      );
    }

    default:
      return (
        <FieldFrame {...shared}>
          <input
            type={htmlInputType(field.type)}
            required={field.required && !disabled}
            placeholder={field.placeholder}
            value={value}
            disabled={disabled}
            onChange={(e) => onChange?.(e.target.value)}
            className={inputClass}
          />
        </FieldFrame>
      );
  }
}

function DisplayBlock({ field, compact = false }) {
  if (field.type === "divider") {
    return <hr className="border-0 border-t my-2" style={{ borderColor: theme.inputBorder }} />;
  }
  if (field.type === "heading") {
    return (
      <h2
        className={`font-serif font-medium ${compact ? "text-[14px] pt-0.5" : "text-xl pt-2"}`}
        style={{ color: theme.textColor }}
      >
        {field.label}
      </h2>
    );
  }
  return (
    <p className={`leading-relaxed opacity-70 ${compact ? "text-[11px]" : "text-sm"}`}>{field.label}</p>
  );
}

function FieldFrame({ label, required, helpText, children, compact = false }) {
  return (
    <div>
      <label
        className={`block uppercase font-bold tracking-widest opacity-70 ${
          compact ? "text-[10px] mb-1" : "text-xs mb-2"
        }`}
      >
        {label}
        {required && <span style={{ color: theme.accentColor }}> *</span>}
      </label>
      {children}
      {helpText && (
        <p className={`opacity-50 ${compact ? "text-[10px] mt-1" : "text-xs mt-2"}`}>{helpText}</p>
      )}
    </div>
  );
}

function TextInput({ label, value, onChange, type = "text", required = false, disabled = false }) {
  return (
    <FieldFrame label={label} required={required}>
      <input
        type={type}
        required={required && !disabled}
        value={value ?? ""}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.value)}
        className={fullInputClass}
      />
    </FieldFrame>
  );
}

/** "phone" is ours; the browser wants "tel". Everything else maps 1:1. */
const htmlInputType = (type) => (type === "phone" ? "tel" : type);

const fullInputClass =
  "w-full bg-[#0F161E] border border-white/10 rounded-lg px-4 py-3.5 text-white " +
  "focus:outline-none focus:border-[#C19D60] transition-colors disabled:opacity-70";

// Same control at the admin console's scale, for the builder canvas only.
const compactInputClass =
  "w-full bg-[#0F161E] border border-white/10 rounded-md px-2.5 py-[5px] text-[12px] text-white " +
  "focus:outline-none focus:border-[#C19D60] transition-colors disabled:opacity-70";
