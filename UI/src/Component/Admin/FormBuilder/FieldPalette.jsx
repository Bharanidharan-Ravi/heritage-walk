// src/Component/Admin/FormBuilder/FieldPalette.jsx
//
// Left rail of the builder. Each block can be clicked (appends to the end) or
// dragged onto the canvas at a specific slot — the same gesture Google Forms /
// Zoho Forms users expect.

import React from "react";
import { formBuilderConfig } from "../../Config/formBuilder.config";
import { adminUi } from "../../Config/adminUi.config";

export default function FieldPalette({ onAdd, onDragStartNew, onDragEnd }) {
  const { theme } = formBuilderConfig;
  const { text } = adminUi;

  return (
    <aside
      className={`rounded-lg border ${adminUi.pad.panel} h-fit lg:sticky lg:top-4`}
      style={{ backgroundColor: theme.panelBackground, borderColor: theme.borderColor }}
    >
      <p className={`${text.micro} mb-2`} style={{ color: theme.mutedColor }}>
        Blocks
      </p>

      <div className="space-y-2.5">
        {formBuilderConfig.fieldGroups.map((group) => (
          <div key={group.group}>
            <p className={`${text.micro} font-normal mb-1`} style={{ color: theme.mutedColor }}>
              {group.group}
            </p>
            <div className="space-y-1">
              {group.types.map((t) => (
                // A div rather than a <button>: Firefox won't reliably start a
                // native drag from a button element.
                <div
                  key={t.type}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(e) => {
                    // Firefox refuses to begin a drag unless some data is set.
                    e.dataTransfer.setData("text/plain", t.type);
                    e.dataTransfer.effectAllowed = "copy";
                    onDragStartNew(t.type);
                  }}
                  onDragEnd={onDragEnd}
                  onClick={() => onAdd(t.type)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onAdd(t.type);
                    }
                  }}
                  title={`Add ${t.label} — or drag it onto the canvas`}
                  className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-md border text-left ${text.body}
                             cursor-grab active:cursor-grabbing transition-colors hover:border-[rgba(193,157,96,0.55)]`}
                  style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
                >
                  <span
                    className="w-4 h-4 shrink-0 rounded grid place-items-center text-[10px] font-bold"
                    style={{ backgroundColor: "rgba(193,157,96,0.12)", color: theme.accentColor }}
                  >
                    {t.icon}
                  </span>
                  {t.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
