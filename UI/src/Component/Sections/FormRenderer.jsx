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
//
// Name and email are NOT special-cased here. They used to be hardcoded above
// the field list, which meant the form author could neither see nor edit them
// in the builder. They are now ordinary fields carrying `role: "submitterName"`
// / `role: "submitterEmail"`, seeded onto every new form but deletable like
// anything else — FormPage reads those roles back off the answers.

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { formConfig } from "../Config/form.config";
import { formBuilderConfig, isDisplayOnly, isConsent, isGroup } from "../Config/formBuilder.config";
import { resolveOptions, isValidPincode, lookupPincode } from "../Config/indiaGeo.config";

const { theme } = formConfig;

// Light tone: inputs drawn on the cream public page (the experience
// registration screen) instead of the dark form page. Read through context so
// it reaches every nested control without threading a prop through each one.
const LightToneContext = createContext(false);
const useInputClass = (compact) => {
  const light = useContext(LightToneContext);
  if (light) return compact ? compactLightInputClass : fullLightInputClass;
  return compact ? compactInputClass : fullInputClass;
};

export default function FormRenderer({
  form,
  values,
  onChange,
  onSubmit,
  submitting = false,
  errorMessage = "",
  submitLabel,
  // Preview mode: renders identically but nothing is interactive or submitted.
  readOnly = false,
  light = false,
  // The page supplies its own action button (the booking card's Pay Now).
  hideSubmit = false,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!readOnly) onSubmit?.(e);
  };

  return (
    <LightToneContext.Provider value={light}>
    <form onSubmit={handleSubmit} className="space-y-8" noValidate={readOnly}>
      <div className="grid grid-cols-12 gap-x-5 gap-y-6">
        {form.fields.map((field) => (
          <FieldShell key={field.id || field.name} width={field.width}>
            <RenderedField
              field={field}
              value={values?.[field.name] ?? ""}
              values={values}
              onChange={(v) => onChange?.(field.name, v)}
              onChangeNamed={onChange}
              disabled={readOnly}
            />
          </FieldShell>
        ))}
      </div>

      {!hideSubmit && (
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
      )}
    </form>
    </LightToneContext.Provider>
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
 *
 * `values` / `onChangeNamed` are only needed by composite blocks, which write
 * several answers under dotted keys ("address.pincode") rather than one.
 */
export function RenderedField({
  light,
  field,
  value,
  values,
  onChange,
  onChangeNamed,
  disabled = false,
  compact = false,
}) {
  // An explicit `light` prop wins; otherwise inherit from an enclosing provider.
  if (light !== undefined) {
    return (
      <LightToneContext.Provider value={light}>
        <RenderedField {...{ field, value, values, onChange, onChangeNamed, disabled, compact }} />
      </LightToneContext.Provider>
    );
  }

  if (isDisplayOnly(field.type)) {
    return <DisplayBlock field={field} compact={compact} />;
  }

  if (isGroup(field.type)) {
    return (
      <GroupBlock
        field={field}
        values={values}
        onChangeNamed={onChangeNamed}
        disabled={disabled}
        compact={compact}
      />
    );
  }

  if (isConsent(field.type)) {
    return <ConsentBlock field={field} value={value} onChange={onChange} disabled={disabled} compact={compact} />;
  }

  return <InputField field={field} value={value} onChange={onChange} disabled={disabled} compact={compact} />;
}

// --------------------------------------------------------------- plain inputs

function InputField({ field, value, onChange, disabled, compact }) {
  const shared = {
    label: field.label,
    required: field.required,
    helpText: field.helpText,
    compact,
  };

  // `compact` is the admin builder canvas rendering the same control at the
  // console's smaller scale (see Config/adminUi.config.jsx); the public page
  // and the preview keep the full-size version.
  const inputClass = useInputClass(compact);
  const options = resolveOptions(field);
  const v = field.validation || {};

  switch (field.type) {
    case "textarea":
      return (
        <FieldFrame {...shared}>
          <textarea
            rows={compact ? 2 : 4}
            required={field.required && !disabled}
            placeholder={field.placeholder}
            minLength={v.minLength}
            maxLength={v.maxLength}
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
            {options.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FieldFrame>
      );

    case "radio":
      return (
        <FieldFrame {...shared}>
          <div className={`flex flex-wrap pt-1 ${compact ? "gap-x-3 gap-y-1" : "gap-x-6 gap-y-3"}`}>
            {options.map((option) => (
              <label key={option} className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-sm"}`}>
                <input
                  type="radio"
                  name={field.name}
                  value={option}
                  checked={value === option}
                  disabled={disabled}
                  required={field.required && !disabled && !value}
                  onChange={() => onChange?.(option)}
                />
                {option}
              </label>
            ))}
          </div>
        </FieldFrame>
      );

    case "checkbox":
      return (
        <FieldFrame {...shared}>
          <CheckboxGroup
            field={field}
            options={options}
            value={value}
            onChange={onChange}
            disabled={disabled}
            compact={compact}
          />
        </FieldFrame>
      );

    default:
      return (
        <FieldFrame {...shared}>
          <TextLikeInput field={field} value={value} onChange={onChange} disabled={disabled} compact={compact} />
        </FieldFrame>
      );
  }
}

/**
 * text / email / phone / number / date / time, plus everything the field's
 * `validation` block asks for. Native constraint attributes do the blocking —
 * the browser refuses to submit — and `setCustomValidity` swaps the generic
 * browser wording for the message the form author configured.
 */
function TextLikeInput({ field, value, onChange, disabled, compact }) {
  const ref = useRef(null);
  const v = field.validation || {};
  const [invalid, setInvalid] = useState(false);

  // Validity is read in the event handlers, never during render or from an
  // effect: a ref's `current` isn't render-safe, and syncing state out of an
  // effect just to mirror the DOM causes cascading renders.
  //
  // Checking on blur is also the right moment for the person filling the form
  // in — nobody wants "invalid email" while they're still on the second letter.
  const handleBlur = (e) => {
    const el = e.currentTarget;
    const filled = Boolean(el.value);

    // Clearing first is what lets the browser re-run its own checks before we
    // override its generic wording with the author's message.
    el.setCustomValidity("");
    const bad = filled && !el.checkValidity();
    if (bad && v.message) el.setCustomValidity(v.message);
    setInvalid(bad);
  };

  const handleChange = (e) => {
    // Stripping as they type is friendlier than rejecting on submit, and it
    // makes the 10-digit phone rule impossible to trip over.
    const raw = e.target.value;
    const next = v.digitsOnly ? raw.replace(/\D/g, "").slice(0, v.maxLength || undefined) : raw;

    // A stale custom message would keep blocking submit even once the value is
    // fixed, so it always goes when the value changes.
    e.target.setCustomValidity("");
    if (invalid) setInvalid(false);
    onChange?.(next);
  };

  const showError = invalid && Boolean(v.message);
  const inputClass = useInputClass(compact);
  const light = useContext(LightToneContext);

  const input = (
    <input
      ref={ref}
      type={htmlInputType(field.type)}
      required={field.required && !disabled}
      placeholder={field.placeholder}
      value={value}
      disabled={disabled}
      pattern={v.pattern}
      minLength={v.minLength}
      maxLength={v.maxLength}
      min={v.min}
      max={v.max}
      inputMode={v.inputMode}
      onBlur={handleBlur}
      onChange={handleChange}
      className={v.prefix ? `${inputClass} rounded-l-none` : inputClass}
    />
  );

  return (
    <>
      {v.prefix ? (
        <div className="flex">
          <span
            className={`grid place-items-center border border-r-0 rounded-l-lg shrink-0 ${light ? "border-black/10 bg-black/5" : "border-white/10 bg-white/5"} ${
              compact ? "px-2 text-[12px] rounded-l-md" : "px-3 text-sm"
            }`}
            style={{ color: theme.accentColor }}
          >
            {v.prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}

      {showError && (
        <p className={`text-red-400 ${compact ? "text-[10px] mt-1" : "text-xs mt-2"}`}>{v.message}</p>
      )}
    </>
  );
}

/**
 * Multi-select answers ride in the same Dictionary<string,string> the API
 * already stores, joined with ", ". When `allowOther` is on, ticking the
 * "Other" option reveals a free-text box and the answer is stored as
 * "Other: whatever they typed" — still one string, still one key.
 */
function CheckboxGroup({ field, options, value, onChange, disabled, compact }) {
  const inputClass = useInputClass(compact);
  const otherLabel = field.otherLabel || "Other";
  const selected = value ? value.split(", ").filter(Boolean) : [];

  const isOther = (entry) => entry === otherLabel || entry.startsWith(`${otherLabel}: `);
  const otherEntry = selected.find(isOther);
  const otherChecked = Boolean(otherEntry);
  const otherText = otherEntry?.startsWith(`${otherLabel}: `)
    ? otherEntry.slice(otherLabel.length + 2)
    : "";

  const commit = (next) => onChange?.(next.join(", "));

  const toggle = (option) => {
    const already = field.allowOther && option === otherLabel
      ? otherChecked
      : selected.includes(option);

    if (already) {
      commit(selected.filter((s) => (field.allowOther && option === otherLabel ? !isOther(s) : s !== option)));
    } else {
      commit([...selected, option]);
    }
  };

  const setOtherText = (text) => {
    const rest = selected.filter((s) => !isOther(s));
    commit([...rest, text.trim() ? `${otherLabel}: ${text}` : otherLabel]);
  };

  const isChecked = (option) =>
    field.allowOther && option === otherLabel ? otherChecked : selected.includes(option);

  return (
    <div className={compact ? "space-y-1 pt-1" : "space-y-2 pt-1"}>
      <div className={`flex flex-wrap ${compact ? "gap-x-3 gap-y-1" : "gap-x-6 gap-y-3"}`}>
        {options.map((option) => (
          <label key={option} className={`flex items-center gap-2 ${compact ? "text-[11px]" : "text-sm"}`}>
            <input
              type="checkbox"
              value={option}
              checked={isChecked(option)}
              disabled={disabled}
              // Only the first box carries `required`, and only while nothing
              // is ticked — otherwise the browser would demand all of them.
              required={field.required && !disabled && selected.length === 0}
              onChange={() => toggle(option)}
            />
            {option}
          </label>
        ))}
      </div>

      {field.allowOther && otherChecked && (
        <input
          type="text"
          placeholder={`Please tell us — ${otherLabel.toLowerCase()}`}
          value={otherText}
          disabled={disabled}
          onChange={(e) => setOtherText(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------------- consent

/**
 * "terms" shows a scrollable policy box above the tick; "consent" is the tick
 * and its paragraph alone. Both store "Accepted" / "" so the API's existing
 * required-field check works unchanged.
 */
function ConsentBlock({ field, value, onChange, disabled, compact }) {
  const light = useContext(LightToneContext);
  const accepted = value === ACCEPTED;

  return (
    <div>
      <label
        className={`block uppercase font-bold tracking-widest opacity-70 ${
          compact ? "text-[10px] mb-1" : "text-xs mb-2"
        }`}
      >
        {field.label}
        {field.required && <span style={{ color: theme.accentColor }}> *</span>}
      </label>

      {field.type === "terms" && field.bodyText && (
        <div
          className={`overflow-y-auto whitespace-pre-line rounded-lg border mb-3 ${
            compact ? "max-h-24 p-2 text-[11px]" : "max-h-64 p-4 text-sm"
          }`}
          style={{ borderColor: theme.inputBorder, backgroundColor: light ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.02)" }}
        >
          {field.bodyText}
        </div>
      )}

      <label className={`flex items-start gap-2.5 ${compact ? "text-[11px]" : "text-sm"}`}>
        <input
          type="checkbox"
          className="mt-1 shrink-0"
          checked={accepted}
          disabled={disabled}
          required={field.required && !disabled}
          onChange={(e) => onChange?.(e.target.checked ? ACCEPTED : "")}
        />
        <span className="whitespace-pre-line leading-relaxed opacity-90">
          {field.acknowledgementText}
        </span>
      </label>

      {field.helpText && (
        <p className={`opacity-50 ${compact ? "text-[10px] mt-1" : "text-xs mt-2"}`}>{field.helpText}</p>
      )}
    </div>
  );
}

const ACCEPTED = "Accepted";

// --------------------------------------------------------------- group block

/**
 * A composite block: several inputs under one label, written to dotted answer
 * keys ("address.pincode") so the stored answers stay a flat string map.
 *
 * `behavior: "indianAddress"` additionally looks the PIN code up against the
 * free India Post API and prefills city + state. The lookup is best-effort:
 * every failure path leaves the fields hand-editable, so a third-party outage
 * can never block a submission.
 */
function GroupBlock({ field, values, onChangeNamed, disabled, compact }) {
  const children = field.children || [];
  const answer = (child) => values?.[`${field.name}.${child.name}`] ?? "";
  const write = (child, v) => onChangeNamed?.(`${field.name}.${child.name}`, v);

  const [lookupState, setLookupState] = useState("idle"); // idle | loading | found | notFound

  const pincodeChild = children.find((c) => c.role === "pincode");
  const pincodeValue = pincodeChild ? answer(pincodeChild) : "";

  useEffect(() => {
    if (field.behavior !== "indianAddress" || disabled || !pincodeChild) return;
    if (!isValidPincode(pincodeValue)) {
      setLookupState("idle");
      return;
    }

    const controller = new AbortController();
    // Debounced: the PIN is only complete on the last of six keystrokes, and
    // this keeps us to one request per code rather than six.
    const timer = setTimeout(async () => {
      setLookupState("loading");
      const result = await lookupPincode(pincodeValue, { signal: controller.signal });
      if (controller.signal.aborted) return;

      if (!result) {
        setLookupState("notFound");
        return;
      }

      const cityChild = children.find((c) => c.role === "city");
      const stateChild = children.find((c) => c.role === "state");
      if (cityChild && result.city) onChangeNamed?.(`${field.name}.${cityChild.name}`, result.city);
      if (stateChild && result.state) onChangeNamed?.(`${field.name}.${stateChild.name}`, result.state);
      setLookupState("found");
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
    // Children/handlers are stable for a given form; re-running on the PIN
    // alone is what keeps this to one lookup per code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pincodeValue, field.behavior, disabled]);

  return (
    <fieldset className="min-w-0" disabled={disabled}>
      <legend
        className={`uppercase font-bold tracking-widest opacity-70 ${
          compact ? "text-[10px] mb-1" : "text-xs mb-2"
        }`}
      >
        {field.label}
        {children.some((c) => c.required) && <span style={{ color: theme.accentColor }}> *</span>}
      </legend>

      <div className={`grid grid-cols-12 ${compact ? "gap-2" : "gap-x-5 gap-y-4"}`}>
        {children.map((child) => (
          <FieldShell key={child.id || child.name} width={child.width}>
            <InputField
              field={child}
              value={answer(child)}
              onChange={(v) => write(child, v)}
              disabled={disabled}
              compact={compact}
            />
          </FieldShell>
        ))}
      </div>

      {field.behavior === "indianAddress" && lookupState !== "idle" && (
        <p className={`mt-2 ${compact ? "text-[10px]" : "text-xs"} opacity-60`}>
          {lookupState === "loading" && "Looking up that PIN code…"}
          {lookupState === "found" && "City and state filled in from the PIN code — edit if needed."}
          {lookupState === "notFound" && "Couldn't look that PIN code up. Please fill in city and state."}
        </p>
      )}

      {field.helpText && (
        <p className={`opacity-50 ${compact ? "text-[10px] mt-1" : "text-xs mt-2"}`}>{field.helpText}</p>
      )}
    </fieldset>
  );
}

// ------------------------------------------------------------ display blocks

function DisplayBlock({ field, compact = false }) {
  const light = useContext(LightToneContext);
  if (field.type === "divider") {
    return <hr className="border-0 border-t my-2" style={{ borderColor: theme.inputBorder }} />;
  }
  if (field.type === "heading") {
    return (
      <h2
        className={`font-serif font-medium ${compact ? "text-[14px] pt-0.5" : "text-xl pt-2"}`}
        style={{ color: light ? "inherit" : theme.textColor }}
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

/** "phone" is ours; the browser wants "tel". Everything else maps 1:1. */
const htmlInputType = (type) => (type === "phone" ? "tel" : type);

const fullInputClass =
  "w-full bg-[#0F161E] border border-white/10 rounded-lg px-4 py-3.5 text-white " +
  "focus:outline-none focus:border-[#C19D60] transition-colors disabled:opacity-70";

// Same control at the admin console's scale, for the builder canvas only.
const compactInputClass =
  "w-full bg-[#0F161E] border border-white/10 rounded-md px-2.5 py-[5px] text-[12px] text-white " +
  "focus:outline-none focus:border-[#C19D60] transition-colors disabled:opacity-70";

// Light-tone twins of the two classes above, for the cream page.
const fullLightInputClass =
  "w-full bg-white border border-black/15 rounded-lg px-4 py-3.5 text-[#0b1720] placeholder:text-black/35 " +
  "focus:outline-none focus:border-[#C19D60] transition-colors disabled:opacity-70";

const compactLightInputClass =
  "w-full bg-white border border-black/15 rounded-md px-2.5 py-[5px] text-[12px] text-[#0b1720] placeholder:text-black/35 " +
  "focus:outline-none focus:border-[#C19D60] transition-colors disabled:opacity-70";
