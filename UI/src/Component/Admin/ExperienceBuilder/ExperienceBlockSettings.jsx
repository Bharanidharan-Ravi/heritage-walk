// src/Component/Admin/ExperienceBuilder/ExperienceBlockSettings.jsx
//
// Right pane: editor for whichever block is selected on the canvas. Each
// block's `shape` (Config/experienceBuilder.config.jsx) picks one of a small
// set of generic editors here — text / richtext / image-url-with-preview /
// video-url / date / time / number / toggle / select / repeatable rows /
// FAQ rows / nested modules — so a new block is catalogue config, never new
// editor code.

import React from "react";
import { experienceBuilderConfig, blockMetaFor } from "../../Config/experienceBuilder.config";
import { adminUi } from "../../Config/adminUi.config";

const { theme } = experienceBuilderConfig;
const { text, control } = adminUi;

export default function ExperienceBlockSettings({ experienceType, block, onChange, onRemove }) {
  if (!block) {
    return (
      <aside className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4`} style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}>
        <p className={`${text.micro} mb-1.5`} style={{ color: theme.mutedColor }}>Block settings</p>
        <p className={text.body} style={{ color: theme.mutedColor }}>Select a block on the canvas to edit its content.</p>
      </aside>
    );
  }

  const meta = blockMetaFor(experienceType, block);
  const patch = (p) => onChange(block.id, p);

  return (
    <aside className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4 ${adminUi.stack.sm}`} style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}>
      <div className="flex items-center justify-between">
        <p className={text.micro} style={{ color: theme.mutedColor }}>{meta.paletteLabel || block.shape}</p>
        <button type="button" onClick={() => onRemove(block.id)} className={control.btnLink} style={{ color: theme.dangerColor }}>Delete</button>
      </div>

      <Labelled label="Label">
        <input value={block.label} onChange={(e) => patch({ label: e.target.value })} className={control.input} />
      </Labelled>

      <BlockValueEditor block={block} patch={patch} />
    </aside>
  );
}

function BlockValueEditor({ block, patch }) {
  switch (block.shape) {
    case "text":
      return (
        <Labelled label="Value">
          <input value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} />
        </Labelled>
      );

    case "richtext":
      return (
        <Labelled label="Value">
          <textarea rows={5} value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} />
        </Labelled>
      );

    case "number":
      return (
        <Labelled label="Value">
          <input type="number" value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} />
        </Labelled>
      );

    case "date":
      return (
        <Labelled label="Value">
          <input type="date" value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} />
        </Labelled>
      );

    case "time":
      return (
        <Labelled label="Value">
          <input type="time" value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} />
        </Labelled>
      );

    case "toggle":
      return (
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={Boolean(block.value)} onChange={(e) => patch({ value: e.target.checked })} className={control.checkbox} />
          <span className={text.body}>{block.value ? "Yes" : "No"}</span>
        </label>
      );

    case "select":
      return (
        <Labelled label="Value">
          <select value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input}>
            <option value="">— Select —</option>
            {(block.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Labelled>
      );

    case "imageUrl":
    case "videoUrl":
      return (
        <Labelled label={block.shape === "imageUrl" ? "Image URL" : "Video URL"} help="Paste a URL for now — Sanity asset upload is a follow-up (TODO(experiences)).">
          <input value={block.value} onChange={(e) => patch({ value: e.target.value })} placeholder="https://…" className={control.input} />
          {block.shape === "imageUrl" && block.value && (
            <img src={block.value} alt="" className="mt-1.5 max-h-24 rounded border" style={{ borderColor: theme.borderColor }} />
          )}
        </Labelled>
      );

    case "gallery":
      return <StringListEditor label="Image URLs" placeholder="https://…" items={block.items} onChange={(items) => patch({ items })} />;

    case "repeatableList":
      return <StringListEditor label="Items" placeholder="Add an item…" items={block.items} onChange={(items) => patch({ items })} />;

    case "faqList":
      return <FaqListEditor items={block.items} onChange={(items) => patch({ items })} />;

    case "modules":
      return <ModulesEditor items={block.items} onChange={(items) => patch({ items })} />;

    default:
      return null;
  }
}

function Labelled({ label, help, children }) {
  return (
    <div>
      <label className={control.label}>{label}</label>
      {children}
      {help && <p className={control.help}>{help}</p>}
    </div>
  );
}

function RowButton({ children, label, onClick, danger }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={control.iconBtn} style={{ color: danger ? theme.dangerColor : theme.mutedColor }}>
      {children}
    </button>
  );
}

function AddRowButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={control.btnGhost} style={{ borderColor: theme.borderColor, color: theme.accentColor }}>
      {children}
    </button>
  );
}

/** Simple string rows — Highlights / Rules / Prohibited / What to Bring / Gallery URLs / etc. */
function StringListEditor({ label, placeholder, items, onChange }) {
  const list = items || [];
  const setAt = (i, value) => onChange(list.map((v, idx) => (idx === i ? value : v)));
  const removeAt = (i) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, ""]);

  return (
    <div>
      <label className={control.label}>{label}</label>
      <div className={adminUi.stack.xs}>
        {list.map((value, i) => (
          <div key={i} className="flex items-center gap-1">
            <input value={value} onChange={(e) => setAt(i, e.target.value)} placeholder={placeholder} className={control.inputSm} />
            <RowButton label="Remove" danger onClick={() => removeAt(i)}>✕</RowButton>
          </div>
        ))}
      </div>
      <AddRowButton onClick={add}>+ Add</AddRowButton>
    </div>
  );
}

/** Question + answer rows. */
function FaqListEditor({ items, onChange }) {
  const list = items || [];
  const setAt = (i, patch) => onChange(list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const removeAt = (i) => onChange(list.filter((_, idx) => idx !== i));
  const add = () => onChange([...list, { question: "", answer: "" }]);

  return (
    <div>
      <label className={control.label}>Questions</label>
      <div className={adminUi.stack.sm}>
        {list.map((it, i) => (
          <div key={i} className="rounded border p-1.5" style={{ borderColor: theme.borderColor }}>
            <div className="flex items-center gap-1 mb-1">
              <input value={it.question} onChange={(e) => setAt(i, { question: e.target.value })} placeholder="Question" className={control.inputSm} />
              <RowButton label="Remove" danger onClick={() => removeAt(i)}>✕</RowButton>
            </div>
            <textarea rows={2} value={it.answer} onChange={(e) => setAt(i, { answer: e.target.value })} placeholder="Answer" className={control.inputSm} />
          </div>
        ))}
      </div>
      <AddRowButton onClick={add}>+ Add question</AddRowButton>
    </div>
  );
}

/** Nested Module -> Topic rows, for Course Modules / Seminar Table of Contents / Walk Itinerary. */
function ModulesEditor({ items, onChange }) {
  const modules = items || [];
  const setModule = (i, patch) => onChange(modules.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const removeModule = (i) => onChange(modules.filter((_, idx) => idx !== i));
  const addModule = () => onChange([...modules, { title: "", topics: [] }]);

  const setTopic = (mi, ti, value) =>
    setModule(mi, { topics: modules[mi].topics.map((t, idx) => (idx === ti ? value : t)) });
  const removeTopic = (mi, ti) =>
    setModule(mi, { topics: modules[mi].topics.filter((_, idx) => idx !== ti) });
  const addTopic = (mi) => setModule(mi, { topics: [...(modules[mi].topics || []), ""] });

  return (
    <div>
      <label className={control.label}>Modules</label>
      <div className={adminUi.stack.sm}>
        {modules.map((m, mi) => (
          <div key={mi} className="rounded border p-1.5" style={{ borderColor: theme.borderColor }}>
            <div className="flex items-center gap-1 mb-1">
              <input value={m.title} onChange={(e) => setModule(mi, { title: e.target.value })} placeholder={`Module ${mi + 1} title`} className={control.inputSm} />
              <RowButton label="Remove module" danger onClick={() => removeModule(mi)}>✕</RowButton>
            </div>
            <div className="space-y-1 pl-2">
              {(m.topics || []).map((t, ti) => (
                <div key={ti} className="flex items-center gap-1">
                  <input value={t} onChange={(e) => setTopic(mi, ti, e.target.value)} placeholder="Topic" className={control.inputSm} />
                  <RowButton label="Remove topic" danger onClick={() => removeTopic(mi, ti)}>✕</RowButton>
                </div>
              ))}
              <AddRowButton onClick={() => addTopic(mi)}>+ Add topic</AddRowButton>
            </div>
          </div>
        ))}
      </div>
      <AddRowButton onClick={addModule}>+ Add module</AddRowButton>
    </div>
  );
}
