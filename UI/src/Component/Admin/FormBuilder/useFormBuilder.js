// src/Component/Admin/FormBuilder/useFormBuilder.js
//
// All the state the form builder needs, kept out of the presentational pieces
// (palette / canvas / settings) so those stay dumb and easy to restyle.
//
// A field is:
//   { id, blockKey, name, label, type, required, placeholder, helpText,
//     options[], width,
//     role?, validation?, children?, behavior?, allowOther?, otherLabel?,
//     optionsFrom?, bodyText?, acknowledgementText? }
//
// `id` is builder-local (React key + drag identity). `name` is the key the
// answer is stored under server-side, derived from the label so the form author
// never has to think about it — but still editable under "Advanced".
//
// Fields are created by CLONING a block template out of the catalogue
// (Config/formBuilder.config.jsx). The clone is deep, so editing a dropped
// block never reaches back into the master definition — that is what makes
// "edit after drop affects only this form" true.

import { useCallback, useMemo, useState } from "react";
import {
  blockByKey,
  isDisplayOnly,
  hasOptions,
  isConsent,
  isGroup,
} from "../../Config/formBuilder.config";
import { DEFAULT_FORM_BLOCKS } from "../../Config/predefinedFields.config";

let idCounter = 0;
const nextId = () => `f${Date.now().toString(36)}${(idCounter++).toString(36)}`;

// Templates are pure JSON data, so a round-trip is a complete deep copy and
// avoids structuredClone's older-browser gaps.
const deepClone = (value) => JSON.parse(JSON.stringify(value ?? null));

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

/** Sensible span when a template doesn't state one — full width by default. */
const defaultWidth = () => 12;

/**
 * Build a field instance from a catalogue block key.
 *
 * Accepts a bare type name too ("text", "select", …) so older call sites and
 * the drag payload can both work — generic blocks are keyed by their type.
 */
export function createField(blockKey, existingFields = []) {
  const block = blockByKey[blockKey];
  const template = deepClone(block?.field) || { type: blockKey, label: "Untitled" };
  const type = template.type || "text";
  const label = template.label ?? "Untitled";

  const baseName = template.name || toFieldName(label);

  return {
    // Template first, so it can supply role/validation/children/etc., then the
    // fields every instance must have regardless of what the template omitted.
    ...template,
    id: nextId(),
    blockKey: block?.key,
    type,
    label,
    name: isDisplayOnly(type) ? "" : uniqueName(baseName, existingFields),
    required: template.required ?? false,
    placeholder: template.placeholder ?? "",
    helpText: template.helpText ?? "",
    options: template.options ?? (hasOptions(type) ? ["Option 1", "Option 2"] : []),
    width: template.width ?? defaultWidth(type),
    // Sub-fields need ids of their own to act as React keys and edit targets.
    children: template.children?.map((child) => ({
      ...child,
      id: nextId(),
      required: child.required ?? false,
      placeholder: child.placeholder ?? "",
      helpText: child.helpText ?? "",
      options: child.options ?? [],
      width: child.width ?? 6,
    })),
  };
}

/** The answer key a group's sub-field is submitted under: "address.pincode". */
export const childAnswerName = (field, child) => `${field.name}.${child.name}`;

/**
 * Build a fresh field array from catalogue block keys, expanding any
 * paired blocks (Name -> First Name + Last Name) the same way `addField`
 * does for a drag-and-drop — used to seed the canvas on "new form" / reset.
 */
function buildDefaultFields(blockKeys) {
  return blockKeys.reduce((acc, key) => {
    const field = createField(key, acc);
    const pairedTemplate = blockByKey[key]?.pairedField;
    if (!pairedTemplate) return [...acc, field];

    const pairId = nextId();
    field.pairId = pairId;
    const pairedField = {
      ...deepClone(pairedTemplate),
      id: nextId(),
      blockKey: key,
      pairId,
      name: uniqueName(pairedTemplate.name || toFieldName(pairedTemplate.label), [...acc, field]),
      required: pairedTemplate.required ?? false,
      placeholder: pairedTemplate.placeholder ?? "",
      helpText: pairedTemplate.helpText ?? "",
      options: pairedTemplate.options ?? [],
      width: pairedTemplate.width ?? defaultWidth(pairedTemplate.type),
    };
    return [...acc, field, pairedField];
  }, []);
}

/** Rehydrate fields loaded from the API (no builder-local ids yet) — same idea
 *  as useExperienceBuilder's hydrateBlocks. */
function hydrateFields(rawFields) {
  return upgradeLegacyFields(
    (rawFields || []).map((f) => ({
      ...f,
      id: nextId(),
      children: f.children?.map((c) => ({ ...c, id: nextId() })),
    }))
  );
}

/**
 * Forms saved before the Name block became a First + Last pair hold a single
 * "fullName" field. Split it into the pair on load; and a form that is still
 * exactly the old untouched default (Full Name + Email, nothing else) gets the
 * current default set instead. A Name the author deliberately folded back into
 * one field is marked pairRole "merged" (see removeField) and left alone.
 */
function upgradeLegacyFields(fields) {
  const isLegacyName = (f) => f.role === "submitterName" && f.name === "fullName" && !f.pairId && !f.pairRole;
  const legacyIndex = fields.findIndex(isLegacyName);
  if (legacyIndex === -1) return fields;

  const untouchedOldDefault =
    fields.length === 2 &&
    legacyIndex === 0 &&
    fields[0].label === "Full Name" &&
    fields[1].role === "submitterEmail" &&
    fields[1].label === "Email Address";
  if (untouchedOldDefault) return buildDefaultFields(DEFAULT_FORM_BLOCKS);

  const others = fields.filter((_, i) => i !== legacyIndex);
  const pair = buildDefaultFields(["fullName"]).map((f) => ({ ...f, name: uniqueName(f.name, others) }));
  const next = [...fields];
  next.splice(legacyIndex, 1, ...pair);
  return next;
}

export function useFormBuilder() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requiresPayment, setRequiresPayment] = useState(false);
  const [price, setPrice] = useState("");
  const [currency] = useState("INR");
  // A new form opens with Name and Email already on the canvas — they used to
  // be hardcoded into the renderer, invisible and uneditable. They are now
  // ordinary blocks the author can rename, resize, un-require or delete.
  const [fields, setFields] = useState(() => buildDefaultFields(DEFAULT_FORM_BLOCKS));
  const [selectedId, setSelectedId] = useState(null);

  /** Insert a brand-new field from catalogue block `blockKey`, optionally at a position. */
  const addField = useCallback((blockKey, index) => {
    setFields((prev) => {
      const field = createField(blockKey, prev);
      const at = index === undefined || index === null ? prev.length : index;
      const next = [...prev];

      // A block can drop as a pair (Name -> First Name + Last Name). Both
      // instances share a pairId so removeField can find its partner later.
      const pairedTemplate = blockByKey[blockKey]?.pairedField;
      if (pairedTemplate) {
        const pairId = nextId();
        field.pairId = pairId;
        const pairedField = {
          ...deepClone(pairedTemplate),
          id: nextId(),
          blockKey,
          pairId,
          name: uniqueName(pairedTemplate.name || toFieldName(pairedTemplate.label), [...prev, field]),
          required: pairedTemplate.required ?? false,
          placeholder: pairedTemplate.placeholder ?? "",
          helpText: pairedTemplate.helpText ?? "",
          options: pairedTemplate.options ?? [],
          width: pairedTemplate.width ?? defaultWidth(pairedTemplate.type),
        };
        next.splice(at, 0, field, pairedField);
      } else {
        next.splice(at, 0, field);
      }

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

  /** Edit one sub-field of a group block, e.g. relabelling "PIN Code". */
  const updateChild = useCallback((fieldId, childId, patch) => {
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId
          ? { ...f, children: f.children?.map((c) => (c.id === childId ? { ...c, ...patch } : c)) }
          : f
      )
    );
  }, []);

  const removeField = useCallback((id) => {
    setFields((prev) => {
      const removed = prev.find((f) => f.id === id);
      const next = prev.filter((f) => f.id !== id);

      // Deleting Last Name out of a Name pair leaves First Name asking half a
      // question — fold it back into the single "Full Name" field it started
      // as instead of stranding a lonely "First Name" input.
      if (removed?.pairId && removed.pairRole === "last") {
        const sibling = next.find((f) => f.pairId === removed.pairId && f.pairRole === "first");
        if (sibling) {
          const mergedLabel = sibling.mergedLabel || "Full Name";
          return next.map((f) =>
            f.id === sibling.id
              ? {
                  ...f,
                  label: mergedLabel,
                  placeholder: f.mergedPlaceholder ?? f.placeholder,
                  name: f.nameLockedByUser ? f.name : uniqueName(toFieldName(mergedLabel), next, f.id),
                  pairId: undefined,
                  // Not undefined: marks a deliberate fold so upgradeLegacyFields
                  // doesn't split it back into First + Last on the next load.
                  pairRole: "merged",
                }
              : f
          );
        }
      }

      return next;
    });
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const duplicateField = useCallback((id) => {
    setFields((prev) => {
      const index = prev.findIndex((f) => f.id === id);
      if (index === -1) return prev;

      const source = prev[index];
      const copy = {
        ...deepClone({ ...source, id: undefined }),
        id: nextId(),
        name: isDisplayOnly(source.type) ? "" : uniqueName(source.name, prev),
        children: source.children?.map((c) => ({ ...deepClone(c), id: nextId() })),
        // A duplicate is a standalone field, not the other half of the
        // original's Name pair — leaving pairId set would make removeField
        // match it against the wrong sibling.
        pairId: undefined,
        pairRole: undefined,
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

  /**
   * Non-blocking notes. Deleting the email block is allowed — it just costs the
   * submitter their confirmation email, and that's the author's call to make.
   */
  const warnings = useMemo(
    () => (fields.some((f) => f.role === "submitterEmail") ? [] : ["noSubmitterEmail"]),
    [fields]
  );

  /** Blocking problems, surfaced before the publish request is attempted. */
  const validationErrors = useMemo(() => {
    const errors = [];
    if (!title.trim()) errors.push("Give the form a title.");
    if (fields.length === 0) errors.push("Add at least one field.");
    if (requiresPayment && !(Number(price) > 0)) errors.push("A paid form needs a price above zero.");

    fields.forEach((f, i) => {
      const named = f.label?.trim() || `Field ${i + 1}`;

      if (!isDisplayOnly(f.type) && !f.label?.trim()) {
        errors.push(`Field ${i + 1} needs a label.`);
      }
      if (hasOptions(f.type) && !f.optionsFrom && f.options.filter((o) => o.trim()).length === 0) {
        errors.push(`"${named}" needs at least one choice.`);
      }
      if (isConsent(f.type) && !f.acknowledgementText?.trim()) {
        errors.push(`"${named}" needs the text the person is agreeing to.`);
      }
      if (isGroup(f.type) && !(f.children?.length > 0)) {
        errors.push(`"${named}" has no sub-fields left.`);
      }
      f.children?.forEach((c) => {
        if (!c.label?.trim()) errors.push(`A sub-field of "${named}" needs a label.`);
      });
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
        // Everything below is optional and simply absent on a plain block.
        role: f.role ?? null,
        validation: f.validation ?? null,
        optionsFrom: f.optionsFrom ?? null,
        behavior: f.behavior ?? null,
        allowOther: f.allowOther ?? false,
        otherLabel: f.otherLabel ?? null,
        bodyText: f.bodyText ?? null,
        acknowledgementText: f.acknowledgementText ?? null,
        pairId: f.pairId ?? null,
        pairRole: f.pairRole ?? null,
        children:
          f.children?.map((c) => ({
            name: c.name,
            label: c.label,
            type: c.type,
            required: c.required,
            placeholder: c.placeholder ?? "",
            helpText: c.helpText ?? "",
            options: c.options ?? [],
            width: c.width,
            role: c.role ?? null,
            validation: c.validation ?? null,
            optionsFrom: c.optionsFrom ?? null,
          })) ?? null,
      })),
    }),
    [title, description, requiresPayment, price, currency, fields]
  );

  const reset = useCallback(() => {
    setTitle("");
    setDescription("");
    setRequiresPayment(false);
    setPrice("");
    setFields(buildDefaultFields(DEFAULT_FORM_BLOCKS));
    setSelectedId(null);
  }, []);

  /** Load a form fetched from the API (e.g. one already linked to an
   *  Experience) into this builder's state, so it can be edited in place. */
  const loadExisting = useCallback((form) => {
    setTitle(form.title || "");
    setDescription(form.description || "");
    setRequiresPayment(Boolean(form.requiresPayment));
    setPrice(form.requiresPayment ? String(form.price) : "");
    setFields(hydrateFields(form.fields));
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
    addField, updateField, updateChild, removeField, duplicateField, moveField, nudgeField,
    previewForm,
    validationErrors,
    warnings,
    toCreateRequest,
    reset,
    loadExisting,
  };
}
