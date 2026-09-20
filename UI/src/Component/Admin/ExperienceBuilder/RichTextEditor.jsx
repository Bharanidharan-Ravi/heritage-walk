// src/Component/Admin/ExperienceBuilder/RichTextEditor.jsx
//
// On-canvas rich-text editor for the two description blocks (shape:
// "richHtml" — see Config/experienceBuilder.config.jsx). Formatting lives
// directly on the canvas next to the text it's shaping, not in the sidebar
// (ExperienceBlockSettings) — the sidebar only shows this block's Label field
// for a richHtml block, same reasoning as the title's inline editor
// (ExperienceCanvas's EditableTitle): what you see here IS what the visitor
// sees, so editing happens in place.
//
// Storage: `value` is a sanitized-on-render HTML string (the block's real
// admin-authored content — same trust level as a hero image URL or video
// link elsewhere in this builder, never public/visitor input, so rendering
// it via dangerouslySetInnerHTML on the public page — ExperiencePageView.jsx
// — is consistent with the rest of this admin-authored content). Line height
// is stored as its own `lineHeight` field on the block (a paragraph-level
// property, not something that reads as "selected text only") rather than
// folded into the HTML.
//
// Formatting model:
//   - Bold/Italic/Underline use the browser's native execCommand toggle,
//     which already keeps "typing continues in this style" behavior for a
//     collapsed caret for free — no custom engine needed for that specific
//     case.
//   - Font family/size/weight are BOTH per-selection AND whole-block:
//       - text actually highlighted -> wraps just that selection in a
//         styled <span>, embedded in the saved HTML (`value`).
//       - nothing highlighted (bare caret) -> treated as "set this block's
//         default", exactly like `lineHeight` below: stored as its own
//         field on the block (fontFamily/fontSize/fontWeight) and applied
//         as an inline style on the block's own container. Being a real
//         persisted field (not a live-DOM-only style or a zero-width-space
//         hack) is what makes it survive save/reload and show up in the
//         public-page preview, and typing-ahead falls out for free since
//         these are inherited CSS properties — new text under that
//         container just inherits it.

import React, { useLayoutEffect, useRef, useState } from "react";

const FONT_FAMILIES = [
  { label: "Default font", value: "" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Classic serif", value: "'Times New Roman', Times, serif" },
  { label: "Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Modern sans", value: "'Segoe UI', Tahoma, sans-serif" },
  { label: "Rounded", value: "Verdana, Geneva, sans-serif" },
  { label: "Typewriter", value: "'Courier New', Courier, monospace" },
];

const FONT_SIZES = [
  { label: "Default size", value: "" },
  { label: "14", value: "14px" },
  { label: "16", value: "16px" },
  { label: "18", value: "18px" },
  { label: "20", value: "20px" },
  { label: "24", value: "24px" },
  { label: "28", value: "28px" },
  { label: "32", value: "32px" },
];

const FONT_WEIGHTS = [
  { label: "Default weight", value: "" },
  { label: "Light", value: "300" },
  { label: "Normal", value: "400" },
  { label: "Medium", value: "500" },
  { label: "Semibold", value: "600" },
  { label: "Bold", value: "700" },
  { label: "Extrabold", value: "800" },
];

const LINE_HEIGHTS = [
  { label: "Tight", value: "1.2" },
  { label: "Normal", value: "1.5" },
  { label: "Relaxed", value: "1.75" },
  { label: "Loose", value: "2" },
];

const EMOJIS = [
  "😀", "😃", "😄", "😊", "😉", "😍", "🥳", "😎", "🤔", "👍",
  "👏", "🙌", "🙏", "💪", "✨", "🎉", "🔥", "⭐", "❤️", "💚",
  "🏛️", "🕌", "🗿", "🏞️", "🌄", "🚶", "🥾", "🧭", "📍", "📸",
  "☕", "🍽️", "🌿", "🌞", "☀️", "🌧️", "⏰", "📅", "✅", "❗",
];

export default function RichTextEditor({
  value,
  onChange,
  selected,
  onSelect,
  placeholder,
  lineHeight,
  onLineHeightChange,
  fontFamily,
  onFontFamilyChange,
  fontSize,
  onFontSizeChange,
  fontWeight,
  onFontWeightChange,
  className = "",
  style,
  theme,
  minHeight = "3rem",
}) {
  const editableRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Same "only write when it actually changed from OUTSIDE" trick as
  // ExperienceCanvas's EditableTitle — a controlled contentEditable that
  // re-writes its own innerHTML on every keystroke resets the caret.
  useLayoutEffect(() => {
    if (editableRef.current && editableRef.current.innerHTML !== (value || "")) {
      editableRef.current.innerHTML = value || "";
    }
  }, [value]);

  const isEmpty = !value || value.replace(/<[^>]*>/g, "").replace(/\u200B/g, "").trim() === "";

  const handleInput = () => {
    onChange(editableRef.current.innerHTML);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editableRef.current?.contains(sel.anchorNode)) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  const restoreSelection = () => {
    if (!savedRangeRef.current) return;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRangeRef.current);
  };

  const focusEditor = () => {
    editableRef.current?.focus();
    restoreSelection();
  };

  const runCommand = (cmd) => {
    focusEditor();
    document.execCommand(cmd, false, null);
    handleInput();
    saveSelection();
  };

  // Font family/size/weight: a real highlighted selection wraps just that
  // text in a styled span (embedded in the saved HTML). A bare caret (no
  // highlight) means "set this block's default" — persisted as its own
  // field on the block (fontFamily/fontSize/fontWeight props), same as
  // lineHeight already works, rather than a live-DOM-only style that never
  // survives save/reload.
  const applyInlineStyle = (cssProp, cssValue, onBlockDefaultChange) => {
    focusEditor();
    const sel = window.getSelection();
    const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
    const hasRealSelection = range && !range.collapsed && editableRef.current.contains(range.commonAncestorContainer);

    if (hasRealSelection) {
      if (!cssValue) return;
      const span = document.createElement("span");
      span.style[cssProp] = cssValue;
      span.appendChild(range.extractContents());
      range.insertNode(span);

      const after = document.createRange();
      after.selectNodeContents(span);
      sel.removeAllRanges();
      sel.addRange(after);
      savedRangeRef.current = after.cloneRange();
      handleInput();
    } else {
      onBlockDefaultChange(cssValue);
    }
  };

  const insertEmoji = (emoji) => {
    focusEditor();
    document.execCommand("insertText", false, emoji);
    handleInput();
    saveSelection();
    setEmojiOpen(false);
  };

  return (
    <div className="relative">
      {selected && (
        <div
          className="mb-2 flex flex-wrap items-center gap-1.5 rounded-2xl border p-2.5 shadow-sm"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
        >
          <ToolbarButton label="Bold" onMouseDown={() => runCommand("bold")} theme={theme}>
            <span className="font-bold">B</span>
          </ToolbarButton>
          <ToolbarButton label="Italic" onMouseDown={() => runCommand("italic")} theme={theme}>
            <span className="italic">I</span>
          </ToolbarButton>
          <ToolbarButton label="Underline" onMouseDown={() => runCommand("underline")} theme={theme}>
            <span className="underline">U</span>
          </ToolbarButton>

          <Divider theme={theme} />

          <ToolbarSelect
            label="Font"
            options={FONT_FAMILIES}
            value={fontFamily}
            theme={theme}
            onMouseDown={saveSelection}
            onChange={(v) => applyInlineStyle("fontFamily", v, onFontFamilyChange)}
          />
          <ToolbarSelect
            label="Size"
            options={FONT_SIZES}
            value={fontSize}
            theme={theme}
            onMouseDown={saveSelection}
            onChange={(v) => applyInlineStyle("fontSize", v, onFontSizeChange)}
          />
          <ToolbarSelect
            label="Weight"
            options={FONT_WEIGHTS}
            value={fontWeight}
            theme={theme}
            onMouseDown={saveSelection}
            onChange={(v) => applyInlineStyle("fontWeight", v, onFontWeightChange)}
          />

          <Divider theme={theme} />

          <ToolbarSelect
            label="Line height"
            options={LINE_HEIGHTS}
            value={lineHeight}
            theme={theme}
            onMouseDown={saveSelection}
            onChange={(v) => onLineHeightChange(v)}
          />

          <Divider theme={theme} />

          <div className="relative">
            <ToolbarButton
              label="Insert emoji"
              onMouseDown={() => setEmojiOpen((o) => !o)}
              theme={theme}
            >
              🙂
            </ToolbarButton>
            {emojiOpen && (
              <div
                className="absolute z-20 top-full left-0 mt-1 grid grid-cols-8 gap-1 rounded-xl border p-2 shadow-lg w-64"
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
              >
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      insertEmoji(e);
                    }}
                    className="text-lg leading-none p-1 rounded hover:opacity-70"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative">
        {isEmpty && placeholder && (
          <span className="absolute top-3 left-4 right-4 pointer-events-none select-none" style={{ color: theme.mutedColor }}>
            {placeholder}
          </span>
        )}
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          onFocus={onSelect}
          onInput={handleInput}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onBlur={() => setEmojiOpen(false)}
          className={`outline-none cursor-text whitespace-pre-wrap block w-full px-4 py-3 rounded-2xl transition-shadow ${className}`}
          style={{
            lineHeight: lineHeight || undefined,
            fontFamily: fontFamily || undefined,
            fontSize: fontSize || undefined,
            fontWeight: fontWeight || undefined,
            minHeight,
            boxShadow: selected ? `0 0 0 2px ${theme.accentColor}` : `0 0 0 1px ${theme.borderColor}`,
            ...style,
          }}
        />
      </div>
    </div>
  );
}

function ToolbarButton({ label, onMouseDown, theme, children }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      className="w-7 h-7 grid place-items-center rounded-md text-sm hover:opacity-80 transition-opacity"
      style={{ color: theme.textColor, backgroundColor: "transparent" }}
    >
      {children}
    </button>
  );
}

function ToolbarSelect({ label, options, value, onChange, onMouseDown, theme }) {
  return (
    <select
      title={label}
      aria-label={label}
      value={value ?? ""}
      onMouseDown={onMouseDown}
      onChange={(e) => {
        e.stopPropagation();
        onChange(e.target.value);
        e.target.blur();
      }}
      className="text-xs rounded-md px-1.5 py-1 border outline-none cursor-pointer"
      style={{ color: theme.textColor, backgroundColor: theme.pageBackground, borderColor: theme.borderColor }}
    >
      {options.map((o) => (
        <option key={o.label} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Divider({ theme }) {
  return <span className="w-px h-5 mx-0.5" style={{ backgroundColor: theme.borderColor }} />;
}
