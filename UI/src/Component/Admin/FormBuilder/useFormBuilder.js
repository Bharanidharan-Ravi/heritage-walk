// src/Component/Admin/FormBuilder/useFormBuilder.js
//
// All the state the form builder needs, kept out of the presentational pieces
// (palette / canvas / settings) so those stay dumb and easy to restyle.
//
// A field is:
//   { id, name, label, type, required, placeholder, helpText, options[], width }
//
// `id` is builder-local (React key + drag identity). `name` is the key the
// answer is stored under server-side, derived from the label so the form author
// never has to think about it — but still editable under "Advanced".

import { useCallback, useMemo, useState } from "react";
import { fieldTypeCatalog, isDisplayOnly, hasOptions } from "../../Config/formBuilder.config";

let idCounter = 0;
const nextId = () => `f${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** "Full Name" -> "fullName". Falls back to a stable generated key. */
export function toFieldName(label) {
  const words = String(label || "")
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return "";

  return words
    .map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()))
    .join("");
}

function uniqueName(base, fields, ignoreId) {
  const taken = new Set(fields.filter((f) => f.id !== ignoreId).map((f) => f.name));
  if (!base) base = "field";
  if (!taken.has(base)) return base;

  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

export function createField(type, existingFields = []) {
  const meta = fieldTypeCatalog[type] || {};
  const label = meta.defaultLabel || "Untitled";

  return {
    id: nextId(),
    name: isDisplayOnly(type) ? "" : uniqueName(toFieldName(label), existingFields),
    label,
    type,
    required: false,
    placeholder: "",
    helpText: "",
    options: hasOptions(type) ? ["Option 1", "Option 2"] : [],
    width: type === "textarea" || isDisplayOnly(type) ? 12 : 6,
  };
}

export function useFormBuilder() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [price, setPrice] = useState("");
  const [currency] = useState("INR");
  const [fields, setFields] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  /** Insert a brand-new field of `type`, optionally at a position. */
  const addField = useCallback((type, index) => {
    setFields((prev) => {
      const field = createField(type, prev);
      const at = index === undefined || index === null ? prev.length : index;
      const next = [...prev];
      next.splice(at, 0, field);
      setSelectedId(field.id);
      return next;
    });
  }, []);

  const updateField = useCallback((id, patch) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const merged = { ...f, ...patch };

        // Renaming the label re-derives the storage key, unless the author has
        // taken manual control of it by editing the key directly.
        if (patch.label !== undefined && patch.name === undefined && !f.nameLockedByUser && !isDisplayOnly(f.type)) {
          merged.name = uniqueName(toFieldName(patch.label), prev, f.id);
        }
        if (patch.name !== undefined) {
          merged.nameLockedByUser = true;
          merged.name = uniqueName(patch.name, prev, f.id);
        }
        return merged;
      })
    );
  }, []);

  const removeField = useCallback((id) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const duplicateField = useCallback((id) => {
    setFields((prev) => {
      const index = prev.findIndex((f) => f.id === id);
      if (index === -1) return prev;

      const source = prev[index];
      const copy = {
        ...source,
        id: nextId(),
        options: [...source.options],
        name: isDisplayOnly(source.type) ? "" : uniqueName(source.name, prev),
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      setSelectedId(copy.id);
      return next;
    });
  }, []);

  /**
   * Move the field at `from` so it sits at `to` in the final array. `to` is an
   * insertion slot (0..length), which is what the canvas's drop indicator
   * points at.
   */
  const moveField = useCallback((from, to) => {
    setFields((prev) => {
      if (from < 0 || from >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      // Removing the item first shifts every later slot down by one.
      const target = Math.max(0, Math.min(next.length, to > from ? to - 1 : to));
      next.splice(target, 0, moved);
      return next;
    });
  }, []);

  /** Nudge a field one slot earlier/later — the keyboard-friendly path. */
  const nudgeField = useCallback((id, delta) => {
    setFields((prev) => {
      const index = prev.findIndex((f) => f.id === id);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const selectedField = useMemo(
    () => fields.find((f) => f.id === selectedId) || null,
    [fields, selectedId]
  );

  /** What the form looks like to FormRenderer — same shape the API returns. */
  const previewForm = useMemo(
    () => ({
      title: title || "Untitled form",
      description,
      fields,
      requiresPayment,
      price: Number(price) || 0,
      currency,
    }),
    [title, description, fields, requiresPayment, price, currency]
  );

  /** Blocking problems, surfaced before the publish request is attempted. */
  const validationErrors = useMemo(() => {
    const errors = [];
    if (!title.trim()) errors.push("Give the form a title.");
    if (fields.length === 0) errors.push("Add at least one field.");
    if (requiresPayment && !(Number(price) > 0)) errors.push("A paid form needs a price above zero.");

    fields.forEach((f, i) => {
      if (!isDisplayOnly(f.type) && !f.label.trim()) {
        errors.push(`Field ${i + 1} needs a label.`);
      }
      if (hasOptions(f.type) && f.options.filter((o) => o.trim()).length === 0) {
        errors.push(`"${f.label || `Field ${i + 1}`}" needs at least one choice.`);
      }
    });

    return errors;
  }, [title, fields, requiresPayment, price]);

  /** Strips builder-only bookkeeping before POST /api/forms. */
  const toCreateRequest = useCallback(
    () => ({
      title: title.trim(),
      description: description.trim(),
      requiresPayment,
      price: requiresPayment ? Number(price) : 0,
      currency,
      fields: fields.map((f) => ({
        id: f.id,
        name: f.name,
        label: f.label,
        type: f.type,
        required: isDisplayOnly(f.type) ? false : f.required,
        placeholder: f.placeholder,
        helpText: f.helpText,
        options: hasOptions(f.type) ? f.options.filter((o) => o.trim()) : [],
        width: f.width,
      })),
    }),
    [title, description, requiresPayment, price, currency, fields]
  );

  const reset = useCallback(() => {
    setTitle("");
    setDescription("");
    setRequiresPayment(false);
    setPrice("");
    setFields([]);
    setSelectedId(null);
  }, []);

  return {
    title, setTitle,
    description, setDescription,
    requiresPayment, setRequiresPayment,
    price, setPrice,
    currency,
    fields,
    selectedId, setSelectedId,
    selectedField,
    addField, updateField, removeField, duplicateField, moveField, nudgeField,
    previewForm,
    validationErrors,
    toCreateRequest,
    reset,
  };
}
