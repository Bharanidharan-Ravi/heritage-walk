// src/Component/Admin/FormBuilder/FieldSettings.jsx
//
// Right pane: everything about the one selected block. Kept separate from the
// canvas so the canvas can stay a pure layout surface.

import React, { useState } from "react";
import { formBuilderConfig, fieldTypeCatalog, isDisplayOnly, hasOptions } from "../../Config/formBuilder.config";
import { adminUi } from "../../Config/adminUi.config";

const { theme } = formBuilderConfig;
const { text, control } = adminUi;

export default function FieldSettings({ field, onChange, onRemove }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  if (!field) {
    return (
      <aside
        className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4`}
        style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}
      >
        <p className={`${text.micro} mb-1.5`} style={{ color: theme.mutedColor }}>
          Block settings
        </p>
        <p className={text.body} style={{ color: theme.mutedColor }}>
          Select a block on the canvas to edit its label, help text and choices.
        </p>
      </aside>
    );
  }

  const meta = fieldTypeCatalog[field.type] || {};
  const display = isDisplayOnly(field.type);
  const patch = (p) => onChange(field.id, p);

  return (
    <aside
      className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4 ${adminUi.stack.sm}`}
      style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}
    >
      <div className="flex items-center justify-between">
        <p className={text.micro} style={{ color: theme.mutedColor }}>
          {meta.label || field.type}
        </p>
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className={control.btnLink}
          style={{ color: theme.dangerColor }}
        >
          Delete
        </button>
      </div>

      {field.type === "divider" ? (
        <p className={text.body} style={{ color: theme.mutedColor }}>
          A divider has nothing to configure — drag it where you want the break.
        </p>
      ) : (
        <>
          <Labelled label={field.type === "paragraph" ? "Text" : "Label"}>
            {field.type === "paragraph" ? (
              <textarea
                rows={3}
                value={field.label}
                onChange={(e) => patch({ label: e.target.value })}
                className={inputClass}
              />
            ) : (
              <input
                value={field.label}
                onChange={(e) => patch({ label: e.target.value })}
                className={inputClass}
              />
            )}
          </Labelled>

          {!display && (
            <>
              <Labelled label="Placeholder" hint="Optional">
                <input
                  value={field.placeholder}
                  onChange={(e) => patch({ placeholder: e.target.value })}
                  className={inputClass}
                />
              </Labelled>

              <Labelled label="Help text" hint="Shown under the input">
                <input
                  value={field.helpText}
                  onChange={(e) => patch({ helpText: e.target.value })}
                  className={inputClass}
                />
              </Labelled>

              <label className={`flex items-center gap-1.5 ${text.body}`}>
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => patch({ required: e.target.checked })}
                  className={control.checkbox}
                />
                Required
              </label>
            </>
          )}

          {hasOptions(field.type) && (
            <OptionsEditor options={field.options} onChange={(options) => patch({ options })} />
          )}
        </>
      )}

      <Labelled label="Width">
        <div className="flex flex-wrap gap-1">
          {formBuilderConfig.widths.map((w) => (
            <button
              key={w.value}
              type="button"
              title={w.hint}
              onClick={() => patch({ width: w.value })}
              className={control.btnGhost}
              style={{
                borderColor: field.width === w.value ? theme.strongBorderColor : theme.borderColor,
                color: field.width === w.value ? theme.accentColor : theme.mutedColor,
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </Labelled>

      {!display && (
        <div className="pt-1.5 border-t" style={{ borderColor: theme.borderColor }}>
          <button
            type="button"
            onClick={() => setShowAdvanced((s) => !s)}
            className={control.btnLink}
            style={{ color: theme.accentColor }}
          >
            {showAdvanced ? "Hide" : "Show"} advanced
          </button>

          {showAdvanced && (
            <div className="mt-1.5">
              <Labelled label="Field key" hint="Column name in exports — auto-derived from the label">
                <input
                  value={field.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  className={inputClass}
                />
              </Labelled>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function OptionsEditor({ options, onChange }) {
  const update = (i, value) => onChange(options.map((o, idx) => (idx === i ? value : o)));
  const remove = (i) => onChange(options.filter((_, idx) => idx !== i));
  const add = () => onChange([...options, `Option ${options.length + 1}`]);

  return (
    <Labelled label="Choices">
      <div className={adminUi.stack.xs}>
        {options.map((option, i) => (
          <div key={i} className="flex gap-1">
            <input value={option} onChange={(e) => update(i, e.target.value)} className={inputClass} />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={options.length === 1}
              className="px-1 text-[11px] disabled:opacity-30"
              style={{ color: theme.dangerColor }}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className={control.btnLink}
          style={{ color: theme.accentColor }}
        >
          + Add choice
        </button>
      </div>
    </Labelled>
  );
}

function Labelled({ label, hint, children }) {
  return (
    <div>
      <p className={`${text.micro} font-normal mb-1`} style={{ color: theme.mutedColor }}>
        {label}
        {hint && <span className="normal-case tracking-normal opacity-70"> — {hint}</span>}
      </p>
      {children}
    </div>
  );
}

// One shared input look for the whole panel, from the admin scale.
const inputClass = control.input;
