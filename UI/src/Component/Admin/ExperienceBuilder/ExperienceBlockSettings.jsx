// src/Component/Admin/ExperienceBuilder/ExperienceBlockSettings.jsx
//
// Right pane: editor for whichever block is selected on the canvas. Each
// block's `shape` (Config/experienceBuilder.config.jsx) picks one of a small
// set of generic editors here — text / richtext / image-url-with-preview /
// video-url / date / time / number / toggle / select / repeatable rows /
// FAQ rows / nested modules — so a new block is catalogue config, never new
// editor code.

import React, { useRef, useState } from "react";
import { experienceBuilderConfig, blockMetaFor } from "../../Config/experienceBuilder.config";
import { adminUi } from "../../Config/adminUi.config";
import { useExperienceImageUpload, validateImageFile, ACCEPTED_IMAGE_TYPES } from "./imageUpload";
import { TITLE_BLOCK_ID, CART_BLOCK_ID } from "./ExperienceCanvas";

const REGISTRATION_TYPES = [
  { value: "Individual", label: "Individual only" },
  { value: "Private", label: "Private only" },
  { value: "Both", label: "Individual + Private" },
];

/** One slot per calendar day from `start` to `end`, inclusive — the seed list
 *  an Admin then edits by hand (remove a date, add extra ones for the same
 *  day). Returns [] if either date is missing/invalid or end < start. */
function dailySlotsBetween(start, end) {
  const from = new Date(`${start}T00:00:00`);
  const to = new Date(`${end}T00:00:00`);
  if (!start || !end || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return [];

  const days = [];
  for (let d = from; d <= to; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const { theme, content } = experienceBuilderConfig;
const { text, control } = adminUi;

// `block` is null both when nothing is selected AND when the selection is the
// title or the cart — two fields that live outside the block array, so they
// come through as `selectedId` sentinels instead. Title has no block object
// of its own but is still edited from here too (see ExperienceCanvas's
// inline title editor); the cart (registration type, schedule, slots,
// payment) is Admin-only and edited ONLY here — CartEditor below.
export default function ExperienceBlockSettings({
  experienceType, block, onChange, onRemove,
  selectedId, title, onTitleChange,
  startDate, endDate, bookingEndDate, onStartDateChange, onEndDateChange, onBookingEndDateChange,
  hasExperienceId,
  requiresPayment, onRequiresPaymentChange,
  price, onPriceChange,
  currency, onCurrencyChange,
  capacityTotal, onCapacityTotalChange,
  registrationType, onRegistrationTypeChange,
  slots, onSlotsChange,
  onSaveCart, cartSaving, cartError,
}) {
  if (selectedId === TITLE_BLOCK_ID) {
    return (
      <aside className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4 ${adminUi.stack.sm}`} style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}>
        <p className={text.micro} style={{ color: theme.mutedColor }}>Title</p>
        <Labelled label="Experience title">
          <input value={title} onChange={(e) => onTitleChange(e.target.value)} className={control.input} />
        </Labelled>
      </aside>
    );
  }

  if (selectedId === CART_BLOCK_ID) {
    return (
      <CartEditor
        hasExperienceId={hasExperienceId}
        requiresPayment={requiresPayment} onRequiresPaymentChange={onRequiresPaymentChange}
        price={price} onPriceChange={onPriceChange}
        currency={currency} onCurrencyChange={onCurrencyChange}
        capacityTotal={capacityTotal} onCapacityTotalChange={onCapacityTotalChange}
        registrationType={registrationType} onRegistrationTypeChange={onRegistrationTypeChange}
        slots={slots} onSlotsChange={onSlotsChange}
        startDate={startDate} onStartDateChange={onStartDateChange}
        endDate={endDate} onEndDateChange={onEndDateChange}
        bookingEndDate={bookingEndDate} onBookingEndDateChange={onBookingEndDateChange}
        onSave={onSaveCart} saving={cartSaving} error={cartError}
      />
    );
  }

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

/** Admin-only cart/payment/schedule editor — the canvas's cart widget,
 *  clicked like any other slot. Payment/capacity/registration-type/slots go
 *  through their OWN endpoint (PUT .../payment); Start/End/Booking-end date
 *  go through the regular draft save — the parent's onSave (handleSaveCart)
 *  fires both under this one button, creating the draft first if it doesn't
 *  have an id yet (`hasExperienceId` false), same request Save Draft sends. */
function CartEditor({
  hasExperienceId,
  requiresPayment, onRequiresPaymentChange,
  price, onPriceChange,
  currency, onCurrencyChange,
  capacityTotal, onCapacityTotalChange,
  registrationType, onRegistrationTypeChange,
  slots, onSlotsChange,
  startDate, onStartDateChange,
  endDate, onEndDateChange,
  bookingEndDate, onBookingEndDateChange,
  onSave, saving, error,
}) {
  const needsSlots = registrationType !== "Individual";
  const needsBookingEndDate = registrationType !== "Private";
  const canGenerate = Boolean(startDate && endDate);

  const generateFromSchedule = () => onSlotsChange(dailySlotsBetween(startDate, endDate));
  const setSlotAt = (i, value) => onSlotsChange(slots.map((s, idx) => (idx === i ? value : s)));
  const removeSlotAt = (i) => onSlotsChange(slots.filter((_, idx) => idx !== i));
  const addSlot = () => onSlotsChange([...slots, slots[slots.length - 1] || startDate || ""]);

  return (
    <aside className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4 ${adminUi.stack.sm}`} style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}>
      <p className={text.micro} style={{ color: theme.mutedColor }}>Cart & payment</p>

      <label className="flex items-center gap-1.5 cursor-pointer">
        <input type="checkbox" checked={requiresPayment} onChange={(e) => onRequiresPaymentChange(e.target.checked)} className={control.checkbox} />
        <span className={text.body}>Requires payment</span>
      </label>

      {requiresPayment && (
        <div className="flex items-center gap-1.5">
          <input value={currency} onChange={(e) => onCurrencyChange(e.target.value)} className={`${control.inputSm} w-16`} />
          <input type="number" min="1" step="0.01" placeholder="Price" value={price} onChange={(e) => onPriceChange(e.target.value)} className={control.inputSm} />
        </div>
      )}

      <Labelled label="Capacity" help="Blank = unlimited">
        <input type="number" min="0" value={capacityTotal} onChange={(e) => onCapacityTotalChange(e.target.value)} className={control.input} />
      </Labelled>

      <div>
        <label className={control.label}>Registration type</label>
        <div className={adminUi.stack.xs}>
          {REGISTRATION_TYPES.map((t) => (
            <label key={t.value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="registrationType"
                checked={registrationType === t.value}
                onChange={() => onRegistrationTypeChange(t.value)}
                className={control.checkbox}
              />
              <span className={text.body}>{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Schedule — used to live in a generic top toolbar/canvas slot; moved
          here since which date(s) apply depends entirely on Registration
          type, right above. Still saved as part of the DRAFT (not the
          payment request) under the hood, but one click on Save below
          covers both — see handleSaveCart in AdminExperienceBuilder.jsx. */}
      {needsBookingEndDate && (
        <Labelled label={content.bookingEndDateLabel} help="Deadline for Individual bookings.">
          <input type="date" value={bookingEndDate} onChange={(e) => onBookingEndDateChange(e.target.value)} className={control.input} style={{ colorScheme: "dark" }} />
        </Labelled>
      )}

      {needsSlots && (
        <>
          <div className="grid grid-cols-2 gap-1.5">
            <Labelled label={content.startDateLabel}>
              <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className={control.input} style={{ colorScheme: "dark" }} />
            </Labelled>
            <Labelled label={content.endDateLabel}>
              <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className={control.input} style={{ colorScheme: "dark" }} />
            </Labelled>
          </div>

          <div>
            <label className={control.label}>Bookable dates (Private)</label>
            {slots.length === 0 && <p className={`${control.help} mb-1`}>No dates yet — generate from Start/End date above, or add one manually.</p>}
            <div className={adminUi.stack.xs}>
              {slots.map((s, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input type="date" value={s} onChange={(e) => setSlotAt(i, e.target.value)} className={control.inputSm} style={{ colorScheme: "dark" }} />
                  <RowButton label="Remove slot" danger onClick={() => removeSlotAt(i)}>✕</RowButton>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              <AddRowButton onClick={addSlot}>+ Add slot</AddRowButton>
              {canGenerate && <AddRowButton onClick={generateFromSchedule}>↻ Regenerate from {startDate} – {endDate}</AddRowButton>}
            </div>
            {!canGenerate && <p className={control.help}>Set Start/End date above to generate one slot per day.</p>}
          </div>
        </>
      )}

      {error && <p className={text.body} style={{ color: theme.dangerColor }}>{error}</p>}
      <button type="button" onClick={onSave} disabled={saving} className={control.btnPrimary} style={{ backgroundColor: theme.accentColor, color: theme.pageBackground }}>
        {saving ? "Saving…" : hasExperienceId ? "Save cart settings" : "Save draft & cart settings"}
      </button>
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

    // richHtml (Short/Full description) is edited directly on the canvas —
    // font, style, weight, size, line height, emoji — via RichTextEditor,
    // not here. See Admin/ExperienceBuilder/RichTextEditor.jsx.
    case "richHtml":
      return <p className={control.help}>Edit this block's text directly on the canvas — click into it to see the formatting toolbar.</p>;

    case "number":
      return (
        <Labelled label="Value">
          <input type="number" value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} />
        </Labelled>
      );

    case "date":
      return (
        <Labelled label="Value">
          <input type="date" value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} style={{ colorScheme: "dark" }} />
        </Labelled>
      );

    case "time":
      return (
        <Labelled label="Value">
          <input type="time" value={block.value} onChange={(e) => patch({ value: e.target.value })} className={control.input} style={{ colorScheme: "dark" }} />
        </Labelled>
      );

    case "toggle":
      return (
        <ToggleSwitch checked={Boolean(block.value)} onChange={(v) => patch({ value: v })} />
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
      return (
        <Labelled label="Image">
          <SingleImageDropzone value={block.value} onUploaded={(url) => patch({ value: url })} onRemove={() => patch({ value: "" })} />
        </Labelled>
      );

    case "videoUrl":
      return (
        <Labelled label="Video URL">
          <input value={block.value} onChange={(e) => patch({ value: e.target.value })} placeholder="https://…" className={control.input} />
        </Labelled>
      );

    case "gallery":
      return <GalleryDropzone items={block.items} onChange={(items) => patch({ items })} />;

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

/** Pill switch for `shape: "toggle"` blocks (Kids Friendly, Accessibility,
 *  Accommodation, Food & Refreshments, Certificate Provided, ...) — a track
 *  + sliding knob instead of a plain checkbox, with the Yes/No state spelled
 *  out beside it so it reads the same at a glance either way. */
function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 cursor-pointer"
    >
      <span
        className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors"
        style={{ backgroundColor: checked ? theme.accentColor : theme.borderColor }}
      >
        <span
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(18px)" : "translateX(2px)" }}
        />
      </span>
      <span className={text.body} style={{ color: checked ? theme.accentColor : theme.mutedColor }}>
        {checked ? "Yes" : "No"}
      </span>
    </button>
  );
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

/** Simple string rows — Highlights / Rules / Prohibited / What to Bring / etc. */
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

/** Shared drag-and-drop/click-to-browse file surface. Fires onFiles(FileList)
 *  — validation + the actual upload call stay with the caller (single image
 *  vs. gallery upload different numbers of files and where the result goes). */
function DropSurface({ multiple, uploading, error, onFiles, label, height = "h-24" }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return;
    onFiles(fileList);
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed grid place-items-center text-center px-3 cursor-pointer transition-colors ${height}`}
        style={{
          borderColor: dragOver ? theme.accentColor : theme.borderColor,
          backgroundColor: dragOver ? "rgba(193, 157, 96, 0.08)" : "transparent",
        }}
      >
        <p className={text.body} style={{ color: theme.mutedColor }}>
          {uploading ? "Uploading…" : label || (multiple ? "Drag & drop images here, or click to browse" : "Drag & drop an image here, or click to browse")}
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = ""; // lets picking the same file twice re-fire onChange
        }}
      />
      {error && <p className={control.help} style={{ color: theme.dangerColor }}>{error}</p>}
    </div>
  );
}

/** Hero-image-style single upload: drop/browse a file, it's pushed to Sanity's
 *  asset store via the API, and the returned public CDN url becomes the
 *  block's value — same storage shape as before, just no more hand-typed URL. */
function SingleImageDropzone({ value, onUploaded, onRemove }) {
  const { upload, remove: deleteFromSanity } = useExperienceImageUpload();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (fileList) => {
    const file = fileList[0];
    if (!file) return;
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const result = await upload(file);
      const previous = value;
      onUploaded(result.url);
      deleteFromSanity(previous);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    deleteFromSanity(value);
    onRemove();
  };

  return (
    <div className={adminUi.stack.xs}>
      {value && (
        <div className="relative">
          <img src={value} alt="" className="max-h-32 w-full object-cover rounded border" style={{ borderColor: theme.borderColor }} />
          <button type="button" title="Remove" aria-label="Remove" onClick={handleRemove} className={control.iconBtn} style={{ position: "absolute", top: 4, right: 4, color: theme.dangerColor, backgroundColor: theme.panelBackground }}>✕</button>
        </div>
      )}
      <DropSurface multiple={false} uploading={uploading} error={error} onFiles={handleFiles} label={value ? "Drop a new image to replace it" : undefined} />
    </div>
  );
}

/** Gallery-style multi upload: drop/browse one or more files at once, each
 *  uploaded to Sanity the same way as the hero image; resulting urls are
 *  appended to `items` (still a plain array of url strings). */
function GalleryDropzone({ items, onChange }) {
  const { upload, remove: deleteFromSanity } = useExperienceImageUpload();
  const list = items || [];
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList);
    const validationError = files.map(validateImageFile).find(Boolean);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setUploading(true);
    try {
      const results = await Promise.all(files.map((file) => upload(file)));
      onChange([...list, ...results.map((r) => r.url)]);
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // Best-effort, same as the hero dropzone — never blocks removing the item
  // from the gallery on the network call succeeding.
  const removeAt = (i) => {
    const removed = list[i];
    onChange(list.filter((_, idx) => idx !== i));
    deleteFromSanity(removed);
  };

  return (
    <div>
      <label className={control.label}>Gallery images</label>
      {list.length > 0 && (
        <div className="grid grid-cols-3 gap-1.5 mb-1.5">
          {list.map((src, i) => (
            <div key={i} className="relative">
              <img src={src} alt="" className="w-full h-16 object-cover rounded border" style={{ borderColor: theme.borderColor }} />
              <button type="button" title="Remove" aria-label="Remove" onClick={() => removeAt(i)} className={control.iconBtn} style={{ position: "absolute", top: 2, right: 2, color: theme.dangerColor, backgroundColor: theme.panelBackground }}>✕</button>
            </div>
          ))}
        </div>
      )}
      <DropSurface multiple uploading={uploading} error={error} onFiles={handleFiles} height="h-20" />
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
