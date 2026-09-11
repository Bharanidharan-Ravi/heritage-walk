// src/Component/Admin/CreateExperienceModal.jsx
//
// "Create Experience" popup shown from the + NEW EXPERIENCE button on the
// Experiences management page. One primary button, one compact type picker —
// replaces the earlier EventTypeModal.jsx stub (Walk/Seminar only, no real
// builder behind it) now that the real Experience Builder exists.

import { useNavigate } from "react-router-dom";
import { adminConfig } from "../Config/admin.config";
import { adminUi } from "../Config/adminUi.config";
import { EXPERIENCE_TYPES } from "../Config/experienceBuilder.config";
import FieldIcon from "../Config/fieldIcons";

export default function CreateExperienceModal({ onClose }) {
  const navigate = useNavigate();
  const { theme } = adminConfig;
  const { text } = adminUi;

  const choose = (type) => {
    onClose();
    navigate(`/admin/experiences/new/${type}`);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border p-4"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
      >
        <h2 className={`${text.subheader} mb-1`}>Create Experience</h2>
        <p className={`${text.body} opacity-60 mb-3`}>Choose a type to start building.</p>

        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE_TYPES.map(({ type, label, description, icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => choose(type)}
              className="flex flex-col items-center gap-1.5 rounded-md border p-3 text-center hover:opacity-90 transition-opacity"
              style={{ borderColor: theme.borderColor }}
            >
              <span style={{ color: theme.accentColor }}>
                <FieldIcon name={icon} className="w-6 h-6" />
              </span>
              <span className={text.bodyHeader}>{label}</span>
              <span className={`${text.body} opacity-60`}>{description}</span>
            </button>
          ))}
        </div>

        <button type="button" onClick={onClose} className={`${adminUi.control.btnLink} mt-3`} style={{ color: theme.textColor, opacity: 0.6 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
