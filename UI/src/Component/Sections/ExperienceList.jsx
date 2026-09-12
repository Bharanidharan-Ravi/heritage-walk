// src/Component/Sections/ExperienceList.jsx
//
// Public "selection" page: cards for every Published Walk/Seminar/Course,
// each linking to its ExperienceDetail.jsx page. Separate from the existing
// Walk.jsx (which lists the older, Sanity-only "walk" documents) — this one
// lists experiences built with the new Experience Builder
// (AdminExperienceBuilder.jsx) via the public /api/experiences/public API.

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { experiencePublicConfig } from "../Config/experiencePublic.config";
import { EXPERIENCE_TYPES } from "../Config/experienceBuilder.config";

const API_BASE = import.meta.env.VITE_API_URL;

export default function ExperienceList() {
  const { theme, content } = experiencePublicConfig;
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    window.scrollTo(0, 0);
    let cancelled = false;

    async function load() {
      setStatus("loading");
      try {
        const res = await fetch(`${API_BASE}/api/experiences/public?pageSize=100`);
        if (cancelled) return;
        if (!res.ok) { setStatus("error"); return; }
        const data = await res.json();
        setItems(data.items || []);
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const visible = typeFilter === "all" ? items : items.filter((e) => e.type?.toLowerCase() === typeFilter);

  return (
    <section className="pt-32 pb-24 min-h-screen" style={{ backgroundColor: theme.pageBackground, color: theme.textColor }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <h1 className="text-4xl md:text-5xl font-serif font-medium mb-3">{content.listTitle}</h1>
        <p className="text-lg mb-10" style={{ color: theme.mutedColor }}>{content.listSubtitle}</p>

        <div className="flex flex-wrap gap-2 mb-10">
          <FilterChip label={content.filterAllLabel} active={typeFilter === "all"} onClick={() => setTypeFilter("all")} theme={theme} />
          {EXPERIENCE_TYPES.map((t) => (
            <FilterChip key={t.type} label={t.label} active={typeFilter === t.type} onClick={() => setTypeFilter(t.type)} theme={theme} />
          ))}
        </div>

        {status === "loading" && <p style={{ color: theme.mutedColor }}>{content.loadingMessage}</p>}
        {status === "error" && <p style={{ color: theme.dangerColor }}>{content.genericErrorMessage}</p>}
        {status === "ready" && visible.length === 0 && <p style={{ color: theme.mutedColor }}>{content.listEmptyMessage}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {visible.map((e) => <ExperienceCard key={e.id} experience={e} theme={theme} content={content} />)}
        </div>
      </div>
    </section>
  );
}

function ExperienceCard({ experience, theme, content }) {
  const hero = experience.contentBlocks?.find((b) => b.blockKey === "heroImage");
  const summary = experience.contentBlocks?.find((b) => b.blockKey === "shortDescription");

  return (
    <Link
      to={`/experiences/${experience.id}`}
      className="group rounded-2xl overflow-hidden border shadow-lg hover:-translate-y-1 transition-all block"
      style={{ backgroundColor: theme.cardBackground, borderColor: theme.borderColor }}
    >
      <div className="h-52 overflow-hidden" style={{ backgroundColor: theme.borderColor }}>
        {hero?.value && (
          <img src={hero.value} alt={experience.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
      </div>
      <div className="p-6">
        <p className="uppercase tracking-widest text-xs font-bold mb-2" style={{ color: theme.accentColor }}>
          {content.typeLabels[experience.type?.toLowerCase()] || experience.type}
        </p>
        <h3 className="text-xl font-serif font-medium mb-2">{experience.title}</h3>
        {summary?.value && <p className="text-sm mb-4 line-clamp-2" style={{ color: theme.mutedColor }}>{summary.value}</p>}
        <div className="flex items-center justify-between">
          <span className="font-bold">
            {experience.requiresPayment ? `${experience.currency} ${experience.price}` : content.freeLabel}
          </span>
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: theme.accentColor }}>
            {content.viewDetailsLabel} →
          </span>
        </div>
      </div>
    </Link>
  );
}

function FilterChip({ label, active, onClick, theme }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-colors"
      style={active
        ? { backgroundColor: theme.accentColor, borderColor: theme.accentColor, color: theme.pageBackground }
        : { backgroundColor: "transparent", borderColor: theme.borderColor, color: theme.mutedColor }}
    >
      {label}
    </button>
  );
}
