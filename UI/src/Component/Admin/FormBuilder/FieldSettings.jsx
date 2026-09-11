// src/Component/Admin/FormBuilder/FieldSettings.jsx
//
// Right pane: everything about the one selected block. Kept separate from the
// canvas so the canvas can stay a pure layout surface.
//
// A predefined block arrives fully configured, so this panel is where the
// author *narrows* it — every preset (label, choices, validation rule, the
// sub-fields of an address) is editable here, and edits land on this form's own
// copy of the block, never on the catalogue definition.

import React, { useState } from "react";
import {
  formBuilderConfig,
  blockMetaFor,
  isDisplayOnly,
  hasOptions,
  isConsent,
  isGroup,
} from "../../Config/formBuilder.config";
import { NAMED_OPTION_LISTS } from "../../Config/indiaGeo.config";
import { adminUi } from "../../Config/adminUi.config";

const { theme } = formBuilderConfig;
const { text, control } = adminUi;

export default function FieldSettings({ field, onChange, onChangeChild, onRemove }) {
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

  const meta = blockMetaFor(field);
  const display = isDisplayOnly(field.type);
  const consent = isConsent(field.type);
  const group = isGroup(field.type);
  const patch = (p) => onChange(field.id, p);
  const patchValidation = (p) => patch({ validation: { ...(field.validation || {}), ...p } });

  return (
    <aside
      className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4 ${adminUi.stack.sm}`}
      style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}
    >
      <div className="flex items-center justify-between">
        <p className={text.micro} style={{ color: theme.mutedColor }}>
          {meta.paletteLabel || field.type}
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
                className={control.input}
              />
            ) : (
              <input
                value={field.label}
                onChange={(e) => patch({ label: e.target.value })}
                className={control.input}
              />
            )}
          </Labelled>

          {consent && (
            <>
              {field.type === "terms" && (
                <Labelled label="Policy text" hint="Shown in a scrollable box">
                  <textarea
                    rows={6}
                    value={field.bodyText || ""}
                    onChange={(e) => patch({ bodyText: e.target.value })}
                    className={control.input}
                  />
                </Labelled>
              )}
              <Labelled label="Agreement text" hint="Sits beside the tick box">
                <textarea
                  rows={4}
                  value={field.acknowledgementText || ""}
                  onChange={(e) => patch({ acknowledgementText: e.target.value })}
                  className={control.input}
                />
              </Labelled>
            </>
          )}

          {!display && !consent && !group && (
            <Labelled label="Placeholder" hint="Optional">
              <input
                value={field.placeholder}
                onChange={(e) => patch({ placeholder: e.target.value })}
                className={control.input}
              />
            </Labelled>
          )}

          {!display && (
            <>
              <Labelled label="Help text" hint="Shown under the input">
                <input
                  value={field.helpText}
                  onChange={(e) => patch({ helpText: e.target.value })}
                  className={control.input}
                />
              </Labelled>

              {!group && (
                <label className={`flex items-center gap-1.5 ${text.body}`}>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => patch({ required: e.target.checked })}
                    className={control.checkbox}
                  />
                  Required
                </label>
              )}
            </>
          )}

          {hasOptions(field.type) && (
            <ChoicesSection field={field} patch={patch} />
          )}

          {field.type === "checkbox" && (
            <label className={`flex items-center gap-1.5 ${text.body}`}>
              <input
                type="checkbox"
                checked={Boolean(field.allowOther)}
                onChange={(e) => patch({ allowOther: e.target.checked })}
                className={control.checkbox}
              />
              “{field.otherLabel || "Other"}” opens a text box
            </label>
          )}

          {group && (
            <ChildrenEditor field={field} onChangeChild={onChangeChild} />
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
            <div className={`mt-1.5 ${adminUi.stack.sm}`}>
              <Labelled label="Field key" hint="Column name in exports — auto-derived from the label">
                <input
                  value={field.name}
                  onChange={(e) => patch({ name: e.target.value })}
                  className={control.input}
                />
              </Labelled>

              {!consent && !group && (
                <ValidationEditor field={field} patchValidation={patchValidation} onClear={() => patch({ validation: null })} />
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

/**
 * Choices come either from a named bundled list (`optionsFrom`, e.g. the 36
 * Indian states) or from a literal array. Switching to a custom list copies the
 * named one in first, so the author edits from where they were rather than from
 * an empty box.
 */
function ChoicesSection({ field, patch }) {
  if (field.optionsFrom) {
    const named = NAMED_OPTION_LISTS[field.optionsFrom] || [];
    return (
      <Labelled label="Choices" hint={`${named.length} from the built-in list`}>
        <p className={`${text.body} mb-1`} style={{ color: theme.mutedColor }}>
          Using the built-in “{field.optionsFrom}” list.
        </p>
        <button
          type="button"
          onClick={() => patch({ optionsFrom: null, options: [...named] })}
          className={control.btnLink}
          style={{ color: theme.accentColor }}
        >
          Use a custom list instead
        </button>
      </Labelled>
    );
  }

  return <OptionsEditor options={field.options || []} onChange={(options) => patch({ options })} />;
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
            <input value={option} onChange={(e) => update(i, e.target.value)} className={control.input} />
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

/** The sub-fields of a composite block (currently only Address). */
function ChildrenEditor({ field, onChangeChild }) {
  return (
    <Labelled label="Sub-fields" hint="Each is stored as its own answer">
      <div className={adminUi.stack.xs}>
        {(field.children || []).map((child) => (
          <div
            key={child.id}
            className="rounded-md border p-1.5"
            style={{ borderColor: theme.borderColor, backgroundColor: theme.cardBackground }}
          >
            <input
              value={child.label}
              onChange={(e) => onChangeChild(field.id, child.id, { label: e.target.value })}
              className={control.inputSm}
            />
            <div className="flex items-center justify-between gap-1 mt-1">
              <label className={`flex items-center gap-1 ${text.body}`} style={{ color: theme.mutedColor }}>
                <input
                  type="checkbox"
                  checked={Boolean(child.required)}
                  onChange={(e) => onChangeChild(field.id, child.id, { required: e.target.checked })}
                  className={control.checkbox}
                />
                Required
              </label>
              <div className="flex gap-0.5">
                {formBuilderConfig.widths.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    title={w.hint}
                    onClick={() => onChangeChild(field.id, child.id, { width: w.value })}
                    className="px-1 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest"
                    style={{
                      backgroundColor: child.width === w.value ? "rgba(193,157,96,0.18)" : "transparent",
                      color: child.width === w.value ? theme.accentColor : theme.mutedColor,
                    }}
                  >
                    {w.label[0]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Labelled>
  );
}

/**
 * The rules a predefined block arrives with — an author can loosen the phone
 * pattern, change the message, or drop validation entirely.
 */
function ValidationEditor({ field, patchValidation, onClear }) {
  const v = field.validation || {};
  const numeric = field.type === "number";

  return (
    <div className={adminUi.stack.xs}>
      <div className="flex items-center justify-between">
        <p className={`${text.micro} font-normal`} style={{ color: theme.mutedColor }}>
          Validation
        </p>
        {field.validation && (
          <button type="button" onClick={onClear} className={control.btnLink} style={{ color: theme.dangerColor }}>
            Clear
          </button>
        )}
      </div>

      {numeric ? (
        <div className="flex gap-1">
          <input
            type="number"
            placeholder="Min"
            value={v.min ?? ""}
            onChange={(e) => patchValidation({ min: e.target.value === "" ? undefined : Number(e.target.value) })}
            className={control.inputSm}
          />
          <input
            type="number"
            placeholder="Max"
            value={v.max ?? ""}
            onChange={(e) => patchValidation({ max: e.target.value === "" ? undefined : Number(e.target.value) })}
            className={control.inputSm}
          />
        </div>
      ) : (
        <input
          placeholder="Pattern (regular expression)"
          value={v.pattern ?? ""}
          onChange={(e) => patchValidation({ pattern: e.target.value || undefined })}
          className={control.inputSm}
        />
      )}

      <input
        placeholder="Message when it doesn't match"
        value={v.message ?? ""}
        onChange={(e) => patchValidation({ message: e.target.value || undefined })}
        className={control.inputSm}
      />

      <div className="flex gap-1">
        <input
          placeholder="Prefix"
          value={v.prefix ?? ""}
          onChange={(e) => patchValidation({ prefix: e.target.value || undefined })}
          className={control.inputSm}
        />
        <input
          type="number"
          placeholder="Max length"
          value={v.maxLength ?? ""}
          onChange={(e) =>
            patchValidation({ maxLength: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          className={control.inputSm}
        />
      </div>

      <label className={`flex items-center gap-1.5 ${text.body}`} style={{ color: theme.mutedColor }}>
        <input
          type="checkbox"
          checked={Boolean(v.digitsOnly)}
          onChange={(e) => patchValidation({ digitsOnly: e.target.checked || undefined })}
          className={control.checkbox}
        />
        Digits only
      </label>
    </div>
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
