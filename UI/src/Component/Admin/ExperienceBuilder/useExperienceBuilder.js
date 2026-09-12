// src/Component/Admin/ExperienceBuilder/useExperienceBuilder.js
//
// All the state the Experience Builder needs — the content-block counterpart
// to Admin/FormBuilder/useFormBuilder.js. Deliberately a SEPARATE file/hook
// (per the Experiences module plan): it shares the same drag/drop/reorder/
// duplicate/width mechanics conceptually, but owns its own state and never
// imports from FormBuilder/, so the Form Generator is untouched by anything
// here.
//
// A block instance is:
//   { id, blockKey, shape, label, width, value } — single-value blocks
//   { id, blockKey, shape, label, width, items } — repeatable/gallery/modules
//
// `id` is builder-local (React key + drag identity), stripped before saving.
// Blocks are created by CLONING a catalogue entry (experienceBuilder.config),
// so editing a dropped block never reaches back into the catalogue.

import { useCallback, useMemo, useState } from "react";
import {
  getBlockByKey,
  isItemsBased,
  DEFAULT_EXPERIENCE_BLOCKS,
} from "../../Config/experienceBuilder.config";

let idCounter = 0;
const nextId = () => `b${Date.now().toString(36)}${(idCounter++).toString(36)}`;

/** Build a block instance from a catalogue key. */
export function createBlock(experienceType, blockKey) {
  const template = getBlockByKey(experienceType)[blockKey];
  if (!template) return null;

  const base = {
    id: nextId(),
    blockKey,
    shape: template.shape,
    label: template.label,
    width: template.width ?? 12,
    options: template.options,
  };

  return isItemsBased(template.shape) ? { ...base, items: [] } : { ...base, value: template.shape === "toggle" ? false : "" };
}

/** Rehydrate blocks loaded from the API (no builder-local ids yet). */
export function hydrateBlocks(rawBlocks) {
  return (rawBlocks || []).map((b) => ({ ...b, id: nextId() }));
}

export function useExperienceBuilder(experienceType) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bookingEndDate, setBookingEndDate] = useState("");
  const [blocks, setBlocks] = useState(() =>
    DEFAULT_EXPERIENCE_BLOCKS.map((key) => createBlock(experienceType, key)).filter(Boolean)
  );
  const [selectedId, setSelectedId] = useState(null);

  // `valuePatch` lets a caller create-and-fill in one step — e.g. the canvas's
  // hero-image drop target, which uploads a file and adds the hero block with
  // its value already set, instead of adding an empty block and patching it
  // in a second, separately-batched update.
  const addBlock = useCallback((blockKey, index, valuePatch) => {
    setBlocks((prev) => {
      const block = createBlock(experienceType, blockKey);
      if (!block) return prev;
      const withPatch = valuePatch ? { ...block, ...valuePatch } : block;
      const at = index === undefined || index === null ? prev.length : index;
      const next = [...prev];
      next.splice(at, 0, withPatch);
      setSelectedId(withPatch.id);
      return next;
    });
  }, [experienceType]);

  const updateBlock = useCallback((id, patch) => {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  }, []);

  const removeBlock = useCallback((id) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const duplicateBlock = useCallback((id) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      if (index === -1) return prev;
      const copy = { ...JSON.parse(JSON.stringify(prev[index])), id: nextId() };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      setSelectedId(copy.id);
      return next;
    });
  }, []);

  const moveBlock = useCallback((from, to) => {
    setBlocks((prev) => {
      if (from < 0 || from >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      const target = Math.max(0, Math.min(next.length, to > from ? to - 1 : to));
      next.splice(target, 0, moved);
      return next;
    });
  }, []);

  const nudgeBlock = useCallback((id, delta) => {
    setBlocks((prev) => {
      const index = prev.findIndex((b) => b.id === id);
      const target = index + delta;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const selectedBlock = useMemo(
    () => blocks.find((b) => b.id === selectedId) || null,
    [blocks, selectedId]
  );

  const validationErrors = useMemo(() => {
    const errors = [];
    if (!title.trim()) errors.push("Give the experience a title.");
    if (blocks.length === 0) errors.push("Add at least one content block.");
    return errors;
  }, [title, blocks]);

  const toSaveRequest = useCallback(
    () => ({
      title: title.trim(),
      // Builder-local `id` is drag/React-key bookkeeping only — strip it
      // without an unused destructured binding (project lint disallows those).
      contentBlocks: blocks.map((b) => Object.fromEntries(Object.entries(b).filter(([k]) => k !== "id"))),
      startDate: startDate || null,
      endDate: endDate || null,
      bookingEndDate: bookingEndDate || null,
    }),
    [title, blocks, startDate, endDate, bookingEndDate]
  );

  /** Load an existing experience (edit mode) into the builder's state. */
  const loadExisting = useCallback((detail) => {
    setTitle(detail.title || "");
    setStartDate(detail.startDate ? detail.startDate.slice(0, 10) : "");
    setEndDate(detail.endDate ? detail.endDate.slice(0, 10) : "");
    setBookingEndDate(detail.bookingEndDate ? detail.bookingEndDate.slice(0, 10) : "");
    setBlocks(hydrateBlocks(detail.contentBlocks));
    setSelectedId(null);
  }, []);

  return {
    title, setTitle,
    startDate, setStartDate,
    endDate, setEndDate,
    bookingEndDate, setBookingEndDate,
    blocks,
    selectedId, setSelectedId,
    selectedBlock,
    addBlock, updateBlock, removeBlock, duplicateBlock, moveBlock, nudgeBlock,
    validationErrors,
    toSaveRequest,
    loadExisting,
  };
}
